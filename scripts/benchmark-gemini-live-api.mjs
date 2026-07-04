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

const SAMPLE_SENTENCES = [
  "今天我们来看约翰福音三章十五节。",
  "恩典不是靠行为得来的。",
  "鼓励大家每天灵修。",
];

const FULL_PROMPT = fs
  .readFileSync(path.join(process.cwd(), "lib/translationPrompt.ts"), "utf8")
  .match(/export const LIVE_SERMON_PROMPT = `([\s\S]*?)`;/)?.[1];

const COMPACT_PROMPT = fs
  .readFileSync(path.join(process.cwd(), "lib/translationPromptLive.ts"), "utf8")
  .match(/export const LIVE_SERMON_PROMPT_COMPACT = `([\s\S]*?)`;/)?.[1];

async function benchmarkRest(ai, sentence) {
  const startedAt = Date.now();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: sentence,
    config: {
      systemInstruction: FULL_PROMPT,
      temperature: 0,
      maxOutputTokens: 300,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  return {
    mode: "REST generateContent",
    ms: Date.now() - startedAt,
    text: response.text?.trim() ?? "",
  };
}

async function benchmarkRestStream(ai, sentence) {
  const startedAt = Date.now();
  let firstTokenMs = null;
  let text = "";

  const stream = await ai.models.generateContentStream({
    model: "gemini-2.5-flash",
    contents: sentence,
    config: {
      systemInstruction: FULL_PROMPT,
      temperature: 0,
      maxOutputTokens: 300,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  for await (const chunk of stream) {
    const chunkText = chunk.text ?? "";
    if (chunkText && firstTokenMs === null) {
      firstTokenMs = Date.now() - startedAt;
    }
    text += chunkText;
  }

  return {
    mode: "REST generateContentStream",
    firstTokenMs,
    totalMs: Date.now() - startedAt,
    text: text.trim(),
  };
}

async function benchmarkLive(ai, sentence) {
  const startedAt = Date.now();
  let firstTokenMs = null;
  let finalText = "";

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Live API timed out after 20s"));
    }, 20000);

    let session;

    ai.live
      .connect({
        model: "gemini-live-2.5-flash-preview",
        config: {
          responseModalities: [Modality.TEXT],
          systemInstruction: COMPACT_PROMPT,
          temperature: 0,
          maxOutputTokens: 300,
          thinkingConfig: { thinkingBudget: 0 },
        },
        callbacks: {
          onopen: () => {
            session.sendClientContent({
              turns: [{ role: "user", parts: [{ text: sentence }] }],
              turnComplete: true,
            });
          },
          onmessage: (message) => {
            const parts = message.serverContent?.modelTurn?.parts ?? [];
            const text = parts
              .map((part) => part.text ?? "")
              .join("")
              .trim();

            if (text) {
              if (firstTokenMs === null) {
                firstTokenMs = Date.now() - startedAt;
              }
              finalText = text;
            }

            if (message.serverContent?.turnComplete) {
              clearTimeout(timeout);
              session.close();
              resolve(undefined);
            }
          },
          onerror: (event) => {
            clearTimeout(timeout);
            reject(new Error(event.message || "Live API error"));
          },
          onclose: () => {},
        },
      })
      .then((connectedSession) => {
        session = connectedSession;
      })
      .catch((error) => {
        clearTimeout(timeout);
        reject(error);
      });
  });

  return {
    mode: "Live API (TEXT session)",
    firstTokenMs,
    totalMs: Date.now() - startedAt,
    text: finalText,
  };
}

async function main() {
  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY missing from .env.local");
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  console.log("Benchmarking translation latency for sample sermon sentences\n");

  for (const sentence of SAMPLE_SENTENCES) {
    console.log(`Chinese: ${sentence}`);

    try {
      const rest = await benchmarkRest(ai, sentence);
      console.log(`  ${rest.mode}: ${rest.ms}ms -> ${rest.text}`);
    } catch (error) {
      console.log(`  REST generateContent: ERROR ${error.message?.slice(0, 120)}`);
    }

    try {
      const stream = await benchmarkRestStream(ai, sentence);
      console.log(
        `  ${stream.mode}: first=${stream.firstTokenMs}ms total=${stream.totalMs}ms -> ${stream.text}`
      );
    } catch (error) {
      console.log(
        `  REST generateContentStream: ERROR ${error.message?.slice(0, 120)}`
      );
    }

    try {
      const live = await benchmarkLive(ai, sentence);
      console.log(
        `  ${live.mode}: first=${live.firstTokenMs}ms total=${live.totalMs}ms -> ${live.text}`
      );
    } catch (error) {
      console.log(`  Live API: ERROR ${error.message?.slice(0, 120)}`);
    }

    console.log("");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
