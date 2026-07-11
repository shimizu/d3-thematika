import {
  distinctValues,
  groupAverage,
  groupSum,
  ranking,
  summary,
  validateMeasure,
  yearOverYear,
} from "./operations.js";

// operation名 → 純粋関数のディスパッチ表。新しい操作はここへ追加する。
const OPERATIONS = {
  summary,
  group_sum: groupSum,
  group_average: groupAverage,
  ranking,
  year_over_year: yearOverYear,
  distinct: distinctValues,
  validate_measure: validateMeasure,
};

export const SUPPORTED_OPERATIONS = Object.keys(OPERATIONS);

/**
 * データセットのレコードに対して固定分析を実行し、plan.md §6 の形へ整える。
 * analysisId / datasetId は呼び出し側（ツール/ストア）が付与する。
 *
 * @param {object} args
 * @param {Array<object>} args.records 全レコード
 * @param {string} args.operation 操作名（SUPPORTED_OPERATIONS のいずれか）
 * @param {object} [args.parameters] 操作ごとのパラメータ
 * @param {string} [args.now] computedAt に使うISO文字列（テスト用に注入可能）
 * @returns {{operation, sourceRecordCount, parameters, resultColumns, rows, warnings, computedAt}}
 */
export function runAnalysis({ records, operation, parameters = {}, now } = {}) {
  const fn = OPERATIONS[operation];
  if (!fn) {
    throw new Error(
      `未対応の操作です: ${operation}（対応: ${SUPPORTED_OPERATIONS.join(", ")}）`,
    );
  }
  if (!Array.isArray(records)) {
    throw new Error("recordsが配列ではありません");
  }

  const { resultColumns, rows, warnings } = fn(records, parameters);

  return {
    operation,
    sourceRecordCount: records.length,
    parameters,
    resultColumns,
    rows,
    warnings,
    computedAt: now ?? new Date().toISOString(),
  };
}
