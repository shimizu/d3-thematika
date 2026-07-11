import assert from "node:assert/strict";
import test from "node:test";
import { AnalysisResultStore } from "../src/data/analysis-store.js";

function fakeStorage() {
  const map = new Map();
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => map.set(key, value),
    removeItem: (key) => map.delete(key),
  };
}

const SAMPLE_ANALYSIS = {
  kind: "fixed",
  datasetId: "dataset_001",
  operation: "group_sum",
  parameters: { groupBy: ["area"], valueColumn: "value" },
  resultColumns: ["area", "sum", "count"],
  rows: [{ area: "01", sum: 250, count: 2 }],
  warnings: [],
  status: "success",
  computedAt: "2026-06-14T00:00:00.000Z",
};

test("addでanalysis_001を採番し本体を保持する", () => {
  const store = new AnalysisResultStore({ storage: fakeStorage() });
  const stored = store.add(SAMPLE_ANALYSIS);
  assert.equal(stored.id, "analysis_001");
  assert.equal(store.get("analysis_001").operation, "group_sum");
  assert.deepEqual(store.get("analysis_001").rows, SAMPLE_ANALYSIS.rows);
});

test("連番でIDを採番する", () => {
  const store = new AnalysisResultStore({ storage: fakeStorage() });
  assert.equal(store.add(SAMPLE_ANALYSIS).id, "analysis_001");
  assert.equal(store.add(SAMPLE_ANALYSIS).id, "analysis_002");
});

test("listは要約とavailableを返す（本体rowsは含めない）", () => {
  const store = new AnalysisResultStore({ storage: fakeStorage() });
  store.add(SAMPLE_ANALYSIS);
  const list = store.list();
  assert.equal(list.length, 1);
  assert.equal(list[0].id, "analysis_001");
  assert.equal(list[0].kind, "fixed");
  assert.equal(list[0].rowCount, 1);
  assert.equal(list[0].available, true);
  assert.equal(list[0].rows, undefined);
});

test("要約はlocalStorageへ永続化され、採番が引き継がれる", () => {
  const storage = fakeStorage();
  const store = new AnalysisResultStore({ storage });
  store.add(SAMPLE_ANALYSIS);

  // 作り直すと要約は復元され、available は false（本体は未ハイドレート）。
  const restored = new AnalysisResultStore({ storage });
  const list = restored.list();
  assert.equal(list.length, 1);
  assert.equal(list[0].available, false);
  // 既存IDと衝突しない連番が振られる。
  assert.equal(restored.add(SAMPLE_ANALYSIS).id, "analysis_002");
});

test("getは未知IDで例外", () => {
  const store = new AnalysisResultStore({ storage: fakeStorage() });
  assert.throws(() => store.get("analysis_999"), /見つかりません/);
});

test("clearで一覧とstorageを空にする", () => {
  const storage = fakeStorage();
  const store = new AnalysisResultStore({ storage });
  store.add(SAMPLE_ANALYSIS);
  store.clear();
  assert.equal(store.list().length, 0);
  const restored = new AnalysisResultStore({ storage });
  assert.equal(restored.list().length, 0);
});

test("subscribeで現在の一覧を即時受け取り、add時に通知する", () => {
  const store = new AnalysisResultStore({ storage: fakeStorage() });
  const seen = [];
  store.subscribe((list) => seen.push(list));
  store.add(SAMPLE_ANALYSIS);
  assert.equal(seen.length, 2);
  assert.equal(seen[1][0].id, "analysis_001");
});

test("javascript種別はcode/codeHashを保持する", () => {
  const store = new AnalysisResultStore({ storage: fakeStorage() });
  const stored = store.add({
    kind: "javascript",
    datasetId: "dataset_001",
    code: "function analyze(){ return { columns: [], rows: [] }; }",
    codeHash: "abc123",
    durationMs: 12,
    status: "success",
    computedAt: "2026-06-14T00:00:00.000Z",
  });
  assert.equal(store.get(stored.id).code.includes("analyze"), true);
  assert.equal(store.list()[0].codeHash, "abc123");
});
