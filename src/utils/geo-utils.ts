/**
 * 地理データ処理に関するユーティリティ関数
 */

/**
 * GeoJSONデータの境界ボックスを計算します
 * @param data - GeoJSONデータ
 * @returns 境界ボックス [minLng, minLat, maxLng, maxLat]
 */
export function calculateBounds(data: GeoJSON.FeatureCollection): [number, number, number, number] {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  function processCoordinates(coordinates: any): void {
    if (Array.isArray(coordinates[0])) {
      coordinates.forEach(processCoordinates);
    } else {
      const [lng, lat] = coordinates;
      minLng = Math.min(minLng, lng);
      minLat = Math.min(minLat, lat);
      maxLng = Math.max(maxLng, lng);
      maxLat = Math.max(maxLat, lat);
    }
  }

  data.features.forEach(feature => {
    if (feature.geometry && 'coordinates' in feature.geometry) {
      processCoordinates(feature.geometry.coordinates);
    }
  });

  return [minLng, minLat, maxLng, maxLat];
}

/**
 * GeoJSONデータの中心点を計算します
 * @param data - GeoJSONデータ
 * @returns 中心点 [lng, lat]
 */
export function calculateCenter(data: GeoJSON.FeatureCollection): [number, number] {
  const [minLng, minLat, maxLng, maxLat] = calculateBounds(data);
  return [(minLng + maxLng) / 2, (minLat + maxLat) / 2];
}

/**
 * 2つの座標間の距離を計算します（ハバーサイン公式）
 * @param coord1 - 座標1 [lng, lat]
 * @param coord2 - 座標2 [lng, lat]
 * @returns 距離（キロメートル）
 */
export function calculateDistance(coord1: [number, number], coord2: [number, number]): number {
  const [lng1, lat1] = coord1;
  const [lng2, lat2] = coord2;
  
  const R = 6371; // 地球の半径（km）
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * 度をラジアンに変換します
 * @param degrees - 度
 * @returns ラジアン
 */
export function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * ラジアンを度に変換します
 * @param radians - ラジアン
 * @returns 度
 */
export function toDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * GeoJSONフィーチャーコレクションを検証します
 * @param data - 検証するデータ
 * @returns 検証結果
 */
export function validateGeoJSON(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    errors.push('Data must be an object');
    return { valid: false, errors };
  }

  if (data.type !== 'FeatureCollection') {
    errors.push('Data type must be "FeatureCollection"');
  }

  if (!Array.isArray(data.features)) {
    errors.push('Features must be an array');
  } else {
    data.features.forEach((feature: any, index: number) => {
      if (!feature || typeof feature !== 'object') {
        errors.push(`Feature at index ${index} must be an object`);
        return;
      }

      if (feature.type !== 'Feature') {
        errors.push(`Feature at index ${index} type must be "Feature"`);
      }

      if (!feature.geometry || typeof feature.geometry !== 'object') {
        errors.push(`Feature at index ${index} must have a geometry object`);
      }

      if (!feature.properties || typeof feature.properties !== 'object') {
        errors.push(`Feature at index ${index} must have a properties object`);
      }
    });
  }

  return { valid: errors.length === 0, errors };
}

/**
 * GeoJSONデータをフィルタリングします
 * @param data - フィルタリングするデータ
 * @param predicate - フィルター条件
 * @returns フィルタリングされたデータ
 */
export function filterFeatures(
  data: GeoJSON.FeatureCollection,
  predicate: (feature: GeoJSON.Feature) => boolean
): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: data.features.filter(predicate)
  };
}