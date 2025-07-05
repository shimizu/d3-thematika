/**
 * タイル関連のユーティリティ関数
 * Web地図タイル（ラスタタイル、ベクタータイル）の座標計算とURL生成を行う
 */

import { TileCoordinate, TileBounds, TileUrlInfo, TileGenerationOptions } from '../types';

/**
 * Web Mercator投影法におけるタイル計算の定数
 */
const TILE_SIZE = 256;
const EARTH_CIRCUMFERENCE = 40075016.686; // メートル
const EARTH_RADIUS = 6378137; // メートル

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
export function getTileXYZ(longitude: number, latitude: number, zoom: number): TileCoordinate {
  try {
    // 入力値の検証
    if (!isFinite(longitude) || !isFinite(latitude) || !isFinite(zoom)) {
      throw new Error('無効な座標またはズームレベルが指定されました');
    }

    if (longitude < -180 || longitude > 180) {
      throw new Error(`経度は-180から180の範囲で指定してください: ${longitude}`);
    }

    if (latitude < -85.051128779807 || latitude > 85.051128779807) {
      throw new Error(`緯度はWeb Mercator投影法の有効範囲（-85.05〜85.05度）で指定してください: ${latitude}`);
    }

    if (zoom < 0 || zoom > 30) {
      throw new Error(`ズームレベルは0から30の範囲で指定してください: ${zoom}`);
    }

    // ズームレベルでのタイル数
    const tileCount = Math.pow(2, zoom);
    
    // X座標の計算（経度ベース）
    const x = Math.floor((longitude + 180) / 360 * tileCount);
    
    // Y座標の計算（緯度ベース、Web Mercator投影法）
    const latRad = latitude * Math.PI / 180;
    const y = Math.floor(
      (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * tileCount
    );

    return { x, y, z: zoom };
  } catch (error) {
    throw new Error(`タイル座標の計算に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
  }
}

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
export function getTileBounds(x: number, y: number, z: number): TileBounds {
  try {
    // 入力値の検証
    if (!Number.isInteger(x) || !Number.isInteger(y) || !Number.isInteger(z)) {
      throw new Error('タイル座標は整数で指定してください');
    }

    if (z < 0 || z > 30) {
      throw new Error(`ズームレベルは0から30の範囲で指定してください: ${z}`);
    }

    const tileCount = Math.pow(2, z);

    if (x < 0 || x >= tileCount || y < 0 || y >= tileCount) {
      throw new Error(`タイル座標がズームレベル${z}の有効範囲外です: x=${x}, y=${y}`);
    }

    // 西端の経度（左端）
    const west = (x / tileCount) * 360 - 180;
    
    // 東端の経度（右端）
    const east = ((x + 1) / tileCount) * 360 - 180;
    
    // 北端の緯度（上端）- Web Mercator逆変換
    const northLatRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / tileCount)));
    const north = northLatRad * 180 / Math.PI;
    
    // 南端の緯度（下端）- Web Mercator逆変換
    const southLatRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * (y + 1) / tileCount)));
    const south = southLatRad * 180 / Math.PI;

    return {
      west,
      south,
      east,
      north,
      bounds: [west, south, east, north]
    };
  } catch (error) {
    throw new Error(`タイル境界の計算に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
  }
}

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
export function generateTileUrls(
  bounds: [number, number, number, number],
  zoom: number,
  options: TileGenerationOptions
): TileUrlInfo[] {
  try {
    const [west, south, east, north] = bounds;

    // 入力値の検証
    if (!Array.isArray(bounds) || bounds.length !== 4) {
      throw new Error('boundsは[west, south, east, north]の形式で指定してください');
    }

    if (!bounds.every(b => isFinite(b))) {
      throw new Error('boundsの値は有効な数値で指定してください');
    }

    if (west >= east || south >= north) {
      throw new Error('無効な境界が指定されました（west < east, south < northである必要があります）');
    }

    if (!options.urlTemplate || !options.urlTemplate.includes('{x}') || 
        !options.urlTemplate.includes('{y}') || !options.urlTemplate.includes('{z}')) {
      throw new Error('URLテンプレートには{x}, {y}, {z}のプレースホルダーを含める必要があります');
    }

    // デフォルト値の設定
    const minZoom = options.minZoom ?? 0;
    const maxZoom = options.maxZoom ?? 18;
    const clampToBounds = options.clampToBounds ?? true;

    // ズームレベルの検証
    if (zoom < minZoom || zoom > maxZoom) {
      throw new Error(`ズームレベル${zoom}は許可範囲（${minZoom}〜${maxZoom}）外です`);
    }

    // 範囲の各角のタイル座標を計算
    const topLeft = getTileXYZ(west, north, zoom);
    const bottomRight = getTileXYZ(east, south, zoom);

    // タイル範囲を決定
    const minTileX = Math.min(topLeft.x, bottomRight.x);
    const maxTileX = Math.max(topLeft.x, bottomRight.x);
    const minTileY = Math.min(topLeft.y, bottomRight.y);
    const maxTileY = Math.max(topLeft.y, bottomRight.y);

    const tiles: TileUrlInfo[] = [];

    // 指定された範囲の全タイルを生成
    for (let x = minTileX; x <= maxTileX; x++) {
      for (let y = minTileY; y <= maxTileY; y++) {
        try {
          const tileBounds = getTileBounds(x, y, zoom);
          
          // clampToBoundsが有効な場合、指定範囲外のタイルをスキップ
          if (clampToBounds) {
            const tileWest = tileBounds.west;
            const tileEast = tileBounds.east;
            const tileSouth = tileBounds.south;
            const tileNorth = tileBounds.north;
            
            // タイルが指定範囲と重複していない場合はスキップ
            if (tileEast <= west || tileWest >= east || 
                tileNorth <= south || tileSouth >= north) {
              continue;
            }
          }

          // URLテンプレートからURLを生成
          const url = options.urlTemplate
            .replace('{x}', x.toString())
            .replace('{y}', y.toString())
            .replace('{z}', zoom.toString());

          tiles.push({
            coordinate: { x, y, z: zoom },
            url,
            bounds: tileBounds
          });
        } catch (tileError) {
          // 個別のタイルエラーは警告として扱い、処理を続行
          console.warn(`タイル(${x}, ${y}, ${zoom})の生成をスキップしました:`, tileError);
        }
      }
    }

    if (tiles.length === 0) {
      console.warn('指定された範囲に有効なタイルが見つかりませんでした');
    }

    return tiles;
  } catch (error) {
    throw new Error(`タイルURL生成に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
  }
}

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
export function calculateOptimalZoom(
  bounds: [number, number, number, number], 
  mapWidth: number, 
  mapHeight: number,
  options: { minZoom?: number; maxZoom?: number; tileSize?: number } = {}
): number {
  try {
    const [west, south, east, north] = bounds;

    // 入力値の検証
    if (!Array.isArray(bounds) || bounds.length !== 4) {
      throw new Error('boundsは[west, south, east, north]の形式で指定してください');
    }

    if (!bounds.every(b => isFinite(b))) {
      throw new Error('boundsの値は有効な数値で指定してください');
    }

    if (west >= east || south >= north) {
      throw new Error('無効な境界が指定されました（west < east, south < northである必要があります）');
    }

    if (!isFinite(mapWidth) || !isFinite(mapHeight) || mapWidth <= 0 || mapHeight <= 0) {
      throw new Error('地図のサイズは正の数値で指定してください');
    }

    // デフォルト値
    const minZoom = options.minZoom ?? 0;
    const maxZoom = options.maxZoom ?? 18;
    const tileSize = options.tileSize ?? TILE_SIZE;

    // 経度幅と緯度幅
    const lonDiff = east - west;
    const latDiff = north - south;

    // Web Mercator投影法での距離計算
    const latCenter = (north + south) / 2;
    const latCenterRad = latCenter * Math.PI / 180;
    
    // 経度1度あたりのメートル距離（緯度による補正）
    const metersPerDegreeLon = EARTH_CIRCUMFERENCE * Math.cos(latCenterRad) / 360;
    
    // 緯度1度あたりのメートル距離（一定）
    const metersPerDegreeLat = EARTH_CIRCUMFERENCE / 360;

    // 範囲の幅をメートルで計算
    const widthMeters = lonDiff * metersPerDegreeLon;
    const heightMeters = latDiff * metersPerDegreeLat;

    // 各ズームレベルでの解像度を計算し、最適なものを選択
    let bestZoom = minZoom;
    
    for (let zoom = minZoom; zoom <= maxZoom; zoom++) {
      // このズームレベルでの解像度（メートル/ピクセル）
      const resolution = EARTH_CIRCUMFERENCE / (tileSize * Math.pow(2, zoom));
      
      // 必要なピクセル数
      const requiredWidthPixels = widthMeters / resolution;
      const requiredHeightPixels = heightMeters / resolution;
      
      // 表示サイズに収まるかチェック
      if (requiredWidthPixels <= mapWidth && requiredHeightPixels <= mapHeight) {
        bestZoom = zoom;
      } else {
        // 収まらなくなったら前のズームレベルが最適
        break;
      }
    }

    return Math.max(minZoom, Math.min(maxZoom, bestZoom));
  } catch (error) {
    throw new Error(`最適ズームレベルの計算に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
  }
}

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
export function getResolution(zoom: number, latitude: number = 0, tileSize: number = TILE_SIZE): number {
  try {
    if (!isFinite(zoom) || zoom < 0) {
      throw new Error('無効なズームレベルが指定されました');
    }

    if (!isFinite(latitude) || latitude < -90 || latitude > 90) {
      throw new Error('無効な緯度が指定されました');
    }

    if (!isFinite(tileSize) || tileSize <= 0) {
      throw new Error('無効なタイルサイズが指定されました');
    }

    // Web Mercator投影法での解像度計算
    const latRad = latitude * Math.PI / 180;
    const baseResolution = EARTH_CIRCUMFERENCE / (tileSize * Math.pow(2, zoom));
    
    // 緯度による補正（Web Mercator投影法では高緯度ほど歪みが大きくなる）
    const correctionFactor = Math.cos(latRad);
    
    return baseResolution * correctionFactor;
  } catch (error) {
    throw new Error(`解像度の計算に失敗しました: ${error instanceof Error ? error.message : String(error)}`);
  }
}

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
export function isValidTileCoordinate(x: number, y: number, z: number): boolean {
  if (!Number.isInteger(x) || !Number.isInteger(y) || !Number.isInteger(z)) {
    return false;
  }

  if (z < 0 || z > 30) {
    return false;
  }

  const tileCount = Math.pow(2, z);
  return x >= 0 && x < tileCount && y >= 0 && y < tileCount;
}