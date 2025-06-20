import {
  calculateBounds,
  calculateCenter,
  calculateDistance,
  toRadians,
  toDegrees,
  validateGeoJSON,
  filterFeatures
} from '../geo-utils';

describe('geo-utils', () => {
  // テスト用のGeoJSONデータ
  const sampleGeoJSON: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { name: 'Test Feature 1', value: 100 },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [0, 0], [10, 0], [10, 10], [0, 10], [0, 0]
          ]]
        }
      },
      {
        type: 'Feature',
        properties: { name: 'Test Feature 2', value: 200 },
        geometry: {
          type: 'Point',
          coordinates: [5, 5]
        }
      }
    ]
  };

  describe('calculateBounds', () => {
    test('正しい境界ボックスを計算する', () => {
      const bounds = calculateBounds(sampleGeoJSON);
      expect(bounds).toEqual([0, 0, 10, 10]);
    });

    test('単一のポイントで境界ボックスを計算する', () => {
      const pointGeoJSON: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Point',
            coordinates: [100, 50]
          }
        }]
      };

      const bounds = calculateBounds(pointGeoJSON);
      expect(bounds).toEqual([100, 50, 100, 50]);
    });

    test('空のフィーチャーコレクションでInfinityを返す', () => {
      const emptyGeoJSON: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: []
      };

      const bounds = calculateBounds(emptyGeoJSON);
      expect(bounds).toEqual([Infinity, Infinity, -Infinity, -Infinity]);
    });
  });

  describe('calculateCenter', () => {
    test('正しい中心点を計算する', () => {
      const center = calculateCenter(sampleGeoJSON);
      expect(center).toEqual([5, 5]);
    });

    test('非対称な形状の中心点を計算する', () => {
      const asymmetricGeoJSON: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [0, 0], [20, 0], [20, 10], [0, 10], [0, 0]
            ]]
          }
        }]
      };

      const center = calculateCenter(asymmetricGeoJSON);
      expect(center).toEqual([10, 5]);
    });
  });

  describe('calculateDistance', () => {
    test('同じ座標間の距離は0', () => {
      const distance = calculateDistance([0, 0], [0, 0]);
      expect(distance).toBe(0);
    });

    test('東京-大阪間の距離を計算する（概算）', () => {
      // 東京: [139.6917, 35.6895], 大阪: [135.5023, 34.6937]
      const distance = calculateDistance([139.6917, 35.6895], [135.5023, 34.6937]);
      
      // 東京-大阪間は約400km
      expect(distance).toBeGreaterThanOrEqual(350);
      expect(distance).toBeLessThanOrEqual(450);
    });

    test('赤道上の1度の距離を計算する', () => {
      const distance = calculateDistance([0, 0], [1, 0]);
      
      // 赤道上の1度は約111km
      expect(distance).toBeCloseTo(111.2, 1);
    });
  });

  describe('toRadians', () => {
    test('度をラジアンに正しく変換する', () => {
      expect(toRadians(0)).toBe(0);
      expect(toRadians(90)).toBeCloseTo(Math.PI / 2);
      expect(toRadians(180)).toBeCloseTo(Math.PI);
      expect(toRadians(360)).toBeCloseTo(Math.PI * 2);
    });

    test('負の値を正しく変換する', () => {
      expect(toRadians(-90)).toBeCloseTo(-Math.PI / 2);
      expect(toRadians(-180)).toBeCloseTo(-Math.PI);
    });
  });

  describe('toDegrees', () => {
    test('ラジアンを度に正しく変換する', () => {
      expect(toDegrees(0)).toBe(0);
      expect(toDegrees(Math.PI / 2)).toBeCloseTo(90);
      expect(toDegrees(Math.PI)).toBeCloseTo(180);
      expect(toDegrees(Math.PI * 2)).toBeCloseTo(360);
    });

    test('負の値を正しく変換する', () => {
      expect(toDegrees(-Math.PI / 2)).toBeCloseTo(-90);
      expect(toDegrees(-Math.PI)).toBeCloseTo(-180);
    });
  });

  describe('validateGeoJSON', () => {
    test('有効なGeoJSONを検証する', () => {
      const result = validateGeoJSON(sampleGeoJSON);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('無効なデータタイプを検出する', () => {
      const result = validateGeoJSON(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Data must be an object');
    });

    test('間違ったタイプを検出する', () => {
      const invalidData = {
        type: 'Feature', // FeatureCollectionであるべき
        features: []
      };

      const result = validateGeoJSON(invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Data type must be "FeatureCollection"');
    });

    test('featuresが配列でない場合を検出する', () => {
      const invalidData = {
        type: 'FeatureCollection',
        features: 'not an array'
      };

      const result = validateGeoJSON(invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Features must be an array');
    });

    test('無効なフィーチャーを検出する', () => {
      const invalidData = {
        type: 'FeatureCollection',
        features: [{
          type: 'InvalidFeature', // 間違ったタイプ
          geometry: null,
          properties: null
        }]
      };

      const result = validateGeoJSON(invalidData);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Feature at index 0 type must be "Feature"');
    });
  });

  describe('filterFeatures', () => {
    test('条件に合うフィーチャーをフィルタリングする', () => {
      const filtered = filterFeatures(sampleGeoJSON, (feature) => {
        return feature.properties?.value > 150;
      });

      expect(filtered.features).toHaveLength(1);
      expect(filtered.features[0].properties?.name).toBe('Test Feature 2');
    });

    test('条件に合わないフィーチャーは除外される', () => {
      const filtered = filterFeatures(sampleGeoJSON, (feature) => {
        return feature.properties?.value > 300;
      });

      expect(filtered.features).toHaveLength(0);
    });

    test('すべてのフィーチャーが条件に合う場合', () => {
      const filtered = filterFeatures(sampleGeoJSON, () => true);

      expect(filtered.features).toHaveLength(2);
      expect(filtered.type).toBe('FeatureCollection');
    });

    test('ジオメトリタイプでフィルタリング', () => {
      const filtered = filterFeatures(sampleGeoJSON, (feature) => {
        return feature.geometry.type === 'Point';
      });

      expect(filtered.features).toHaveLength(1);
      expect(filtered.features[0].geometry.type).toBe('Point');
    });
  });
});