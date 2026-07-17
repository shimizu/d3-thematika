/**
 * 分級（データ分類）ユーティリティ
 * コロプレス図などの階級区分に使用する境界値を計算する。
 * 結果の thresholds は d3.scaleThreshold() の domain にそのまま渡せる。
 */
/**
 * 分級手法
 * - jenks: 自然分類（Jenks natural breaks）。データの自然なまとまりで区切る
 * - equalInterval: 等間隔分類。値域を等分する
 * - quantile: 等量分類。各階級のデータ数が等しくなるように区切る
 * - stdDev: 標準偏差分類。平均を中心に1標準偏差ごとに区切る
 */
export type ClassificationMethod = 'jenks' | 'equalInterval' | 'quantile' | 'stdDev';
/**
 * 分級結果
 */
export interface ClassifyResult {
    /** 全境界値（最小値と最大値を含む、原則 classes+1 個） */
    breaks: number[];
    /** 内側の境界値（d3.scaleThreshold の domain 用、原則 classes-1 個） */
    thresholds: number[];
    /** 実際の階級数（同値が多いデータでは要求より少なくなることがある） */
    classes: number;
    /** 使用した分級手法 */
    method: ClassificationMethod;
}
/**
 * 数値データを指定した手法で分級し、境界値を計算します。
 *
 * @param values - 分級対象の数値配列（NaN や Infinity は無視される）
 * @param classes - 階級数（2以上）
 * @param method - 分級手法（デフォルト: 'jenks'）
 * @returns 分級結果。thresholds は d3.scaleThreshold の domain にそのまま渡せる
 *
 * @example
 * ```typescript
 * const values = features.map(f => f.properties.population);
 * const { thresholds } = classify(values, 5, 'jenks');
 * const color = d3.scaleThreshold<number, string>()
 *   .domain(thresholds)
 *   .range(d3.schemeBlues[5]);
 * ```
 */
export declare function classify(values: number[], classes: number, method?: ClassificationMethod): ClassifyResult;
