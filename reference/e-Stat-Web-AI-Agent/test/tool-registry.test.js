import assert from "node:assert/strict";
import test from "node:test";
import { ToolRegistry } from "../src/agent/tool-registry.js";

test("登録したツール定義と実装を取得できる", async () => {
  const registry = new ToolRegistry().register(
    {
      name: "sum",
      description: "合計する",
      input_schema: { type: "object", properties: {} },
    },
    async ({ a, b }) => a + b,
  );

  assert.equal(registry.has("sum"), true);
  assert.equal(registry.definitions()[0].name, "sum");
  assert.equal(await registry.execute("sum", { a: 2, b: 3 }), 5);
});

test("未登録ツールの実行を拒否する", async () => {
  const registry = new ToolRegistry();

  await assert.rejects(
    registry.execute("unknown", {}),
    /未登録のツールが要求されました/,
  );
});

