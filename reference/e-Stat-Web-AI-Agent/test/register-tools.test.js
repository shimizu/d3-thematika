import assert from "node:assert/strict";
import test from "node:test";
import { createAppToolRegistry } from "../src/tools/register-tools.js";

// 最小限のDatasetStoreスタブ（get/inspectのみ）。
function fakeDatasetStore(datasetOrDatasets) {
  const datasets = Array.isArray(datasetOrDatasets)
    ? datasetOrDatasets
    : [datasetOrDatasets];
  const byId = new Map(datasets.map((dataset) => [dataset.id, dataset]));
  return {
    get: (id) => {
      const dataset = byId.get(id);
      if (!dataset) throw new Error(`not found: ${id}`);
      return dataset;
    },
  };
}

// AnalysisResultStoreのスタブ。add時に連番IDを振り、記録を残す。
function fakeAnalysisStore() {
  const items = [];
  return {
    items,
    add(analysis) {
      const id = `analysis_${String(items.length + 1).padStart(3, "0")}`;
      const stored = { ...analysis, id };
      items.push(stored);
      return stored;
    },
  };
}

const DATASET = {
  id: "dataset_001",
  statsDataId: "0003",
  title: "テスト表",
  filters: {},
  measures: [],
  columns: ["area_name", "value"],
  records: [
    { area_name: "東京", value: 100 },
    { area_name: "東京", value: 150 },
    { area_name: "大阪", value: 200 },
  ],
};

const EXTRA_DATASET = {
  id: "dataset_002",
  statsDataId: "0004",
  title: "追加テスト表",
  filters: {},
  measures: [],
  columns: ["area_name", "value"],
  records: [{ area_name: "京都", value: 300 }],
};

test("analyze_dataset: 集計しanalysisIdを返しストアへ記録する", async () => {
  const analysisStore = fakeAnalysisStore();
  const registry = createAppToolRegistry(
    fakeDatasetStore(DATASET),
    analysisStore,
  );

  const result = await registry.execute("analyze_dataset", {
    datasetId: "dataset_001",
    operation: "group_sum",
    groupBy: ["area_name"],
    valueColumn: "value",
  });

  assert.equal(result.analysisId, "analysis_001");
  assert.equal(result.datasetId, "dataset_001");
  assert.equal(result.operation, "group_sum");
  const tokyo = result.rows.find((r) => r.area_name === "東京");
  assert.equal(tokyo.sum, 250);
  // ストアにはfixed種別で記録される。
  assert.equal(analysisStore.items[0].kind, "fixed");
  assert.equal(analysisStore.items[0].operation, "group_sum");
});

test("execute_analysis_javascript: runnerを注入しcodeを返さずanalysisIdを返す", async () => {
  const analysisStore = fakeAnalysisStore();
  // runnerをスタブして決定論的に検証する。
  const runCode = async ({ code, dataset, args }) => ({
    kind: "javascript",
    datasetId: dataset.id,
    code,
    codeHash: "deadbeef",
    parameters: { args },
    resultColumns: ["total"],
    rows: [{ total: 450 }],
    warnings: [],
    status: "success",
    durationMs: 3,
    computedAt: "2026-06-14T00:00:00.000Z",
  });
  const registry = createAppToolRegistry(
    fakeDatasetStore(DATASET),
    analysisStore,
    { runCode },
  );

  const result = await registry.execute("execute_analysis_javascript", {
    datasetId: "dataset_001",
    code: "function analyze({records}){ return {columns:['total'], rows:[{total: records.reduce((s,r)=>s+r.value,0)}]}; }",
  });

  assert.equal(result.analysisId, "analysis_001");
  assert.equal(result.status, "success");
  assert.deepEqual(result.rows, [{ total: 450 }]);
  // LLMへ返す結果にコード全文は含めない（§8.1）。
  assert.equal(result.code, undefined);
  // ストアにはコード全文が記録される。
  assert.match(analysisStore.items[0].code, /analyze/);
  assert.equal(analysisStore.items[0].kind, "javascript");
});

test("execute_analysis_javascript: datasetIdsで複数データセットをrunnerへ渡す", async () => {
  const analysisStore = fakeAnalysisStore();
  let received;
  const runCode = async ({ code, dataset, datasets, args }) => {
    received = { code, dataset, datasets, args };
    return {
      kind: "javascript",
      datasetId: dataset.id,
      code,
      codeHash: "deadbeef",
      parameters: { args, datasetIds: Object.keys(datasets) },
      resultColumns: ["datasetCount", "recordCount"],
      rows: [
        {
          datasetCount: Object.keys(datasets).length,
          recordCount: Object.values(datasets).reduce(
            (sum, item) => sum + item.records.length,
            0,
          ),
        },
      ],
      warnings: [],
      status: "success",
      durationMs: 3,
      computedAt: "2026-06-14T00:00:00.000Z",
    };
  };
  const registry = createAppToolRegistry(
    fakeDatasetStore([DATASET, EXTRA_DATASET]),
    analysisStore,
    { runCode },
  );

  const result = await registry.execute("execute_analysis_javascript", {
    datasetId: "dataset_001",
    datasetIds: ["dataset_001", "dataset_002"],
    code: "function analyze(){ return {columns:[], rows:[]}; }",
  });

  assert.equal(received.dataset.id, "dataset_001");
  assert.deepEqual(Object.keys(received.datasets), [
    "dataset_001",
    "dataset_002",
  ]);
  assert.equal(result.sourceRecordCount, 4);
  assert.deepEqual(result.rows, [{ datasetCount: 2, recordCount: 4 }]);
  assert.deepEqual(analysisStore.items[0].parameters.datasetIds, [
    "dataset_001",
    "dataset_002",
  ]);
});

test("ツール定義に新ツールが含まれる", () => {
  const registry = createAppToolRegistry(
    fakeDatasetStore(DATASET),
    fakeAnalysisStore(),
  );
  const names = registry.definitions().map((d) => d.name);
  assert.ok(names.includes("analyze_dataset"));
  assert.ok(names.includes("execute_analysis_javascript"));
});
