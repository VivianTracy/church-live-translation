/**
 * Verifies Live API sermon context does not dump the manuscript on connect.
 *
 * Usage:
 *   node scripts/test-sermon-context-live.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { GoogleGenAI, Modality } from "@google/genai";

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    return;
  }

  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator);
    const value = trimmed.slice(separator + 1);
    process.env[key] ??= value;
  }
}

loadEnvLocal();

const COMPACT_PROMPT = fs
  .readFileSync(path.join(process.cwd(), "lib/translationPromptLive.ts"), "utf8")
  .match(/export const LIVE_SERMON_PROMPT_COMPACT = `([\s\S]*?)`;/)?.[1]
  ?.trim();

const LIVE_MODEL = fs
  .readFileSync(path.join(process.cwd(), "lib/translationPromptLive.ts"), "utf8")
  .match(/export const LIVE_CAPTION_MODEL = "([^"]+)";/)?.[1];

const SAMPLE_MANUSCRIPT = `
今天我们要查考以弗所书第二章第八节到第九节。
恩典是神白白的赐给，不是出于行为，免得有人自夸。
我们也因信被称义，在基督里成为神的工作。
这段经文提醒我们，救恩完全出于神的怜悯。
`.trim();

const SPOKEN_UTTERANCE = "今天我们来看以弗所书二章八节。";

const REFERENCE_RULES = `
A Chinese sermon manuscript may be provided separately as reference only.
Never translate, quote, or output manuscript text unless the speaker's live utterance clearly includes it.
Messages marked SETUP or REFERENCE ONLY must never be translated or output.
Wait for live spoken Chinese marked LIVE SPOKEN CHINESE before producing any English caption.
`.trim();

function buildSetupMessage(sermonText) {
  return `[SETUP — REFERENCE ONLY — DO NOT TRANSLATE OR OUTPUT]

This message is not live speech. Reply with exactly: OK

Use the manuscript below only for terminology, names, and scripture consistency when later live Chinese is spoken.

--- Sermon manuscript ---

${sermonText}

--- End sermon manuscript ---`;
}

function buildLiveUtterance(chinese) {
  return `[LIVE SPOKEN CHINESE — TRANSLATE THIS ONLY]

${chinese}`;
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  assert(process.env.GEMINI_API_KEY, "GEMINI_API_KEY is missing from .env.local");
  assert(COMPACT_PROMPT, "Could not read LIVE_SERMON_PROMPT_COMPACT");
  assert(LIVE_MODEL, "Could not read LIVE_CAPTION_MODEL");

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: { apiVersion: "v1alpha" },
  });

  console.log("Testing fixed Live API sermon context flow\n");

  let acceptCaptions = false;
  let finalText = "";

  const session = await ai.live.connect({
    model: LIVE_MODEL,
    config: {
      responseModalities: [Modality.TEXT],
      systemInstruction: `${COMPACT_PROMPT}

${REFERENCE_RULES}`,
      temperature: 0,
      maxOutputTokens: 300,
      thinkingConfig: { thinkingBudget: 0 },
    },
    callbacks: {
      onopen: () => {},
      onmessage: (message) => {
        if (!acceptCaptions) {
          return;
        }

        const text = (message.serverContent?.modelTurn?.parts ?? [])
          .map((part) => part.text ?? "")
          .join("")
          .trim();

        if (text) {
          finalText = text;
        }
      },
      onerror: (event) => {
        throw new Error(event.message || "Live API error");
      },
      onclose: () => {},
    },
  });

  session.sendClientContent({
    turns: [{ role: "user", parts: [{ text: buildSetupMessage(SAMPLE_MANUSCRIPT) }] }],
    turnComplete: true,
  });

  await new Promise((resolve) => setTimeout(resolve, 1500));

  acceptCaptions = true;
  session.sendClientContent({
    turns: [{ role: "user", parts: [{ text: buildLiveUtterance(SPOKEN_UTTERANCE) }] }],
    turnComplete: true,
  });

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Fixed live path timed out after 20s"));
    }, 20000);

    const priorOnMessage = session.callbacks.onmessage;

    session.callbacks.onmessage = (message) => {
      priorOnMessage?.(message);

      if (acceptCaptions && message.serverContent?.turnComplete && finalText) {
        clearTimeout(timeout);
        session.close();
        resolve(undefined);
      }
    };
  });

  console.log("Live utterance output:", finalText);

  assert(
    finalText.length < SAMPLE_MANUSCRIPT.length / 2,
    `Live path still looks like a manuscript dump (${finalText.length} chars)`
  );
  assert(
    finalText.length < 300,
    `Live path caption too long (${finalText.length} chars)`
  );
  assert(
    !finalText.includes("免得有人自夸"),
    "Live path quoted later manuscript content that was not spoken"
  );

  console.log("\nPASS: Live API waits for spoken utterance and does not dump manuscript.");
}

main().catch((error) => {
  console.error("\nFAIL:", error.message);
  process.exit(1);
});
