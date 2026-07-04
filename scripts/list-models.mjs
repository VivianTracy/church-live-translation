import fs from "node:fs";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";

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

function stripModelPrefix(name) {
  return name.replace(/^models\//, "");
}

function formatModel(model) {
  const id = stripModelPrefix(model.name ?? "");
  const actions = (model.supportedActions ?? []).join(", ") || "none";

  return [
    id,
    model.displayName ? `  display: ${model.displayName}` : null,
    model.description ? `  about: ${model.description}` : null,
    `  actions: ${actions}`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function main() {
  loadEnvLocal();

  if (!process.env.GEMINI_API_KEY) {
    console.error("GEMINI_API_KEY is missing. Add it to .env.local and retry.");
    process.exit(1);
  }

  const liveOnly = process.argv.includes("--live");
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const pager = await ai.models.list();

  const allModels = [];
  const liveModels = [];

  for await (const model of pager) {
    allModels.push(model);

    if ((model.supportedActions ?? []).includes("bidiGenerateContent")) {
      liveModels.push(model);
    }
  }

  allModels.sort((a, b) =>
    stripModelPrefix(a.name ?? "").localeCompare(stripModelPrefix(b.name ?? ""))
  );
  liveModels.sort((a, b) =>
    stripModelPrefix(a.name ?? "").localeCompare(stripModelPrefix(b.name ?? ""))
  );

  console.log(`Found ${allModels.length} models for this API key.\n`);

  if (liveModels.length > 0) {
    console.log("Live API models (supportedActions includes bidiGenerateContent):\n");

    for (const model of liveModels) {
      console.log(formatModel(model));
      console.log("");
    }
  } else {
    console.log("No Live API models found for this API key.\n");
  }

  if (liveOnly) {
    return;
  }

  console.log("All models:\n");

  for (const model of allModels) {
    console.log(formatModel(model));
    console.log("");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
