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
/**
 * サンプルのLineStringデータを生成
 */
export declare function generateSampleLines(count?: number): GeoJSON.FeatureCollection;
/**
 * サンプルのMultiLineStringデータを生成
 */
export declare function generateSampleMultiLines(count?: number): GeoJSON.FeatureCollection;
/**
 * 接続関係を持つLineStringデータを生成（エッジバンドリング用）
 */
export declare function generateConnectionLines(): GeoJSON.FeatureCollection;
