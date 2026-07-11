import { hashCode, inspectCode } from "./code-guard.js";

// 既定の制限値（plan.md §7.2）。
const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_MAX_INPUT_RECORDS = 200000;
const DEFAULT_MAX_OUTPUT_BYTES = 1_000_000;

// 既定のWorker生成。Viteがanalysis-worker.jsを別バンドルとして解決する。
function defaultCreateWorker() {
  return new Worker(new URL("./analysis-worker.js", import.meta.url), {
    type: "module",
  });
}

// 文字列のバイト数（UTF-8）。TextEncoderはブラウザ/Node双方で利用可能。
function byteLength(text) {
  return new TextEncoder().encode(text).length;
}

// 値がJSON互換か（関数・undefined・循環を排除）を検証しつつ正規化する。
function toJsonCompatible(value) {
  // JSON.stringifyは関数/undefinedを落とし、循環で例外を投げる。
  // 例外はそのまま呼び出し側でerror扱いにする。
  return JSON.parse(JSON.stringify(value ?? null));
}

/**
 * 生成JavaScriptを使い捨てWorkerで実行し、構造化された分析ログを返す。
 * Worker生成・タイマーは注入可能（テストではfake worizerを渡す）。
 *
 * @returns {{kind, datasetId, code, codeHash, parameters, resultColumns, rows,
 *   warnings, durationMs, status, computedAt, error?}}
 */
export async function runAnalysisCode(
  { code, dataset, datasets = {}, args = {}, now },
  {
    createWorker = defaultCreateWorker,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxInputRecords = DEFAULT_MAX_INPUT_RECORDS,
    maxOutputBytes = DEFAULT_MAX_OUTPUT_BYTES,
    setTimeoutFn = globalThis.setTimeout.bind(globalThis),
    clearTimeoutFn = globalThis.clearTimeout.bind(globalThis),
    nowFn = () => Date.now(),
  } = {},
) {
  const computedAt = now ?? new Date().toISOString();
  const codeHash = hashCode(code);
  const base = {
    kind: "javascript",
    datasetId: dataset?.id ?? null,
    code,
    codeHash,
    parameters: {
      args,
      ...(Object.keys(datasets).length > 0
        ? { datasetIds: Object.keys(datasets) }
        : {}),
    },
    resultColumns: [],
    rows: [],
    warnings: [],
    computedAt,
  };

  // 1. 実行前検査（誤操作の早期検出）。
  const guard = inspectCode(code);
  if (!guard.ok) {
    return {
      ...base,
      status: "rejected",
      durationMs: 0,
      error: `禁止された参照を検出しました: ${guard.reasons.join(", ")}`,
    };
  }

  // 2. 入力件数の上限。
  const records = dataset?.records ?? [];
  const datasetEntries = Object.entries(datasets);
  const totalInputRecords =
    datasetEntries.length > 0
      ? datasetEntries.reduce(
          (sum, [, item]) => sum + (item?.records?.length ?? 0),
          0,
        )
      : records.length;

  if (totalInputRecords > maxInputRecords) {
    return {
      ...base,
      status: "rejected",
      durationMs: 0,
      error: `入力レコードが上限(${maxInputRecords})を超えています: ${totalInputRecords}`,
    };
  }

  const toWorkerDataset = (item) => ({
    records: item?.records ?? [],
    columns: item?.columns ?? [],
    metadata: {
      datasetId: item?.id ?? null,
      statsDataId: item?.statsDataId ?? null,
      title: item?.title ?? null,
      filters: item?.filters ?? {},
      measures: item?.measures ?? [],
    },
  });

  const input = {
    records,
    columns: dataset?.columns ?? [],
    metadata: {
      datasetId: dataset?.id ?? null,
      statsDataId: dataset?.statsDataId ?? null,
      title: dataset?.title ?? null,
      filters: dataset?.filters ?? {},
      measures: dataset?.measures ?? [],
    },
    ...(datasetEntries.length > 0
      ? {
          datasets: Object.fromEntries(
            datasetEntries.map(([id, item]) => [id, toWorkerDataset(item)]),
          ),
        }
      : {}),
    args,
  };

  // 3. Workerで実行（完了/失敗/タイムアウトのいずれでもterminate）。
  const worker = createWorker();
  const start = nowFn();
  let timer;

  const settle = await new Promise((resolve) => {
    timer = setTimeoutFn(() => {
      resolve({ ok: false, timeout: true });
    }, timeoutMs);

    worker.onmessage = (event) => resolve(event.data);
    worker.onerror = (event) =>
      resolve({ ok: false, error: event?.message ?? "Worker error" });

    try {
      worker.postMessage({ code, input });
    } catch (error) {
      resolve({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  clearTimeoutFn(timer);
  try {
    worker.terminate();
  } catch {
    // terminate失敗は無視する。
  }

  const durationMs = Math.max(0, Math.round(nowFn() - start));

  // 4. 結果の判定。
  if (settle?.timeout) {
    return {
      ...base,
      status: "timeout",
      durationMs,
      error: `実行が${timeoutMs}msのタイムアウトに達しました`,
    };
  }
  if (!settle?.ok) {
    return {
      ...base,
      status: "error",
      durationMs,
      error: settle?.error ?? "不明なエラー",
    };
  }

  // 5. 出力のJSON互換性とサイズを検証する。
  let normalized;
  try {
    normalized = toJsonCompatible(settle.result);
  } catch {
    return {
      ...base,
      status: "error",
      durationMs,
      error: "結果がJSON互換ではありません（関数や循環参照は返せません）",
    };
  }

  const serialized = JSON.stringify(normalized ?? null);
  if (byteLength(serialized) > maxOutputBytes) {
    return {
      ...base,
      status: "error",
      durationMs,
      error: `出力が上限(${maxOutputBytes}バイト)を超えています`,
    };
  }

  const resultColumns = Array.isArray(normalized?.columns)
    ? normalized.columns
    : [];
  const rows = Array.isArray(normalized?.rows) ? normalized.rows : [];
  const warnings = Array.isArray(normalized?.notes) ? normalized.notes : [];

  return {
    ...base,
    status: "success",
    durationMs,
    resultColumns,
    rows,
    warnings,
  };
}
