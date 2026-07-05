import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const { splitChineseSentences, splitEnglishSentences } = require(
  "../lib/chineseSentences.ts"
);

const sample =
  "今天是主日。我们要一起敬拜。求圣灵引导我们。这是第三句。";

assert.deepEqual(splitChineseSentences(sample), [
  "今天是主日。",
  "我们要一起敬拜。",
  "求圣灵引导我们。",
  "这是第三句。",
]);

assert.deepEqual(
  splitEnglishSentences("First line. Second line. Third line."),
  ["First line.", "Second line.", "Third line."]
);

console.log("test-chinese-sentences: ok");
