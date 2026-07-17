/**
 * GIS関連のユーティリティ関数
 * GeoJSONデータの解析と計算に特化したユーティリティ集
 */
import type { GeoJSON, FeatureCollection } from 'geojson';
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
 * GeoJSONから中心点を取得する（単純な平均計算）
 * @param geojson - GeoJSONオブジェクト
 * @returns 中心点の座標
 */
export declare function getCentroid(geojson: GeoJSON): Centroid;
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
