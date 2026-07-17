/**
 * スケール関連のユーティリティ
 */
/**
 * createProportionalScaleのオプション
 */
export interface ProportionalScaleOptions {
    /** 最大半径（ピクセル、デフォルト: 30） */
    maxRadius?: number;
    /** 最小半径（ピクセル、デフォルト: 1）。0にすると最小値が見えなくなる */
    minRadius?: number;
    /** スケールの下限値（デフォルト: 0）。面積の視覚比較を保つため0基準を推奨 */
    minValue?: number;
    /** スケールの上限値（デフォルト: valuesの最大値） */
    maxValue?: number;
}
/**
 * 比例記号（proportional symbol）用の半径スケールを生成します。
 *
 * 円の「面積」が値に比例するよう、半径を値の平方根でスケーリングする。
 * 半径を線形（scaleLinear）でスケーリングすると面積は値の2乗に比例して
 * しまい、大きい値が視覚的に誇張される。この関数はその誤用を防ぐ。
 *
 * @param values - 対象データの数値配列（NaN/Infinityは無視）
 * @param options - スケールのオプション
 * @returns 値を半径（ピクセル）に変換する関数
 *
 * @example
 * ```typescript
 * const values = features.map(f => f.properties.population);
 * const radius = createProportionalScale(values, { maxRadius: 25 });
 *
 * const layer = new PointCircleLayer({
 *   data: features,
 *   r: (feature) => radius(feature.properties.population)
 * });
 * ```
 */
export declare function createProportionalScale(values: number[], options?: ProportionalScaleOptions): (value: number) => number;
