import assert from "node:assert/strict";
import test from "node:test";
import { buildServerTools, SERVER_TOOL_DEFS } from "../src/tools/server-tools.js";

test("全トグルoffなら空配列を返す", () => {
  assert.deepEqual(buildServerTools({}), []);
  assert.deepEqual(buildServerTools(), []);
});

test("有効なトグルのみを固定順で返す", () => {
  const tools = buildServerTools({
    webSearch: true,
    webFetch: false,
    codeExecution: true,
  });
  assert.deepEqual(tools, [
    SERVER_TOOL_DEFS.webSearch,
    SERVER_TOOL_DEFS.codeExecution,
  ]);
});

test("出力順はトグルの指定順に依らず固定", () => {
  const a = buildServerTools({ codeExecution: true, webSearch: true });
  const b = buildServerTools({ webSearch: true, codeExecution: true });
  assert.deepEqual(a, b);
});

test("各定義はtypeとnameを持つ", () => {
  for (const def of Object.values(SERVER_TOOL_DEFS)) {
    assert.ok(def.type, "typeがある");
    assert.ok(def.name, "nameがある");
  }
});
