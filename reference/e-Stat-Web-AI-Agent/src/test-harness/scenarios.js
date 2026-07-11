// エージェントのツール利用を実APIで観測・検証するためのシナリオ定義と判定ロジック。
// ここはネットワーク非依存の純粋ロジックに保ち、node --test で単体検証できるようにする。
// 実行（runAgent呼び出し）はApp側のrunDebugScenarioが担い、ここは「期待」と「判定」だけを持つ。

import {
  EXPECTED_TOTAL_TOP_VALUE,
  EXPECTED_WEIGHTED_GROWTH,
  buildCoffeeFixtureDataset,
} from "./fixtures.js";

/**
 * expected が actual の順序付き部分列かを判定する。
 * 例: ["a","c"] は ["a","b","c"] の部分列 → true。順序が逆なら false。
 * エージェントが inspect_dataset 等を間に挟んでも、期待した主要ツールが順番に
 * 現れていれば合格とみなす。
 */
export function isSubsequence(expected, actual) {
  let i = 0;
  for (const name of actual) {
    if (i < expected.length && name === expected[i]) i += 1;
  }
  return i === expected.length;
}

// 最終回答に数値（桁区切りや小数を含む）が含まれるか。集計結果の提示確認に使う。
function containsNumber(text) {
  return /\d/.test(String(text ?? ""));
}

/**
 * rows等のネストした構造（配列/オブジェクト）から有限数を再帰収集する。
 * 数値文字列（"12,345" や "49.8%"）も数値として拾う。
 */
export function collectNumbers(value, acc = []) {
  if (value === null || value === undefined) return acc;
  if (typeof value === "number") {
    if (Number.isFinite(value)) acc.push(value);
    return acc;
  }
  if (typeof value === "string") {
    // 文字列中の数値（カンマ区切り・小数・符号）を抽出する。
    const matches = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/g);
    if (matches) {
      for (const m of matches) {
        const n = Number(m);
        if (Number.isFinite(n)) acc.push(n);
      }
    }
    return acc;
  }
  if (Array.isArray(value)) {
    for (const v of value) collectNumbers(v, acc);
    return acc;
  }
  if (typeof value === "object") {
    for (const v of Object.values(value)) collectNumbers(v, acc);
  }
  return acc;
}

// numbers のいずれかが target±tol に入るか。計算結果の正しさ照合に使う。
export function approxIncludes(numbers, target, tol) {
  return numbers.some((n) => Math.abs(n - target) <= tol);
}

/**
 * シナリオ一覧。e-Stat 依存（取得系）と、保存済みデータセット依存（集計系）を分離している。
 *
 * - e-Stat依存（`prompt` を持つ）: search/fetch を実際に呼ぶため e-Stat の稼働が前提。
 * - データセット依存（`requiresDataset:true` と `buildPrompt(datasetId)` を持つ）: 取得テストで
 *   保存済み（IndexedDB永続）のデータセットを対象に実行するため、e-Stat に依存しない。App側が
 *   対象 datasetId を解決して buildPrompt へ渡す。
 *
 * 共通: `expect.tools` は順序付き部分列、`expect.status` は runAgent の終了状態、
 * `expect.custom(ctx)` は { ok, detail } を返す追加判定。
 * ctx の形: { toolCalls: [{name, input}], result: {status, content}, analyses, datasets }
 */
export const SCENARIOS = [
  {
    id: "claude-ping",
    title: "Claude API 疎通確認",
    description:
      "ツールを使わずcallClaudeへ最小リクエストを送り、APIキー・接続が有効か",
    // directPing: runAgent/ツールを通さず callClaude を直接叩く軽量チェック（App側で分岐）。
    directPing: true,
    expect: {
      tools: [],
      status: "completed",
      custom: (ctx) => {
        const text = String(ctx.result?.content ?? "").trim();
        const ok = text.length > 0;
        return {
          ok,
          detail: ok ? `応答受信: ${text.slice(0, 40)}` : "応答テキストが空",
        };
      },
    },
  },
  {
    id: "estat-ping",
    title: "e-Stat API 疎通確認",
    description:
      "ツールを使わずe-Stat APIへ最小リクエストを送り、サーバー稼働・接続が有効か",
    // estatPing: runAgent/Claudeを通さず searchStatsTables を直接叩く軽量チェック（App側で分岐）。
    estatPing: true,
    expect: {
      tools: [],
      status: "completed",
      custom: (ctx) => {
        const count = ctx.result?.tableCount;
        const ok = typeof count === "number";
        return {
          ok,
          detail: ok
            ? `応答受信: 検索ヒット${ctx.result?.totalCount ?? "?"}件`
            : "e-Stat応答なし",
        };
      },
    },
  },
  {
    id: "search-only",
    title: "検索のみ",
    description: "統計表の検索でsearch_stats_tablesを選べるか",
    requiresDataset: false,
    prompt:
      "コーヒーの輸入に関する貿易統計の統計表を検索してください。データ取得まではせず、候補の統計表を一覧で教えてください。",
    expect: {
      tools: ["search_stats_tables"],
      status: "completed",
    },
  },
  {
    id: "fetch-dataset",
    title: "データ取得",
    description:
      "検索→メタ確認→取得でデータセットをブラウザへ保存できるか（e-Stat依存）",
    requiresDataset: false,
    prompt:
      "2023年のコーヒー（HS0901）の輸入について、相手国別の輸入額データをe-Statから取得してデータセットに保存してください。取得・保存までで止め、集計や分析（analyze_dataset等）はしないでください。",
    expect: {
      tools: [
        "search_stats_tables",
        "get_stats_metadata",
        "fetch_stats_data",
      ],
      status: "completed",
      custom: (ctx) => {
        // 取得テストの主目的は「本番同様にデータセットが保存されたか」。
        const saved = ctx.datasets.find((d) => d.available && d.recordCount > 0);
        return {
          ok: Boolean(saved),
          detail: saved
            ? `保存データセット=${saved.id}（${saved.recordCount}件）`
            : "保存されたデータセットなし",
        };
      },
    },
  },
  {
    id: "fixed-aggregate",
    title: "固定集計（保存データ利用）",
    description:
      "保存済みデータセットにanalyze_datasetで集計できるか（e-Stat非依存）",
    requiresDataset: true,
    buildPrompt: (datasetId) =>
      `すでにブラウザへ保存済みのデータセット「${datasetId}」を対象に分析します。新しいデータ取得（fetch_stats_data）は行わないでください。まず必要なら inspect_dataset で列を確認し、analyze_datasetを使って主要な数値列（輸入額など）の相手国別の合計と上位ランキングを集計し、結果の要点を数値とともに要約してください。`,
    expect: {
      tools: ["analyze_dataset"],
      status: "completed",
      custom: (ctx) => {
        const fixed = ctx.analyses.find((a) => a.kind === "fixed");
        const hasAnalysisId = Boolean(fixed?.id);
        const hasNumber = containsNumber(ctx.result?.content);
        // 取得をやり直していない（e-Stat非依存で動けている）ことも確認する。
        const noFetch = !ctx.toolCalls.some((c) => c.name === "fetch_stats_data");
        return {
          ok: hasAnalysisId && hasNumber && noFetch,
          detail: `固定分析ログ=${hasAnalysisId ? fixed.id : "なし"} / 回答に数値=${hasNumber} / 再取得なし=${noFetch}`,
        };
      },
    },
  },
  {
    id: "javascript-analysis",
    title: "高度分析(JS実行・保存データ利用)",
    description:
      "保存済みデータセットにexecute_analysis_javascriptで集計できるか（e-Stat非依存）",
    requiresDataset: true,
    buildPrompt: (datasetId) =>
      `すでにブラウザへ保存済みのデータセット「${datasetId}」を対象に分析します。新しいデータ取得（fetch_stats_data）は行わないでください。固定ツールにない集計として、相手国別の輸入額が全体に占める構成比（パーセント）を、execute_analysis_javascriptで計算してください。`,
    expect: {
      tools: ["execute_analysis_javascript"],
      status: "completed",
      custom: (ctx) => {
        const js = ctx.analyses.find((a) => a.kind === "javascript");
        const okJs = Boolean(js) && js.status === "success";
        const noFetch = !ctx.toolCalls.some((c) => c.name === "fetch_stats_data");
        return {
          ok: okJs && noFetch,
          detail: js
            ? `JS実行ログ=${js.id} / status=${js.status} / 再取得なし=${noFetch}`
            : "JS実行ログなし",
        };
      },
    },
  },
  {
    id: "fixed-aggregate-builtin",
    title: "固定集計（内蔵データ）",
    description:
      "保存データもe-Statも使わず、内蔵の既知データでanalyze_datasetの計算が正しいか",
    // seedDataset を持つシナリオは実行前にこのデータをストアへ一時投入し、終了後に削除する。
    seedDataset: buildCoffeeFixtureDataset(),
    buildPrompt: (datasetId) =>
      `すでにブラウザへ保存済みのデータセット「${datasetId}」（コーヒー輸入額・相手国別・2022年と2023年）を分析します。新しいデータ取得（fetch_stats_data）は行わないでください。analyze_datasetを使って、2022年と2023年を合算した相手国別の輸入額合計を求め、合計が大きい上位3か国を金額とともに答えてください。`,
    expect: {
      tools: ["analyze_dataset"],
      status: "completed",
      custom: (ctx) => {
        const fixed = ctx.analyses.find((a) => a.kind === "fixed");
        const noFetch = !ctx.toolCalls.some((c) => c.name === "fetch_stats_data");
        // 既知の正解：全期間合計の首位は 220000（ブラジル）。分析ログのrowsに含まれるか。
        const numbers = fixed ? collectNumbers(fixed.rows) : [];
        const hasTop = approxIncludes(numbers, EXPECTED_TOTAL_TOP_VALUE, 1);
        return {
          ok: Boolean(fixed) && noFetch && hasTop,
          detail: fixed
            ? `固定分析ログ=${fixed.id} / 首位${EXPECTED_TOTAL_TOP_VALUE}検出=${hasTop} / 再取得なし=${noFetch}`
            : "固定分析ログなし",
        };
      },
    },
  },
  {
    id: "javascript-analysis-builtin",
    title: "高度分析（内蔵データ・複雑JS）",
    description:
      "保存データもe-Statも使わず、複雑な多段JS分析をエージェントが正しく実行できるか",
    seedDataset: buildCoffeeFixtureDataset(),
    buildPrompt: (datasetId) =>
      `すでにブラウザへ保存済みのデータセット「${datasetId}」（コーヒー輸入額・相手国別・2022年と2023年）を分析します。新しいデータ取得（fetch_stats_data）は行わないでください。execute_analysis_javascriptを使い、次の手順で計算してください：(1)各相手国について2022年から2023年への輸入額の成長率(%)＝(2023-2022)/2022×100 を求める、(2)成長率が高い上位3か国を選ぶ、(3)その3か国の2023年の輸入額を重みとして、成長率の加重平均(%)を計算する。最終的な加重平均成長率(%)を数値で答えてください。`,
    expect: {
      tools: ["execute_analysis_javascript"],
      status: "completed",
      custom: (ctx) => {
        const js = ctx.analyses.find((a) => a.kind === "javascript");
        const okJs = Boolean(js) && js.status === "success";
        const noFetch = !ctx.toolCalls.some((c) => c.name === "fetch_stats_data");
        // 既知の正解 ≈ 49.76%。分析ログのrows、無ければ最終回答テキストから許容±0.3で照合。
        const numbers = js
          ? collectNumbers(js.rows).concat(collectNumbers(ctx.result?.content))
          : [];
        const hasValue = approxIncludes(numbers, EXPECTED_WEIGHTED_GROWTH, 0.3);
        return {
          ok: okJs && noFetch && hasValue,
          detail: js
            ? `JS実行ログ=${js.id} / status=${js.status} / ≈${EXPECTED_WEIGHTED_GROWTH.toFixed(2)}検出=${hasValue} / 再取得なし=${noFetch}`
            : "JS実行ログなし",
        };
      },
    },
  },
];

/**
 * シナリオのプロンプト文を解決する。buildPrompt を持つもの（requiresDataset / seedDataset）は
 * 対象 datasetId を差し込み、それ以外は固定の prompt を返す。
 */
export function resolvePrompt(scenario, datasetId) {
  if (typeof scenario.buildPrompt === "function") {
    return scenario.buildPrompt(datasetId);
  }
  return scenario.prompt;
}

/**
 * 実行結果(ctx)をシナリオの期待値で判定し、{ pass, checks } を返す。
 * checks は個別チェックの配列で、UI側でそのまま内訳表示できる。
 */
export function evaluateScenario(scenario, ctx) {
  const actualTools = ctx.toolCalls.map((call) => call.name);
  const checks = [];

  // 1. 期待ツール列が部分列として現れるか
  const toolsOk = isSubsequence(scenario.expect.tools, actualTools);
  checks.push({
    label: "ツール呼び出し順",
    ok: toolsOk,
    detail: `期待(部分列): [${scenario.expect.tools.join(" → ")}] / 実際: [${
      actualTools.join(" → ") || "なし"
    }]`,
  });

  // 2. 終了状態
  if (scenario.expect.status) {
    const statusOk = ctx.result?.status === scenario.expect.status;
    checks.push({
      label: "終了状態",
      ok: statusOk,
      detail: `期待=${scenario.expect.status} / 実際=${ctx.result?.status ?? "不明"}`,
    });
  }

  // 3. 追加判定
  if (typeof scenario.expect.custom === "function") {
    const custom = scenario.expect.custom(ctx);
    checks.push({
      label: "追加判定",
      ok: Boolean(custom?.ok),
      detail: custom?.detail ?? "",
    });
  }

  return { pass: checks.every((c) => c.ok), checks };
}
