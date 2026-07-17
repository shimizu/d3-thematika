/**
 * コロプレス図（階級区分図）の統合ヘルパー
 * 分級・配色・レイヤー・凡例の組み立てを1回の呼び出しにまとめる。
 */
import { GeojsonLayer } from '../layers/geo/geojson-layer';
import { LegendLayer, LegendLayerOptions } from '../layers/utils/legend-layer';
import { ClassificationMethod, ClassifyResult } from './classification';
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
export declare function choropleth(options: ChoroplethOptions): ChoroplethResult;
