/**
 * GIS関連のユーティリティ関数
 * GeoJSONデータの解析と計算に特化したユーティリティ集
 */

import type { GeoJSON, Feature, FeatureCollection, Geometry, Position } from 'geojson';

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