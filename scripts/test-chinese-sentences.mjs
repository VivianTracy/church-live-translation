import assert from "node:assert/strict";

const {
  splitChineseSentences,
  splitEnglishSentences,
  countChineseCharacters,
  MAX_SEGMENT_CHARS,
} = await import("../lib/chineseSentences.ts");

const punctuated =
  "今天是主日。我们要一起敬拜。求圣灵引导我们。这是第四句。";

assert.deepEqual(splitChineseSentences(punctuated), [
  "今天是主日。",
  "我们要一起敬拜。",
  "求圣灵引导我们。",
  "这是第四句。",
]);

const unpunctuated =
  "今天我们要一起敬拜神感谢他给我们这个日子还可以来在这里聚会听道";

const unpunctuatedParts = splitChineseSentences(unpunctuated);

assert.ok(unpunctuatedParts.length >= 2, "unpunctuated speech should split");
assert.ok(
  unpunctuatedParts.every((part) => part.length <= MAX_SEGMENT_CHARS),
  "each segment should respect max length"
);

const commaClauses =
  "弟兄姐妹们，今天我们要来看一段经文，请大家一起翻开圣经哥林多前书";

const commaParts = splitChineseSentences(commaClauses);

assert.ok(commaParts.length >= 3, "comma clauses should split");

assert.deepEqual(
  splitEnglishSentences("First line. Second line. Third line."),
  ["First line.", "Second line.", "Third line."]
);

assert.equal(countChineseCharacters("你好 世界"), 4);

console.log("test-chinese-sentences: ok");
