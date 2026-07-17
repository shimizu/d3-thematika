/**
 * GIS関連のユーティリティ関数
 * GeoJSONデータの解析と計算に特化したユーティリティ集
 */
import type { GeoJSON, Feature, FeatureCollection } from 'geojson';
/**
 * Bounding Box（境界ボックス）の型定義
 */
export interface BBox {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}
/**
 * 中心点の型定義
 */
export interface Centroid {
    x: number;
    y: number;
}
/**
 * GeoJSONからBounding Boxを取得する
 * @param geojson - GeoJSONオブジェクト
 * @returns Bounding Box
 */
export declare function getBbox(geojson: GeoJSON): BBox;
/**
 * GeoJSONから中心点（経度・緯度）を取得する
 *
 * d3-geoのgeoCentroidによる球面上の重心計算を使用する。
 * ポリゴンは面積加重・ラインは長さ加重のため、頂点密度の偏りに
 * 引きずられず、ラベル配置などに適した中心点が得られる。
 * @param geojson - GeoJSONオブジェクト
 * @returns 中心点の座標（x: 経度, y: 緯度）
 */
export declare function getCentroid(geojson: GeoJSON): Centroid;
/**
 * bbox（境界ボックス）からD3互換のPolygonフィーチャーを生成する。
 *
 * 外側リングはD3が期待する時計回り（CW）順序で生成されるため、
 * projection.fitExtent や GeojsonLayer にそのまま渡せる
 * （CCWだと「全世界」として解釈され描画が壊れる）。
 * インセット地図の範囲枠やfitBoundsの内部処理に使用する。
 *
 * @param bounds - 境界ボックス [west, south, east, north]
 * @returns Polygonフィーチャー
 *
 * @example
 * ```javascript
 * const frame = bboxToPolygon([122, 24, 146, 46]);
 * const frameLayer = new GeojsonLayer({
 *   data: [frame],
 *   attr: { fill: 'none', stroke: '#e11d48', 'stroke-width': 1.5 }
 * });
 * ```
 */
export declare function bboxToPolygon(bounds: [number, number, number, number]): Feature;
/**
 * 複数のGeoJSONをマージする
 * @param geojsons - GeoJSONオブジェクトの配列
 * @returns マージされたFeatureCollection
 */
export declare function merge(geojsons: GeoJSON[]): FeatureCollection;
/**
 * GeoJSONが有効かどうかをチェックする
 * @param geojson - チェックするオブジェクト
 * @returns 有効なGeoJSONかどうか
 */
export declare function isValidGeoJSON(geojson: any): geojson is GeoJSON;
/**
 * Bounding Boxから中心点を計算する
 * @param bbox - Bounding Box
 * @returns 中心点の座標
 */
export declare function getBboxCenter(bbox: BBox): Centroid;
/**
 * Bounding Boxの幅と高さを取得する
 * @param bbox - Bounding Box
 * @returns 幅と高さ
 */
export declare function getBboxDimensions(bbox: BBox): {
    width: number;
    height: number;
};
/**
 * 2つのBounding Boxをマージする
 * @param bbox1 - 1つ目のBounding Box
 * @param bbox2 - 2つ目のBounding Box
 * @returns マージされたBounding Box
 */
export declare function mergeBbox(bbox1: BBox, bbox2: BBox): BBox;
/**
 * Bounding Boxを拡張する
 * @param bbox - Bounding Box
 * @param padding - パディング（割合）
 * @returns 拡張されたBounding Box
 */
export declare function expandBbox(bbox: BBox, padding?: number): BBox;
