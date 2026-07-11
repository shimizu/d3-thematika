import assert from "node:assert/strict";
import test from "node:test";
import {
  SCENARIOS,
  approxIncludes,
  collectNumbers,
  evaluateScenario,
  isSubsequence,
  resolvePrompt,
} from "../src/test-harness/scenarios.js";
import {
  EXPECTED_TOTAL_TOP_VALUE,
  EXPECTED_WEIGHTED_GROWTH,
} from "../src/test-harness/fixtures.js";

test("isSubsequence: 順序を保った部分列を判定する", () => {
  assert.equal(isSubsequence(["a", "c"], ["a", "b", "c"]), true);
  assert.equal(isSubsequence(["a", "b", "c"], ["a", "b", "c"]), true);
  assert.equal(isSubsequence([], ["a"]), true);
  // 順序が逆 → false
  assert.equal(isSubsequence(["c", "a"], ["a", "b", "c"]), false);
  // 欠落 → false
  assert.equal(isSubsequence(["a", "x"], ["a", "b", "c"]), false);
});

test("isSubsequence: 間に別ツールが挟まっても合格", () => {
  const actual = [
    "search_stats_tables",
    "get_stats_metadata",
    "fetch_stats_data",
    "inspect_dataset",
    "analyze_dataset",
  ];
  assert.equal(
    isSubsequence(
      ["search_stats_tables", "fetch_stats_data", "analyze_dataset"],
      actual,
    ),
    true,
  );
});

function baseCtx(overrides = {}) {
  return {
    toolCalls: [],
    result: { status: "completed", content: "" },
    analyses: [],
    datasets: [],
    ...overrides,
  };
}

test("evaluateScenario: 全チェック合格でpass", () => {
  const scenario = SCENARIOS.find((s) => s.id === "search-only");
  const ctx = baseCtx({
    toolCalls: [{ name: "search_stats_tables", input: {} }],
    result: { status: "completed", content: "候補一覧" },
  });
  const { pass, checks } = evaluateScenario(scenario, ctx);
  assert.equal(pass, true);
  assert.equal(checks.length, 2); // tools + status
});

test("evaluateScenario: ツール順不一致でfail", () => {
  const scenario = SCENARIOS.find((s) => s.id === "search-only");
  const ctx = baseCtx({
    toolCalls: [{ name: "inspect_dataset", input: {} }],
  });
  const { pass, checks } = evaluateScenario(scenario, ctx);
  assert.equal(pass, false);
  assert.equal(checks[0].ok, false);
});

test("evaluateScenario: status不一致でfail", () => {
  const scenario = SCENARIOS.find((s) => s.id === "search-only");
  const ctx = baseCtx({
    toolCalls: [{ name: "search_stats_tables", input: {} }],
    result: { status: "iteration_limit", content: "" },
  });
  const { pass } = evaluateScenario(scenario, ctx);
  assert.equal(pass, false);
});

test("evaluateScenario: 取得テストはデータセット保存を判定する", () => {
  const scenario = SCENARIOS.find((s) => s.id === "fetch-dataset");
  const okCtx = baseCtx({
    toolCalls: [
      { name: "search_stats_tables", input: {} },
      { name: "get_stats_metadata", input: {} },
      { name: "fetch_stats_data", input: {} },
    ],
    result: { status: "completed", content: "保存しました" },
    datasets: [{ id: "dataset_001", available: true, recordCount: 120 }],
  });
  assert.equal(evaluateScenario(scenario, okCtx).pass, true);

  // データセット未保存 → custom fail
  const noData = baseCtx({
    toolCalls: okCtx.toolCalls,
    result: { status: "completed", content: "" },
    datasets: [],
  });
  assert.equal(evaluateScenario(scenario, noData).pass, false);
});

test("evaluateScenario: 固定集計は保存データ利用・再取得なしを判定する", () => {
  const scenario = SCENARIOS.find((s) => s.id === "fixed-aggregate");
  const okCtx = baseCtx({
    toolCalls: [
      { name: "inspect_dataset", input: {} },
      { name: "analyze_dataset", input: {} },
    ],
    result: { status: "completed", content: "上位はブラジルで12,345千円" },
    analyses: [{ id: "analysis_001", kind: "fixed" }],
  });
  assert.equal(evaluateScenario(scenario, okCtx).pass, true);

  // 再取得(fetch)してしまうと e-Stat 非依存でなくなる → fail
  const refetched = baseCtx({
    toolCalls: [
      { name: "fetch_stats_data", input: {} },
      { name: "analyze_dataset", input: {} },
    ],
    result: { status: "completed", content: "123" },
    analyses: [{ id: "analysis_001", kind: "fixed" }],
  });
  assert.equal(evaluateScenario(scenario, refetched).pass, false);

  // analysisId が無い → fail
  const noLog = baseCtx({
    toolCalls: [{ name: "analyze_dataset", input: {} }],
    result: { status: "completed", content: "数値あり123" },
    analyses: [],
  });
  assert.equal(evaluateScenario(scenario, noLog).pass, false);
});

test("evaluateScenario: JS実行は保存データ利用・再取得なしを判定する", () => {
  const scenario = SCENARIOS.find((s) => s.id === "javascript-analysis");
  const okCtx = baseCtx({
    toolCalls: [{ name: "execute_analysis_javascript", input: {} }],
    result: { status: "completed", content: "構成比を計算しました" },
    analyses: [{ id: "analysis_001", kind: "javascript", status: "success" }],
  });
  assert.equal(evaluateScenario(scenario, okCtx).pass, true);

  const failCtx = baseCtx({
    toolCalls: [{ name: "execute_analysis_javascript", input: {} }],
    result: { status: "completed", content: "" },
    analyses: [{ id: "analysis_001", kind: "javascript", status: "error" }],
  });
  assert.equal(evaluateScenario(scenario, failCtx).pass, false);
});

test("resolvePrompt: buildPromptを持つもの(requiresDataset/seedDataset)はdatasetIdを差し込む", () => {
  const fixed = SCENARIOS.find((s) => s.id === "fixed-aggregate");
  assert.match(resolvePrompt(fixed, "dataset_007"), /dataset_007/);

  const builtin = SCENARIOS.find((s) => s.id === "fixed-aggregate-builtin");
  assert.match(resolvePrompt(builtin, "dataset_009"), /dataset_009/);

  const search = SCENARIOS.find((s) => s.id === "search-only");
  assert.equal(resolvePrompt(search), search.prompt);
});

test("collectNumbers: ネスト構造と数値文字列から数を収集する", () => {
  const nums = collectNumbers([
    { a: 220000, b: "12,345" },
    { c: "成長率 49.8%" },
    { d: null, e: "x" },
  ]);
  assert.ok(nums.includes(220000));
  assert.ok(nums.includes(12345));
  assert.ok(nums.includes(49.8));
});

test("approxIncludes: 許容誤差内の値を検出する", () => {
  assert.equal(approxIncludes([1, 49.76, 3], 49.76, 0.3), true);
  assert.equal(approxIncludes([1, 49.5, 3], 49.76, 0.3), true); // 0.26 < 0.3
  assert.equal(approxIncludes([1, 49.4, 3], 49.76, 0.3), false); // 0.36 > 0.3
});

test("evaluateScenario: 内蔵固定集計は正解値(220000)をrowsで照合する", () => {
  const scenario = SCENARIOS.find((s) => s.id === "fixed-aggregate-builtin");
  const okCtx = baseCtx({
    toolCalls: [{ name: "analyze_dataset", input: {} }],
    result: { status: "completed", content: "上位はブラジル" },
    analyses: [
      {
        id: "analysis_001",
        kind: "fixed",
        rows: [{ area_name: "ブラジル", sum: EXPECTED_TOTAL_TOP_VALUE }],
      },
    ],
  });
  assert.equal(evaluateScenario(scenario, okCtx).pass, true);

  // 誤った合計値 → fail
  const wrong = baseCtx({
    toolCalls: [{ name: "analyze_dataset", input: {} }],
    result: { status: "completed", content: "" },
    analyses: [{ id: "analysis_001", kind: "fixed", rows: [{ sum: 999 }] }],
  });
  assert.equal(evaluateScenario(scenario, wrong).pass, false);
});

test("evaluateScenario: 内蔵高度分析は正解値(≈49.76)をrows/回答で照合する", () => {
  const scenario = SCENARIOS.find((s) => s.id === "javascript-analysis-builtin");
  const okCtx = baseCtx({
    toolCalls: [{ name: "execute_analysis_javascript", input: {} }],
    result: { status: "completed", content: "加重平均成長率は約49.8%です" },
    analyses: [
      {
        id: "analysis_001",
        kind: "javascript",
        status: "success",
        rows: [{ weightedGrowth: EXPECTED_WEIGHTED_GROWTH }],
      },
    ],
  });
  assert.equal(evaluateScenario(scenario, okCtx).pass, true);

  // 数値が合わない → fail
  const wrong = baseCtx({
    toolCalls: [{ name: "execute_analysis_javascript", input: {} }],
    result: { status: "completed", content: "30%でした" },
    analyses: [
      {
        id: "analysis_001",
        kind: "javascript",
        status: "success",
        rows: [{ weightedGrowth: 30 }],
      },
    ],
  });
  assert.equal(evaluateScenario(scenario, wrong).pass, false);

  // 再取得してしまうと fail（e-Stat非依存でなくなる）
  const refetched = baseCtx({
    toolCalls: [
      { name: "fetch_stats_data", input: {} },
      { name: "execute_analysis_javascript", input: {} },
    ],
    result: { status: "completed", content: "約49.76%" },
    analyses: [
      {
        id: "analysis_001",
        kind: "javascript",
        status: "success",
        rows: [{ weightedGrowth: EXPECTED_WEIGHTED_GROWTH }],
      },
    ],
  });
  assert.equal(evaluateScenario(scenario, refetched).pass, false);
});

test("evaluateScenario: 疎通確認は応答テキスト有無で判定する", () => {
  const scenario = SCENARIOS.find((s) => s.id === "claude-ping");
  const okCtx = baseCtx({
    toolCalls: [],
    result: { status: "completed", content: "OK" },
  });
  assert.equal(evaluateScenario(scenario, okCtx).pass, true);

  const emptyCtx = baseCtx({
    toolCalls: [],
    result: { status: "completed", content: "   " },
  });
  assert.equal(evaluateScenario(scenario, emptyCtx).pass, false);
});

test("SCENARIOS: 8シナリオが定義され必須項目を持つ", () => {
  assert.equal(SCENARIOS.length, 8);
  assert.equal(SCENARIOS[0].id, "claude-ping"); // 疎通確認が先頭
  for (const s of SCENARIOS) {
    assert.ok(s.id && s.title);
    // 疎通確認(directPing=Claude / estatPing=e-Stat)はプロンプト不要。
    // それ以外は buildPrompt(データセット依存/内蔵)か固定promptを持つ。
    if (s.directPing || s.estatPing) {
      assert.ok(s.directPing || s.estatPing);
    } else if (s.requiresDataset || s.seedDataset) {
      assert.equal(typeof s.buildPrompt, "function");
    } else {
      assert.ok(typeof s.prompt === "string");
    }
    assert.ok(Array.isArray(s.expect.tools));
  }
});
