/**
 * タイル関連のユーティリティ関数
 * Web地図タイル（ラスタタイル、ベクタータイル）の座標計算とURL生成を行う
 */
import { TileCoordinate, TileBounds, TileUrlInfo, TileGenerationOptions } from '../types';
/**
 * 地理座標（経度、緯度）からタイル座標（x, y, z）を計算します
 * Web Mercator投影法（EPSG:3857）を使用
 *
 * @param longitude - 経度（度）
 * @param latitude - 緯度（度）
 * @param zoom - ズームレベル
 * @returns タイル座標
 *
 * @example
 * ```typescript
 * const tile = getTileXYZ(139.6917, 35.6895, 10); // 東京駅
 * console.log(tile); // { x: 909, y: 404, z: 10 }
 * ```
 */
export declare function getTileXYZ(longitude: number, latitude: number, zoom: number): TileCoordinate;
/**
 * タイル座標から地理的境界（bounding box）を計算します
 *
 * @param x - タイルのX座標
 * @param y - タイルのY座標
 * @param z - ズームレベル
 * @returns タイルの地理的境界
 *
 * @example
 * ```typescript
 * const bounds = getTileBounds(909, 404, 10);
 * console.log(bounds.bounds); // [139.65, 35.68, 139.74, 35.74]
 * ```
 */
export declare function getTileBounds(x: number, y: number, z: number): TileBounds;
/**
 * 指定された地理的範囲に必要なタイルのURL一覧を生成します
 *
 * @param bounds - 地理的範囲 [west, south, east, north]
 * @param zoom - ズームレベル
 * @param options - タイル生成オプション
 * @returns タイルURL情報の配列
 *
 * @example
 * ```typescript
 * const tiles = generateTileUrls(
 *   [139.5, 35.5, 140.0, 36.0], // 東京周辺
 *   10,
 *   { urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png' }
 * );
 * ```
 */
export declare function generateTileUrls(bounds: [number, number, number, number], zoom: number, options: TileGenerationOptions): TileUrlInfo[];
/**
 * 指定された地理的範囲と表示サイズに最適なズームレベルを計算します
 *
 * @param bounds - 地理的範囲 [west, south, east, north]
 * @param mapWidth - 地図の表示幅（ピクセル）
 * @param mapHeight - 地図の表示高さ（ピクセル）
 * @param options - 計算オプション
 * @returns 最適なズームレベル
 *
 * @example
 * ```typescript
 * const zoom = calculateOptimalZoom([139.5, 35.5, 140.0, 36.0], 800, 600);
 * console.log(zoom); // 9
 * ```
 */
export declare function calculateOptimalZoom(bounds: [number, number, number, number], mapWidth: number, mapHeight: number, options?: {
    minZoom?: number;
    maxZoom?: number;
    tileSize?: number;
}): number;
/**
 * ズームレベルでの解像度（メートル/ピクセル）を計算します
 *
 * @param zoom - ズームレベル
 * @param latitude - 緯度（解像度は緯度により変動）
 * @param tileSize - タイルサイズ（ピクセル、デフォルト: 256）
 * @returns 解像度（メートル/ピクセル）
 *
 * @example
 * ```typescript
 * const resolution = getResolution(10, 35.6895); // 東京の緯度
 * console.log(resolution); // 約152.87メートル/ピクセル
 * ```
 */
export declare function getResolution(zoom: number, latitude?: number, tileSize?: number): number;
/**
 * 指定されたタイル座標が有効な範囲内にあるかチェックします
 *
 * @param x - タイルのX座標
 * @param y - タイルのY座標
 * @param z - ズームレベル
 * @returns 有効な場合はtrue
 *
 * @example
 * ```typescript
 * const isValid = isValidTileCoordinate(909, 404, 10);
 * console.log(isValid); // true
 * ```
 */
export declare function isValidTileCoordinate(x: number, y: number, z: number): boolean;
