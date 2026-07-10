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
 * 数値配列から有効な値（有限数値）だけを昇順で取り出します
 * @param values - 入力値の配列
 * @returns 昇順ソート済みの有効値配列
 */
function sortedFiniteValues(values: number[]): number[] {
  return values.filter((v) => typeof v === 'number' && isFinite(v)).sort((a, b) => a - b);
}

/**
 * 等間隔分類の境界値を計算します
 */
function equalIntervalBreaks(sorted: number[], classes: number): number[] {
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const step = (max - min) / classes;
  const breaks: number[] = [];
  for (let i = 0; i <= classes; i++) {
    breaks.push(min + step * i);
  }
  return breaks;
}

/**
 * 等量分類（quantile）の境界値を計算します（R-7方式の分位数）
 */
function quantileBreaks(sorted: number[], classes: number): number[] {
  const n = sorted.length;
  const breaks: number[] = [];
  for (let i = 0; i <= classes; i++) {
    const p = i / classes;
    const pos = p * (n - 1);
    const lower = Math.floor(pos);
    const upper = Math.ceil(pos);
    const t = pos - lower;
    breaks.push(sorted[lower] * (1 - t) + sorted[upper] * t);
  }
  return breaks;
}

/**
 * 標準偏差分類の境界値を計算します。
 * 平均を中心に1標準偏差間隔で内側境界を置き、両端は最小値・最大値まで広げる。
 */
function stdDevBreaks(sorted: number[], classes: number): number[] {
  const n = sorted.length;
  const mean = sorted.reduce((a, b) => a + b, 0) / n;
  const variance = sorted.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
  const sd = Math.sqrt(variance);
  const min = sorted[0];
  const max = sorted[n - 1];

  const inner: number[] = [];
  for (let i = 1; i < classes; i++) {
    inner.push(mean + (i - classes / 2) * sd);
  }
  return [min, ...inner, max];
}

/**
 * Jenks natural breaks（自然分類）の境界値を計算します。
 * クラス内分散の合計を最小化する動的計画法（Fisher-Jenks）による実装。
 * 計算量は O(classes × n^2)。コロプレス図で扱う数百件程度のデータを想定。
 */
function jenksBreaks(sorted: number[], classes: number): number[] {
  const n = sorted.length;

  // lowerClassLimits[i][j]: 先頭i個をjクラスに分けるときの最後のクラスの開始位置
  // varianceCombinations[i][j]: そのときのクラス内分散合計の最小値
  const lowerClassLimits: number[][] = [];
  const varianceCombinations: number[][] = [];

  for (let i = 0; i <= n; i++) {
    lowerClassLimits.push(new Array(classes + 1).fill(0));
    varianceCombinations.push(new Array(classes + 1).fill(0));
  }
  for (let j = 1; j <= classes; j++) {
    lowerClassLimits[1][j] = 1;
    varianceCombinations[1][j] = 0;
    for (let i = 2; i <= n; i++) {
      varianceCombinations[i][j] = Infinity;
    }
  }

  for (let l = 2; l <= n; l++) {
    let sum = 0;
    let sumSquares = 0;
    let w = 0;

    // m は最後のクラスに含める要素数（後ろから積み上げる）
    for (let m = 1; m <= l; m++) {
      const idx = l - m; // 最後のクラスの開始インデックス（0-based）
      const val = sorted[idx];

      w++;
      sum += val;
      sumSquares += val * val;
      const variance = sumSquares - (sum * sum) / w;

      if (idx !== 0) {
        for (let j = 2; j <= classes; j++) {
          const candidate = variance + varianceCombinations[idx][j - 1];
          if (candidate <= varianceCombinations[l][j]) {
            lowerClassLimits[l][j] = idx + 1;
            varianceCombinations[l][j] = candidate;
          }
        }
      }
    }

    lowerClassLimits[l][1] = 1;
    varianceCombinations[l][1] = sumSquares - (sum * sum) / w;
  }

  // 境界値を復元
  const breaks: number[] = new Array(classes + 1);
  breaks[classes] = sorted[n - 1];
  breaks[0] = sorted[0];

  let k = n;
  for (let j = classes; j >= 2; j--) {
    const boundaryIdx = lowerClassLimits[k][j] - 1; // 最後のクラスの開始位置（0-based）
    breaks[j - 1] = sorted[boundaryIdx];
    k = boundaryIdx;
  }

  return breaks;
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
export function classify(
  values: number[],
  classes: number,
  method: ClassificationMethod = 'jenks'
): ClassifyResult {
  const sorted = sortedFiniteValues(values);

  if (sorted.length === 0) {
    throw new Error('[thematika] classify: 有効な数値が1つもありません。');
  }
  if (!Number.isInteger(classes) || classes < 2) {
    throw new Error(`[thematika] classify: 階級数は2以上の整数を指定してください（指定値: ${classes}）。`);
  }

  // データの種類数が階級数より少ない場合は階級数を切り詰める
  const uniqueCount = new Set(sorted).size;
  const effectiveClasses = Math.min(classes, uniqueCount);

  let breaks: number[];
  if (effectiveClasses < 2) {
    breaks = [sorted[0], sorted[sorted.length - 1]];
  } else {
    switch (method) {
      case 'equalInterval':
        breaks = equalIntervalBreaks(sorted, effectiveClasses);
        break;
      case 'quantile':
        breaks = quantileBreaks(sorted, effectiveClasses);
        break;
      case 'stdDev':
        breaks = stdDevBreaks(sorted, effectiveClasses);
        break;
      case 'jenks':
        breaks = jenksBreaks(sorted, effectiveClasses);
        break;
      default:
        throw new Error(`[thematika] classify: 未対応の分級手法です: ${method}`);
    }
  }

  // 同値の境界を除去（scaleThreshold の domain は昇順・重複なしが必要）。
  // 境界は「次の階級の下限」（x >= t で上の階級）として扱うため、
  // 最大値と等しい境界は有効（最上位階級が最大値のみになるケース）。
  const min = breaks[0];
  const max = breaks[breaks.length - 1];
  const thresholds = Array.from(new Set(breaks.slice(1, -1)))
    .filter((t) => t > min && t <= max)
    .sort((a, b) => a - b);

  return {
    breaks,
    thresholds,
    classes: thresholds.length + 1,
    method
  };
}
