import assert from "node:assert/strict";
import test from "node:test";
import { callClaude } from "../src/agent/claude-client.js";

// Responseの最小モック。
function mockResponse({ ok = true, status = 200, body = {}, headers = {} }) {
  return {
    ok,
    status,
    headers: { get: (key) => headers[key.toLowerCase()] ?? null },
    json: async () => body,
  };
}

const baseArgs = {
  apiKey: "sk-test",
  model: "claude-sonnet-4-6",
  messages: [{ role: "user", content: "hi" }],
  tools: [],
};

test("systemは文字列をcache_control付きブロックに包んで送る", async () => {
  let sentBody;
  await callClaude({
    ...baseArgs,
    system: "あなたは統計エージェントです。",
    fetchImpl: async (_url, init) => {
      sentBody = JSON.parse(init.body);
      return mockResponse({ body: { content: [], stop_reason: "end_turn" } });
    },
  });

  assert.ok(Array.isArray(sentBody.system));
  assert.equal(sentBody.system[0].type, "text");
  assert.deepEqual(sentBody.system[0].cache_control, { type: "ephemeral" });
  assert.equal(sentBody.max_tokens, 16000);
});

test("maxTokensを指定すると上書きされる", async () => {
  let sentBody;
  await callClaude({
    ...baseArgs,
    maxTokens: 4096,
    fetchImpl: async (_url, init) => {
      sentBody = JSON.parse(init.body);
      return mockResponse({ body: {} });
    },
  });
  assert.equal(sentBody.max_tokens, 4096);
});

test("429は指数バックオフで再試行し成功する", async () => {
  let calls = 0;
  const result = await callClaude({
    ...baseArgs,
    maxRetries: 3,
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) {
        return mockResponse({
          ok: false,
          status: 429,
          headers: { "retry-after": "0" },
        });
      }
      return mockResponse({ body: { stop_reason: "end_turn" } });
    },
  });

  assert.equal(calls, 2);
  assert.equal(result.stop_reason, "end_turn");
});

test("再試行上限を超えるとエラーを投げる", async () => {
  let calls = 0;
  await assert.rejects(
    callClaude({
      ...baseArgs,
      maxRetries: 2,
      fetchImpl: async () => {
        calls += 1;
        return mockResponse({
          ok: false,
          status: 529,
          headers: { "retry-after": "0" },
          body: { error: { message: "overloaded" } },
        });
      },
    }),
    /overloaded/,
  );
  // 初回 + 2回の再試行 = 3回
  assert.equal(calls, 3);
});

test("400はリトライせず即エラー", async () => {
  let calls = 0;
  await assert.rejects(
    callClaude({
      ...baseArgs,
      fetchImpl: async () => {
        calls += 1;
        return mockResponse({
          ok: false,
          status: 400,
          body: { error: { message: "bad request" } },
        });
      },
    }),
    /bad request/,
  );
  assert.equal(calls, 1);
});

test("APIキー未設定はリクエスト前に弾く", async () => {
  await assert.rejects(
    callClaude({ ...baseArgs, apiKey: "", fetchImpl: async () => mockResponse({}) }),
    /APIキー/,
  );
});
