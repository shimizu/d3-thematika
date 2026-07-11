import assert from "node:assert/strict";
import test from "node:test";
import { TOOL_RESULT_CHAR_CAP, runAgent } from "../src/agent/runtime.js";
import { ToolRegistry } from "../src/agent/tool-registry.js";

test("ツールを使わない応答を正常終了として返す", async () => {
  const registry = new ToolRegistry();
  const result = await runAgent({
    instruction: "人口を調べて",
    toolRegistry: registry,
    callModel: async () => ({
      stop_reason: "end_turn",
      content: [{ type: "text", text: "完了しました。" }],
    }),
  });

  assert.equal(result.status, "completed");
  assert.equal(result.content, "完了しました。");
});

test("tool useの結果を会話へ追加して次の応答へ進む", async () => {
  const registry = new ToolRegistry().register(
    {
      name: "echo",
      description: "入力をそのまま返す",
      input_schema: {
        type: "object",
        properties: { value: { type: "string" } },
        required: ["value"],
      },
    },
    async ({ value }) => ({ value }),
  );

  let requestCount = 0;
  const result = await runAgent({
    instruction: "echoを実行して",
    toolRegistry: registry,
    callModel: async ({ messages }) => {
      requestCount += 1;
      if (requestCount === 1) {
        return {
          stop_reason: "tool_use",
          content: [
            {
              type: "tool_use",
              id: "tool-1",
              name: "echo",
              input: { value: "ok" },
            },
          ],
        };
      }

      const toolResult = messages.at(-1).content[0];
      assert.equal(toolResult.tool_use_id, "tool-1");
      assert.equal(toolResult.content, '{"value":"ok"}');
      return {
        stop_reason: "end_turn",
        content: [{ type: "text", text: "ツール実行完了" }],
      };
    },
  });

  assert.equal(requestCount, 2);
  assert.equal(result.status, "completed");
});

test("ツール例外をis_error付きの結果としてモデルへ返す", async () => {
  const registry = new ToolRegistry().register(
    {
      name: "fail",
      description: "必ず失敗する",
      input_schema: { type: "object", properties: {} },
    },
    async () => {
      throw new Error("想定した失敗");
    },
  );

  let requestCount = 0;
  const result = await runAgent({
    instruction: "失敗を確認して",
    toolRegistry: registry,
    callModel: async ({ messages }) => {
      requestCount += 1;
      if (requestCount === 1) {
        return {
          stop_reason: "tool_use",
          content: [
            {
              type: "tool_use",
              id: "tool-1",
              name: "fail",
              input: {},
            },
          ],
        };
      }

      const toolResult = messages.at(-1).content[0];
      assert.equal(toolResult.is_error, true);
      assert.equal(toolResult.content, "想定した失敗");
      return {
        stop_reason: "end_turn",
        content: [{ type: "text", text: "エラーを確認しました。" }],
      };
    },
  });

  assert.equal(result.status, "completed");
});

test("反復上限到達時はツール無しで要約回答を返す", async () => {
  const registry = new ToolRegistry().register(
    {
      name: "noop",
      description: "何もしない",
      input_schema: { type: "object", properties: {} },
    },
    async () => ({ ok: true }),
  );

  let toolsAtFinalCall;
  const result = await runAgent({
    instruction: "ずっとツールを使い続ける",
    toolRegistry: registry,
    maxIterations: 2,
    callModel: async ({ tools }) => {
      if (tools.length === 0) {
        // ツール無し＝上限到達後の要約呼び出し。
        toolsAtFinalCall = tools;
        return {
          stop_reason: "end_turn",
          content: [{ type: "text", text: "ここまでの要約です" }],
        };
      }
      return {
        stop_reason: "tool_use",
        content: [{ type: "tool_use", id: "t", name: "noop", input: {} }],
      };
    },
  });

  assert.equal(result.status, "iteration_limit");
  assert.equal(result.content, "ここまでの要約です");
  assert.deepEqual(toolsAtFinalCall, []);
});

test("要約呼び出しが失敗してもcontent無しのiteration_limitで返す", async () => {
  const registry = new ToolRegistry().register(
    {
      name: "noop",
      description: "何もしない",
      input_schema: { type: "object", properties: {} },
    },
    async () => ({ ok: true }),
  );

  const result = await runAgent({
    instruction: "ずっとツールを使い続ける",
    toolRegistry: registry,
    maxIterations: 1,
    callModel: async ({ tools }) => {
      if (tools.length === 0) {
        throw new Error("要約呼び出し失敗");
      }
      return {
        stop_reason: "tool_use",
        content: [{ type: "tool_use", id: "t", name: "noop", input: {} }],
      };
    },
  });

  assert.equal(result.status, "iteration_limit");
  assert.equal(result.content, undefined);
});

test("過去のmessagesを引き継いで会話を継続する", async () => {
  const registry = new ToolRegistry();
  let received;
  const history = [
    { role: "user", content: "前回の依頼" },
    { role: "assistant", content: [{ type: "text", text: "前回の回答" }] },
  ];

  const result = await runAgent({
    instruction: "続きをお願い",
    messages: history,
    toolRegistry: registry,
    callModel: async ({ messages }) => {
      received = [...messages];
      return {
        stop_reason: "end_turn",
        content: [{ type: "text", text: "了解" }],
      };
    },
  });

  assert.equal(received[0].content, "前回の依頼");
  assert.equal(received.at(-1).content, "続きをお願い");
  assert.equal(received.length, 3);
  // 元の履歴配列は破壊しない。
  assert.equal(history.length, 2);
  assert.equal(result.status, "completed");
});

test("tool_useターンの解説テキストをassistant_textイベントで通知する", async () => {
  const registry = new ToolRegistry().register(
    {
      name: "noop",
      description: "何もしない",
      input_schema: { type: "object", properties: {} },
    },
    async () => ({ ok: true }),
  );

  const texts = [];
  let requestCount = 0;
  await runAgent({
    instruction: "途中経過を確認",
    toolRegistry: registry,
    onEvent: (event) => {
      if (event.type === "assistant_text") texts.push(event.text);
    },
    callModel: async () => {
      requestCount += 1;
      if (requestCount === 1) {
        return {
          stop_reason: "tool_use",
          content: [
            { type: "text", text: "まず検索します" },
            { type: "tool_use", id: "tool-1", name: "noop", input: {} },
          ],
        };
      }
      // 最終ターン（テキストのみ）はイベント発火しない。
      return {
        stop_reason: "end_turn",
        content: [{ type: "text", text: "完了しました" }],
      };
    },
  });

  assert.deepEqual(texts, ["まず検索します"]);
});

test("テキストの無いtool_useターンではassistant_textを発火しない", async () => {
  const registry = new ToolRegistry().register(
    {
      name: "noop",
      description: "何もしない",
      input_schema: { type: "object", properties: {} },
    },
    async () => ({ ok: true }),
  );

  let fired = false;
  let requestCount = 0;
  await runAgent({
    instruction: "テキスト無し",
    toolRegistry: registry,
    onEvent: (event) => {
      if (event.type === "assistant_text") fired = true;
    },
    callModel: async () => {
      requestCount += 1;
      if (requestCount === 1) {
        return {
          stop_reason: "tool_use",
          content: [{ type: "tool_use", id: "tool-1", name: "noop", input: {} }],
        };
      }
      return { stop_reason: "end_turn", content: [{ type: "text", text: "ok" }] };
    },
  });

  assert.equal(fired, false);
});

test("巨大なツール結果を上限内に切り詰める", async () => {
  const registry = new ToolRegistry().register(
    {
      name: "huge",
      description: "巨大な結果を返す",
      input_schema: { type: "object", properties: {} },
    },
    async () => ({ blob: "x".repeat(TOOL_RESULT_CHAR_CAP * 2) }),
  );

  let requestCount = 0;
  await runAgent({
    instruction: "巨大な結果を取得して",
    toolRegistry: registry,
    callModel: async ({ messages }) => {
      requestCount += 1;
      if (requestCount === 1) {
        return {
          stop_reason: "tool_use",
          content: [{ type: "tool_use", id: "tool-1", name: "huge", input: {} }],
        };
      }
      const toolResult = messages.at(-1).content[0];
      assert.ok(
        toolResult.content.length < TOOL_RESULT_CHAR_CAP * 2,
        "結果が切り詰められていない",
      );
      assert.match(toolResult.content, /省略/);
      return { stop_reason: "end_turn", content: [{ type: "text", text: "ok" }] };
    },
  });

  assert.equal(requestCount, 2);
});


test("pause_turnは追加メッセージなしで再送して処理を継続する", async () => {
  const registry = new ToolRegistry();
  const sentMessages = [];
  let requestCount = 0;

  const result = await runAgent({
    instruction: "web検索して",
    toolRegistry: registry,
    callModel: async ({ messages }) => {
      requestCount += 1;
      sentMessages.push(messages.length);
      if (requestCount === 1) {
        // サーバー側ツールが中断した状態を模擬する。
        return {
          stop_reason: "pause_turn",
          content: [
            { type: "server_tool_use", id: "srv-1", name: "web_search", input: {} },
          ],
        };
      }
      return {
        stop_reason: "end_turn",
        content: [{ type: "text", text: "検索完了" }],
      };
    },
  });

  assert.equal(result.status, "completed");
  assert.equal(result.content, "検索完了");
  assert.equal(requestCount, 2);
  // pause_turnのassistant応答が積まれるだけで、余分なuser(tool_result)は足されない。
  // 1回目: [user], 2回目: [user, assistant(pause)]
  assert.deepEqual(sentMessages, [1, 2]);
  const lastAssistant = result.messages.at(-1);
  assert.equal(lastAssistant.role, "assistant");
});

test("pause_turnの解説テキストをassistant_textイベントで通知する", async () => {
  const registry = new ToolRegistry();
  const events = [];
  let requestCount = 0;

  await runAgent({
    instruction: "調べて",
    toolRegistry: registry,
    onEvent: (event) => events.push(event),
    callModel: async () => {
      requestCount += 1;
      if (requestCount === 1) {
        return {
          stop_reason: "pause_turn",
          content: [{ type: "text", text: "検索中です…" }],
        };
      }
      return { stop_reason: "end_turn", content: [{ type: "text", text: "done" }] };
    },
  });

  const textEvent = events.find((e) => e.type === "assistant_text");
  assert.ok(textEvent, "assistant_textイベントが発火している");
  assert.equal(textEvent.text, "検索中です…");
});
