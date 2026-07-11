import assert from "node:assert/strict";
import test from "node:test";
import {
  findForbiddenTokens,
  hashCode,
  inspectCode,
} from "../src/analysis/code-guard.js";
import { runUserCode } from "../src/analysis/analysis-worker.js";
import { runAnalysisCode } from "../src/analysis/analysis-runner.js";

const DATASET = {
  id: "dataset_001",
  statsDataId: "0003",
  title: "テスト表",
  filters: {},
  measures: [],
  columns: ["area", "value"],
  records: [
    { area: "01", value: 100 },
    { area: "02", value: 200 },
  ],
};

const EXTRA_DATASET = {
  id: "dataset_002",
  statsDataId: "0004",
  title: "追加テスト表",
  filters: {},
  measures: [],
  columns: ["area", "value"],
  records: [{ area: "03", value: 300 }],
};

// 与えたコードを即時実行してonmessageへ結果を返すfake worker。
function fakeWorker() {
  const worker = {
    onmessage: null,
    onerror: null,
    terminated: false,
    postMessage({ code, input }) {
      try {
        const result = runUserCode(code, input);
        queueMicrotask(() => worker.onmessage?.({ data: { ok: true, result } }));
      } catch (error) {
        queueMicrotask(() =>
          worker.onmessage?.({ data: { ok: false, error: error.message } }),
        );
      }
    },
    terminate() {
      worker.terminated = true;
    },
  };
  return worker;
}

// 決してonmessageを呼ばない（無限ループを模擬）fake worker。
function hangingWorker() {
  return {
    onmessage: null,
    onerror: null,
    terminated: false,
    postMessage() {},
    terminate() {
      this.terminated = true;
    },
  };
}

test("code-guard: 禁止トークンを検出する", () => {
  assert.deepEqual(findForbiddenTokens("const x = fetch('/a')"), ["fetch"]);
  assert.deepEqual(findForbiddenTokens("localStorage.getItem('k')"), [
    "localStorage",
  ]);
  assert.deepEqual(findForbiddenTokens("await import('./x.js')"), ["動的import"]);
  assert.deepEqual(findForbiddenTokens("const s = a + b"), []);
});

test("code-guard: inspectCodeはok/reasonsを返す", () => {
  assert.deepEqual(inspectCode("return 1"), { ok: true, reasons: [] });
  const bad = inspectCode("new WebSocket('x'); fetch('y')");
  assert.equal(bad.ok, false);
  assert.ok(bad.reasons.includes("WebSocket"));
  assert.ok(bad.reasons.includes("fetch"));
});

test("hashCode: 同じコードは同じ、違うコードは違う", () => {
  assert.equal(hashCode("abc"), hashCode("abc"));
  assert.notEqual(hashCode("abc"), hashCode("abd"));
});

test("runAnalysisCode: 正常実行で結果を構造化する", async () => {
  const code = `function analyze({ records }) {
    const total = records.reduce((s, r) => s + r.value, 0);
    return { columns: ["total"], rows: [{ total }], notes: ["ok"] };
  }`;
  const result = await runAnalysisCode(
    { code, dataset: DATASET, now: "2026-06-14T00:00:00.000Z" },
    { createWorker: fakeWorker, nowFn: () => 0 },
  );
  assert.equal(result.status, "success");
  assert.equal(result.kind, "javascript");
  assert.equal(result.datasetId, "dataset_001");
  assert.deepEqual(result.resultColumns, ["total"]);
  assert.deepEqual(result.rows, [{ total: 300 }]);
  assert.deepEqual(result.warnings, ["ok"]);
  assert.ok(result.codeHash);
});

test("runAnalysisCode: 複数データセットをdatasetsから参照できる", async () => {
  const code = `function analyze({ records, datasets }) {
    const mainTotal = records.reduce((s, r) => s + r.value, 0);
    const extraTotal = datasets.dataset_002.records.reduce((s, r) => s + r.value, 0);
    return {
      columns: ["mainTotal", "extraTotal", "datasetCount"],
      rows: [{ mainTotal, extraTotal, datasetCount: Object.keys(datasets).length }],
    };
  }`;
  const result = await runAnalysisCode(
    {
      code,
      dataset: DATASET,
      datasets: {
        dataset_001: DATASET,
        dataset_002: EXTRA_DATASET,
      },
      now: "2026-06-14T00:00:00.000Z",
    },
    { createWorker: fakeWorker, nowFn: () => 0 },
  );
  assert.equal(result.status, "success");
  assert.deepEqual(result.rows, [
    { mainTotal: 300, extraTotal: 300, datasetCount: 2 },
  ]);
  assert.deepEqual(result.parameters.datasetIds, ["dataset_001", "dataset_002"]);
});

test("runAnalysisCode: 例外はerror状態で返す", async () => {
  const code = `function analyze() { throw new Error("失敗"); }`;
  const result = await runAnalysisCode(
    { code, dataset: DATASET },
    { createWorker: fakeWorker },
  );
  assert.equal(result.status, "error");
  assert.match(result.error, /失敗/);
});

test("runAnalysisCode: 事前検査で禁止コードを拒否（Worker生成しない）", async () => {
  let created = false;
  const code = `function analyze() { return fetch("/x"); }`;
  const result = await runAnalysisCode(
    { code, dataset: DATASET },
    {
      createWorker: () => {
        created = true;
        return fakeWorker();
      },
    },
  );
  assert.equal(result.status, "rejected");
  assert.match(result.error, /fetch/);
  assert.equal(created, false);
});

test("runAnalysisCode: タイムアウトでterminateしtimeout状態", async () => {
  const worker = hangingWorker();
  // setTimeoutを即時発火させてタイムアウト経路を検証する。
  const result = await runAnalysisCode(
    { code: "function analyze(){ while(true){} }", dataset: DATASET },
    {
      createWorker: () => worker,
      setTimeoutFn: (fn) => {
        fn();
        return 1;
      },
      clearTimeoutFn: () => {},
    },
  );
  assert.equal(result.status, "timeout");
  assert.equal(worker.terminated, true);
});

test("runAnalysisCode: 巨大出力はサイズ上限で拒否", async () => {
  const code = `function analyze() {
    const rows = [];
    for (let i = 0; i < 1000; i += 1) rows.push({ i, pad: "x".repeat(100) });
    return { columns: ["i", "pad"], rows };
  }`;
  const result = await runAnalysisCode(
    { code, dataset: DATASET },
    { createWorker: fakeWorker, maxOutputBytes: 500 },
  );
  assert.equal(result.status, "error");
  assert.match(result.error, /上限/);
});

test("runAnalysisCode: 入力件数上限を超えると拒否", async () => {
  const big = {
    ...DATASET,
    records: Array.from({ length: 10 }, (_, i) => ({ area: "x", value: i })),
  };
  const result = await runAnalysisCode(
    { code: "function analyze(){ return {}; }", dataset: big },
    { createWorker: fakeWorker, maxInputRecords: 5 },
  );
  assert.equal(result.status, "rejected");
  assert.match(result.error, /上限/);
});

test("runAnalysisCode: 複数データセットの合算入力件数上限を検査する", async () => {
  const result = await runAnalysisCode(
    {
      code: "function analyze(){ return {}; }",
      dataset: DATASET,
      datasets: {
        dataset_001: DATASET,
        dataset_002: EXTRA_DATASET,
      },
    },
    { createWorker: fakeWorker, maxInputRecords: 2 },
  );
  assert.equal(result.status, "rejected");
  assert.match(result.error, /3/);
});

test("runAnalysisCode: analyze未定義はerror", async () => {
  const result = await runAnalysisCode(
    { code: "const x = 1;", dataset: DATASET },
    { createWorker: fakeWorker },
  );
  assert.equal(result.status, "error");
  assert.match(result.error, /analyze/);
});
