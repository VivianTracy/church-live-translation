/**
 * Verifies sermon context improves translation without dumping the manuscript.
 *
 * Usage (with dev server running):
 *   node scripts/test-sermon-context.mjs
 */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";

const SAMPLE_MANUSCRIPT = `
今天我们要查考以弗所书第二章第八节到第九节。
恩典是神白白的赐给，不是出于行为，免得有人自夸。
我们也因信被称义，在基督里成为神的工作。
这段经文提醒我们，救恩完全出于神的怜悯。
`.trim();

const SPOKEN_UTTERANCE = "今天我们来看以弗所书二章八节。";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function request(path, init) {
  const response = await fetch(`${BASE_URL}${path}`, init);
  const text = await response.text();
  let data;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  return { response, data };
}

async function main() {
  console.log(`Testing sermon context against ${BASE_URL}\n`);

  const health = await request("/api/health");
  assert(health.response.ok, "Health check failed. Is the dev server running?");

  await request("/api/service-context", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sermonText: SAMPLE_MANUSCRIPT }),
  });

  const loaded = await request("/api/service-context");
  assert(loaded.response.ok, "Failed to load saved service context");
  assert(
    loaded.data.sermonText === SAMPLE_MANUSCRIPT,
    "Saved sermon context did not round-trip correctly"
  );

  const withoutContext = await request("/api/service-context", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sermonText: "" }),
  });
  assert(withoutContext.response.ok, "Failed to clear service context");

  const baseline = await request("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: SPOKEN_UTTERANCE }),
  });
  assert(baseline.response.ok, `Baseline translate failed: ${JSON.stringify(baseline.data)}`);

  await request("/api/service-context", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sermonText: SAMPLE_MANUSCRIPT }),
  });

  const withContext = await request("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: SPOKEN_UTTERANCE }),
  });
  assert(
    withContext.response.ok,
    `Context translate failed: ${JSON.stringify(withContext.data)}`
  );

  const baselineTranslation = baseline.data.translation.trim();
  const contextTranslation = withContext.data.translation.trim();

  console.log("Baseline translation:", baselineTranslation);
  console.log("With-context translation:", contextTranslation);

  assert(
    contextTranslation.length < SAMPLE_MANUSCRIPT.length / 2,
    `Translation looks like manuscript dump (${contextTranslation.length} chars)`
  );
  assert(
    contextTranslation.length < 300,
    `Translation too long for one live utterance (${contextTranslation.length} chars)`
  );
  assert(
    !contextTranslation.includes("免得有人自夸"),
    "Translation quoted later manuscript content that was not spoken"
  );

  console.log("\nPASS: REST translation responds to spoken utterance only.");
}

main().catch((error) => {
  console.error("\nFAIL:", error.message);
  process.exit(1);
});
