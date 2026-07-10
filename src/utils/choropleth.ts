/**
 * コロプレス図（階級区分図）の統合ヘルパー
 * 分級・配色・レイヤー・凡例の組み立てを1回の呼び出しにまとめる。
 */

import { scaleThreshold } from 'd3-scale';
import { GeojsonLayer } from '../layers/geo/geojson-layer';
import { LegendLayer, LegendLayerOptions } from '../layers/utils/legend-layer';
import { classify, ClassificationMethod, ClassifyResult } from './classification';
import { AllPalettes, generateOptimizedPalette } from './color-palette';
import { LayerAttr, LayerStyle } from '../types';

/**
 * choroplethのオプション
 */
export interface ChoroplethOptions {
  /** GeoJSONデータ */
  data: GeoJSON.FeatureCollection | GeoJSON.Feature[];
  /** 値のアクセサ。プロパティ名または関数 */
  value: string | ((feature: GeoJSON.Feature) => number);
  /** パレット名（AllPalettesのキー。例: 'Blues', 'YlOrRd', 'Viridis'）。デフォルト: 'YlOrRd' */
  palette?: string;
  /** 色配列の直接指定（paletteより優先） */
  colors?: string[];
  /** 階級数（デフォルト: 5） */
  classes?: number;
  /** 分級手法（デフォルト: 'jenks'） */
  method?: ClassificationMethod;
  /** 値が取得できないフィーチャーの塗り色（デフォルト: '#cccccc'） */
  noDataColor?: string;
  /** GeojsonLayerへ渡す追加のattr（fillは分級結果で上書きされる） */
  attr?: LayerAttr;
  /** GeojsonLayerへ渡すstyle */
  style?: LayerStyle;
  /** 凡例の設定。falseで凡例を作らない。LegendLayerOptionsの部分指定で上書き可 */
  legend?: false | Partial<Omit<LegendLayerOptions, 'scale'>>;
}

/**
 * choroplethの結果
 */
export interface ChoroplethResult {
  /** 分級塗り分け済みのGeojsonLayer */
  layer: GeojsonLayer;
  /** 凡例レイヤー（legend: false の場合はnull） */
  legend: LegendLayer | null;
  /** 値→色のthresholdスケール */
  scale: (value: number) => string;
  /** 分級結果（境界値など） */
  classification: ClassifyResult;
  /** 使用した色配列 */
  colors: string[];
}

/**
 * コロプレス図（階級区分図）のレイヤー一式を生成します。
 * 分級（classify）→ 配色（カラーパレット）→ GeojsonLayer → LegendLayer の
 * 組み立てを1回の呼び出しで行う。
 *
 * @param options - コロプレスの設定
 * @returns レイヤー・凡例・スケール・分級結果
 *
 * @example
 * ```javascript
 * const { layer, legend } = Thematika.choropleth({
 *   data: geojson,
 *   value: 'POP_EST',          // プロパティ名または (f) => f.properties.POP_EST
 *   palette: 'Blues',
 *   classes: 5,
 *   method: 'jenks',
 *   legend: { title: '人口', position: { top: 20, left: 20 } }
 * });
 * map.addLayer('choropleth', layer);
 * map.addLayer('legend', legend);
 * ```
 */
export function choropleth(options: ChoroplethOptions): ChoroplethResult {
  const classes = options.classes ?? 5;
  const method = options.method ?? 'jenks';
  const noDataColor = options.noDataColor ?? '#cccccc';

  // 値アクセサを正規化
  const accessor: (feature: GeoJSON.Feature) => number =
    typeof options.value === 'string'
      ? (f) => f.properties?.[options.value as string] as number
      : options.value;

  const features = Array.isArray(options.data) ? options.data : options.data.features;
  const values = features.map(accessor);

  // 分級
  const classification = classify(values, classes, method);
  const classCount = classification.classes;

  // 配色
  let colors: string[];
  if (options.colors) {
    colors = options.colors.slice(0, classCount);
  } else {
    const paletteName = options.palette ?? 'YlOrRd';
    const palette = AllPalettes[paletteName];
    if (!palette) {
      throw new Error(
        `[thematika] choropleth: パレット "${paletteName}" は存在しません。利用可能: ${Object.keys(AllPalettes).join(', ')}`
      );
    }
    colors = generateOptimizedPalette(palette, classCount);
  }

  if (colors.length < classCount) {
    console.warn(
      `[thematika] choropleth: 色数(${colors.length})が階級数(${classCount})より少ないため、階級数を切り詰めます。`
    );
  }

  // 値→色のthresholdスケール
  const scale = scaleThreshold<number, string>()
    .domain(classification.thresholds)
    .range(colors);

  // レイヤーを生成（fillは分級結果、その他はユーザーattrを尊重）
  const layer = new GeojsonLayer({
    data: options.data,
    attr: {
      stroke: '#ffffff',
      'stroke-width': 0.5,
      ...options.attr,
      fill: (d: GeoJSON.Feature) => {
        const v = accessor(d);
        return typeof v === 'number' && isFinite(v) ? scale(v) : noDataColor;
      }
    },
    style: options.style
  });

  // 凡例を生成
  let legend: LegendLayer | null = null;
  if (options.legend !== false) {
    legend = new LegendLayer({
      scale: scale as any,
      position: { top: 20, left: 20 },
      enableDrag: false,
      ...options.legend
    });
  }

  return { layer, legend, scale, classification, colors };
}
