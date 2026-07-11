import assert from "node:assert/strict";
import test from "node:test";
import { ConversationStore } from "../src/agent/conversation-store.js";

function fakeStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, value),
    removeItem: (key) => map.delete(key),
  };
}

test("setMessagesで保存し、再生成で復元する", () => {
  const storage = fakeStorage();
  const store = new ConversationStore({ storage });

  const messages = [
    { role: "user", content: "依頼" },
    { role: "assistant", content: [{ type: "text", text: "回答" }] },
  ];
  store.setMessages(messages);

  // 同じstorageから作り直すと履歴が復元される。
  const restored = new ConversationStore({ storage });
  assert.deepEqual(restored.getMessages(), messages);
});

test("clearで履歴とstorageを空にする", () => {
  const storage = fakeStorage();
  const store = new ConversationStore({ storage });
  store.setMessages([{ role: "user", content: "依頼" }]);

  store.clear();
  assert.deepEqual(store.getMessages(), []);

  const restored = new ConversationStore({ storage });
  assert.deepEqual(restored.getMessages(), []);
});

test("subscribeで現在の履歴を即時受け取る", () => {
  const store = new ConversationStore({ storage: fakeStorage() });
  const seen = [];
  store.subscribe((messages) => seen.push(messages));
  store.setMessages([{ role: "user", content: "依頼" }]);

  assert.equal(seen.length, 2);
  assert.equal(seen[1][0].content, "依頼");
});
