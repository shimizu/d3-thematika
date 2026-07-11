import assert from "node:assert/strict";
import test from "node:test";
import {
  BASE_SYSTEM_PROMPT,
  composeSystemPrompt,
} from "../src/agent/system-prompt.js";

test("既定で基本プロンプトと貿易統計スキルを連結する", () => {
  const prompt = composeSystemPrompt();

  // 基本プロンプトを含む。
  assert.ok(prompt.includes(BASE_SYSTEM_PROMPT.trim()));
  // テーブル選択ミスを正すスキルの要点を含む。
  for (const phrase of ["確報", "cat02", "複数年", "00350300", "品別国別表"]) {
    assert.ok(prompt.includes(phrase), `「${phrase}」が含まれていない`);
  }
});

test("スキルを差し替え・無効化できる", () => {
  assert.equal(composeSystemPrompt([]), BASE_SYSTEM_PROMPT.trim());
  assert.ok(composeSystemPrompt(["独自スキル"]).includes("独自スキル"));
});
