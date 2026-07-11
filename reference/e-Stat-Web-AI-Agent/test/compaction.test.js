import assert from "node:assert/strict";
import test from "node:test";
import {
  COMPACT_PLACEHOLDER,
  compactConversation,
} from "../src/agent/compaction.js";

function toolUse(id) {
  return { role: "assistant", content: [{ type: "tool_use", id, name: "x", input: {} }] };
}

function toolResult(id, body) {
  return {
    role: "user",
    content: [{ type: "tool_result", tool_use_id: id, content: body }],
  };
}

test("古いtool_resultの本文だけをプレースホルダへ縮約する", () => {
  const messages = [
    { role: "user", content: "最初の依頼" },
    toolUse("t1"),
    toolResult("t1", "古い大きな結果"),
    { role: "user", content: "追加の依頼" },
    toolUse("t2"),
    toolResult("t2", "新しい結果"),
  ];

  const compacted = compactConversation(messages, { keepRecentMessages: 2 });

  // 古いtool_resultは縮約される。
  assert.equal(compacted[2].content[0].content, COMPACT_PLACEHOLDER);
  // tool_use ↔ tool_result の対応IDは保持される。
  assert.equal(compacted[2].content[0].tool_use_id, "t1");
  // 直近2件は触らない。
  assert.equal(compacted.at(-1).content[0].content, "新しい結果");
  // 元配列は破壊しない。
  assert.equal(messages[2].content[0].content, "古い大きな結果");
});

test("メッセージ数がkeepRecent以下なら変更しない", () => {
  const messages = [
    { role: "user", content: "依頼" },
    toolUse("t1"),
    toolResult("t1", "結果"),
  ];
  const compacted = compactConversation(messages, { keepRecentMessages: 8 });
  assert.equal(compacted, messages);
});
