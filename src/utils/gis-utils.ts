/**
 * GIS関連のユーティリティ関数
 * GeoJSONデータの解析と計算に特化したユーティリティ集
 */

import type { GeoJSON, Feature, FeatureCollection, Geometry, Position } from 'geojson';
import { fromUrl, GeoTIFF, Pool } from 'geotiff';

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
 * 座標の配列から最小値と最大値を取得するヘルパー関数
 */
function getMinMax(coords: Position[]): [number, number, number, number] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  for (const [x, y] of coords) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  
  return [minX, minY, maxX, maxY];
}

/**
 * ジオメトリから全ての座標を抽出するヘルパー関数
 */
function extractCoordinates(geometry: Geometry): Position[] {
  const coords: Position[] = [];
  
  switch (geometry.type) {
    case 'Point':
      coords.push(geometry.coordinates);
      break;
    case 'LineString':
      coords.push(...geometry.coordinates);
      break;
    case 'Polygon':
      geometry.coordinates.forEach(ring => coords.push(...ring));
      break;
    case 'MultiPoint':
      coords.push(...geometry.coordinates);
      break;
    case 'MultiLineString':
      geometry.coordinates.forEach(line => coords.push(...line));
      break;
    case 'MultiPolygon':
      geometry.coordinates.forEach(polygon => 
        polygon.forEach(ring => coords.push(...ring))
      );
      break;
    case 'GeometryCollection':
      geometry.geometries.forEach(geom => 
        coords.push(...extractCoordinates(geom))
      );
      break;
  }
  
  return coords;
}

/**
 * GeoJSONからBounding Boxを取得する
 * @param geojson - GeoJSONオブジェクト
 * @returns Bounding Box
 */
export function getBbox(geojson: GeoJSON): BBox {
  const allCoords: Position[] = [];
  
  if (geojson.type === 'Feature') {
    allCoords.push(...extractCoordinates(geojson.geometry));
  } else if (geojson.type === 'FeatureCollection') {
    geojson.features.forEach(feature => {
      allCoords.push(...extractCoordinates(feature.geometry));
    });
  } else if ('coordinates' in geojson || 'geometries' in geojson) {
    allCoords.push(...extractCoordinates(geojson as Geometry));
  }
  
  if (allCoords.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }
  
  const [minX, minY, maxX, maxY] = getMinMax(allCoords);
  return { minX, minY, maxX, maxY };
}

/**
 * GeoJSONから中心点を取得する（単純な平均計算）
 * @param geojson - GeoJSONオブジェクト
 * @returns 中心点の座標
 */
export function getCentroid(geojson: GeoJSON): Centroid {
  const allCoords: Position[] = [];
  
  if (geojson.type === 'Feature') {
    allCoords.push(...extractCoordinates(geojson.geometry));
  } else if (geojson.type === 'FeatureCollection') {
    geojson.features.forEach(feature => {
      allCoords.push(...extractCoordinates(feature.geometry));
    });
  } else if ('coordinates' in geojson || 'geometries' in geojson) {
    allCoords.push(...extractCoordinates(geojson as Geometry));
  }
  
  if (allCoords.length === 0) {
    return { x: 0, y: 0 };
  }
  
  let sumX = 0, sumY = 0;
  for (const [x, y] of allCoords) {
    sumX += x;
    sumY += y;
  }
  
  return {
    x: sumX / allCoords.length,
    y: sumY / allCoords.length
  };
}

/**
 * 複数のGeoJSONをマージする
 * @param geojsons - GeoJSONオブジェクトの配列
 * @returns マージされたFeatureCollection
 */
export function merge(geojsons: GeoJSON[]): FeatureCollection {
  const features: Feature[] = [];
  
  geojsons.forEach((geojson) => {
    if (geojson.type === 'Feature') {
      features.push(geojson as Feature);
    } else if (geojson.type === 'FeatureCollection') {
      features.push(...(geojson as FeatureCollection).features);
    } else if ('coordinates' in geojson || 'geometries' in geojson) {
      // Geometry型の場合はFeatureに変換
      features.push({
        type: 'Feature',
        properties: {},
        geometry: geojson as Geometry
      });
    }
  });
  
  return {
    type: 'FeatureCollection',
    features
  };
}

/**
 * GeoJSONが有効かどうかをチェックする
 * @param geojson - チェックするオブジェクト
 * @returns 有効なGeoJSONかどうか
 */
export function isValidGeoJSON(geojson: any): geojson is GeoJSON {
  try {
    if (!geojson || typeof geojson !== 'object') return false;
    
    // GeoJSONの基本的な型をチェック
    const validTypes = ['Feature', 'FeatureCollection', 'Point', 'LineString', 
                       'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon', 
                       'GeometryCollection'];
    
    return validTypes.includes(geojson.type);
  } catch {
    return false;
  }
}

/**
 * Bounding Boxから中心点を計算する
 * @param bbox - Bounding Box
 * @returns 中心点の座標
 */
export function getBboxCenter(bbox: BBox): Centroid {
  return {
    x: (bbox.minX + bbox.maxX) / 2,
    y: (bbox.minY + bbox.maxY) / 2
  };
}

/**
 * Bounding Boxの幅と高さを取得する
 * @param bbox - Bounding Box
 * @returns 幅と高さ
 */
export function getBboxDimensions(bbox: BBox): { width: number; height: number } {
  return {
    width: bbox.maxX - bbox.minX,
    height: bbox.maxY - bbox.minY
  };
}

/**
 * 2つのBounding Boxをマージする
 * @param bbox1 - 1つ目のBounding Box
 * @param bbox2 - 2つ目のBounding Box
 * @returns マージされたBounding Box
 */
export function mergeBbox(bbox1: BBox, bbox2: BBox): BBox {
  return {
    minX: Math.min(bbox1.minX, bbox2.minX),
    minY: Math.min(bbox1.minY, bbox2.minY),
    maxX: Math.max(bbox1.maxX, bbox2.maxX),
    maxY: Math.max(bbox1.maxY, bbox2.maxY)
  };
}

/**
 * Bounding Boxを拡張する
 * @param bbox - Bounding Box
 * @param padding - パディング（割合）
 * @returns 拡張されたBounding Box
 */
export function expandBbox(bbox: BBox, padding: number = 0.1): BBox {
  const { width, height } = getBboxDimensions(bbox);
  const padX = width * padding;
  const padY = height * padding;
  
  return {
    minX: bbox.minX - padX,
    minY: bbox.minY - padY,
    maxX: bbox.maxX + padX,
    maxY: bbox.maxY + padY
  };
}

/**
 * COG読み込みオプション
 */
export interface ReadCOGOptions {
  /** リサンプリング方法 */
  resampleMethod?: 'nearest' | 'bilinear';
  
  /** 画像インデックス（デフォルト: 0） */
  image?: number;
  
  /** 読み込むバンド（デフォルト: [0, 1, 2]でRGB） */
  samples?: number[];
  
  /** デコード用のワーカープール */
  pool?: Pool;
  
  /** サイズ制限設定 */
  sizeLimit?: {
    /** 最大幅（デフォルト: 512） */
    maxWidth?: number;
    /** 最大高さ（デフォルト: 512） */
    maxHeight?: number;
    /** 制限を超えた場合の処理（デフォルト: 'resample'） */
    onExceed?: 'error' | 'resample';
  };
  
  /** 出力解像度（リサンプリング時に使用） */
  outputWidth?: number;
  outputHeight?: number;
  
  /** 地理的境界（AOI）[west, south, east, north] */
  bbox?: [number, number, number, number];
}

/**
 * COG読み込み結果
 */
export interface ReadCOGResult {
  /** Data URI形式の画像 */
  dataUri: string;
  /** 地理的境界 [west, south, east, north] */
  bounds: [number, number, number, number];
  /** 実際の出力画像の幅 */
  width: number;
  /** 実際の出力画像の高さ */
  height: number;
  /** 元画像の幅 */
  originalWidth: number;
  /** 元画像の高さ */
  originalHeight: number;
  /** リサンプリングされたかどうか */
  wasResampled: boolean;
}

/**
 * Cloud Optimized GeoTIFF（COG）ファイルを読み込み、ImageLayerで使用可能な形式に変換します
 * @param url - COGファイルのURL
 * @param options - 読み込みオプション
 * @returns 読み込み結果
 */
export async function readCOG(url: string, options: ReadCOGOptions = {}): Promise<ReadCOGResult> {
  // デフォルト値を設定
  const {
    resampleMethod = 'nearest',
    image: imageIndex = 0,
    samples = [0, 1, 2],
    pool,
    sizeLimit = {
      maxWidth: 512,
      maxHeight: 512,
      onExceed: 'resample'
    },
    outputWidth,
    outputHeight,
    bbox
  } = options;

  const maxWidth = sizeLimit.maxWidth ?? 512;
  const maxHeight = sizeLimit.maxHeight ?? 512;
  const onExceed = sizeLimit.onExceed ?? 'resample';

  try {
    // GeoTIFFファイルを読み込み
    const tiff = await fromUrl(url);
    const image = await tiff.getImage(imageIndex);

    // 元画像のサイズを取得
    const originalWidth = image.getWidth();
    const originalHeight = image.getHeight();

    // 地理的境界を取得
    const imgBbox = image.getBoundingBox();
    let bounds: [number, number, number, number] = [imgBbox[0], imgBbox[1], imgBbox[2], imgBbox[3]];

    // 出力サイズを決定
    let targetWidth = outputWidth ?? originalWidth;
    let targetHeight = outputHeight ?? originalHeight;
    let wasResampled = false;

    // サイズ制限チェック
    if (targetWidth > maxWidth || targetHeight > maxHeight) {
      if (onExceed === 'error') {
        throw new Error(
          `画像サイズ（${originalWidth}x${originalHeight}）が制限（${maxWidth}x${maxHeight}）を超えています`
        );
      }

      // アスペクト比を維持してリサンプリング
      const aspectRatio = originalWidth / originalHeight;
      if (targetWidth / targetHeight > aspectRatio) {
        targetHeight = maxHeight;
        targetWidth = Math.floor(targetHeight * aspectRatio);
      } else {
        targetWidth = maxWidth;
        targetHeight = Math.floor(targetWidth / aspectRatio);
      }
      wasResampled = true;
    }

    // 明示的な出力サイズが指定されている場合
    if (outputWidth || outputHeight) {
      wasResampled = true;
    }

    // 画像データを読み込み
    const readOptions: any = {
      samples,
      pool,
      interleave: true
    };

    // AOI（bbox）が指定されている場合
    if (bbox) {
      // 地理的境界をピクセル座標に変換
      const [west, south, east, north] = bbox;
      const [imgWest, imgSouth, imgEast, imgNorth] = imgBbox;
      
      // 地理座標をピクセル座標に変換
      const pixelLeft = Math.floor((west - imgWest) / (imgEast - imgWest) * originalWidth);
      const pixelRight = Math.ceil((east - imgWest) / (imgEast - imgWest) * originalWidth);
      const pixelTop = Math.floor((imgNorth - north) / (imgNorth - imgSouth) * originalHeight);
      const pixelBottom = Math.ceil((imgNorth - south) / (imgNorth - imgSouth) * originalHeight);
      
      // ピクセル座標を画像範囲内にクリップ
      readOptions.window = [
        Math.max(0, pixelLeft),
        Math.max(0, pixelTop),
        Math.min(originalWidth, pixelRight),
        Math.min(originalHeight, pixelBottom)
      ];
      
      // windowのサイズを更新
      targetWidth = readOptions.window[2] - readOptions.window[0];
      targetHeight = readOptions.window[3] - readOptions.window[1];
      
      // 実際の地理的境界を更新
      const actualWest = imgWest + (readOptions.window[0] / originalWidth) * (imgEast - imgWest);
      const actualEast = imgWest + (readOptions.window[2] / originalWidth) * (imgEast - imgWest);
      const actualNorth = imgNorth - (readOptions.window[1] / originalHeight) * (imgNorth - imgSouth);
      const actualSouth = imgNorth - (readOptions.window[3] / originalHeight) * (imgNorth - imgSouth);
      bounds = [actualWest, actualSouth, actualEast, actualNorth];
    }

    // リサンプリングが必要な場合
    if (wasResampled || (targetWidth > maxWidth || targetHeight > maxHeight)) {
      // アスペクト比を維持してサイズを調整
      const aspectRatio = targetWidth / targetHeight;
      if (targetWidth > maxWidth || targetHeight > maxHeight) {
        if (targetWidth / targetHeight > aspectRatio) {
          targetHeight = maxHeight;
          targetWidth = Math.floor(targetHeight * aspectRatio);
        } else {
          targetWidth = maxWidth;
          targetHeight = Math.floor(targetWidth / aspectRatio);
        }
        wasResampled = true;
      }
      
      readOptions.width = targetWidth;
      readOptions.height = targetHeight;
      readOptions.resampleMethod = resampleMethod;
    }

    const rasters = await image.readRGB(readOptions);
    const { width, height } = rasters;

    // Canvasに描画してData URIに変換
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas contextの取得に失敗しました');
    }

    // ImageDataを作成
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    // RGBデータをImageDataに変換
    const rastersArray = rasters as any as number[];
    for (let i = 0; i < rastersArray.length / 3; i++) {
      const idx = i * 4;
      const srcIdx = i * 3;
      data[idx] = rastersArray[srcIdx];       // R
      data[idx + 1] = rastersArray[srcIdx + 1]; // G
      data[idx + 2] = rastersArray[srcIdx + 2]; // B
      data[idx + 3] = 255;                 // A
    }

    ctx.putImageData(imageData, 0, 0);
    const dataUri = canvas.toDataURL('image/png');

    return {
      dataUri,
      bounds,
      width,
      height,
      originalWidth,
      originalHeight,
      wasResampled
    };
  } catch (error) {
    throw new Error(`COGの読み込みに失敗しました: ${error instanceof Error ? error.message : String(error)}`);
  }
}