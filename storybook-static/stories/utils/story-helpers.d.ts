/**
 * ストーリー用のマップコンテナを作成
 */
export declare function createMapContainer(width?: number, height?: number): HTMLDivElement;
/**
 * サンプルのGeoJSONデータを生成
 */
export declare function generateSamplePoints(count?: number): GeoJSON.FeatureCollection;
/**
 * サンプルの世界地図データを読み込む
 */
export declare function loadWorldData(): Promise<GeoJSON.FeatureCollection>;
/**
 * サンプルのポリゴンデータを生成
 */
export declare function generateSamplePolygons(): GeoJSON.FeatureCollection;
