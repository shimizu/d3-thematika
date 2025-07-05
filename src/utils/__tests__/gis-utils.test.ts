import {
  getBbox,
  getCentroid,
  merge,
  isValidGeoJSON,
  getBboxCenter,
  getBboxDimensions,
  mergeBbox,
  expandBbox,
  type BBox,
  type Centroid
} from '../gis-utils';
import type { GeoJSON, Feature, FeatureCollection, Geometry } from 'geojson';

describe('gis-utils', () => {
  // テスト用のGeoJSONデータ
  const pointFeature: Feature = {
    type: 'Feature',
    properties: { name: 'test-point' },
    geometry: {
      type: 'Point',
      coordinates: [10, 20]
    }
  };

  const polygonFeature: Feature = {
    type: 'Feature',
    properties: { name: 'test-polygon' },
    geometry: {
      type: 'Polygon',
      coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]]
    }
  };

  const lineStringFeature: Feature = {
    type: 'Feature',
    properties: { name: 'test-linestring' },
    geometry: {
      type: 'LineString',
      coordinates: [[5, 5], [15, 15]]
    }
  };

  const featureCollection: FeatureCollection = {
    type: 'FeatureCollection',
    features: [pointFeature, polygonFeature, lineStringFeature]
  };

  describe('getBbox', () => {
    it('Point Featureの境界ボックスを正しく計算する', () => {
      const bbox = getBbox(pointFeature);
      expect(bbox).toEqual({
        minX: 10,
        minY: 20,
        maxX: 10,
        maxY: 20
      });
    });

    it('Polygon Featureの境界ボックスを正しく計算する', () => {
      const bbox = getBbox(polygonFeature);
      expect(bbox).toEqual({
        minX: 0,
        minY: 0,
        maxX: 10,
        maxY: 10
      });
    });

    it('LineString Featureの境界ボックスを正しく計算する', () => {
      const bbox = getBbox(lineStringFeature);
      expect(bbox).toEqual({
        minX: 5,
        minY: 5,
        maxX: 15,
        maxY: 15
      });
    });

    it('FeatureCollectionの境界ボックスを正しく計算する', () => {
      const bbox = getBbox(featureCollection);
      expect(bbox).toEqual({
        minX: 0,
        minY: 0,
        maxX: 15,
        maxY: 20
      });
    });

    it('直接GeometryオブジェクトでBBoxを計算する', () => {
      const geometry: Geometry = {
        type: 'Point',
        coordinates: [5, 10]
      };
      const bbox = getBbox(geometry as GeoJSON);
      expect(bbox).toEqual({
        minX: 5,
        minY: 10,
        maxX: 5,
        maxY: 10
      });
    });

    it('空のFeatureCollectionでは初期値を返す', () => {
      const emptyCollection: FeatureCollection = {
        type: 'FeatureCollection',
        features: []
      };
      const bbox = getBbox(emptyCollection);
      expect(bbox).toEqual({
        minX: 0,
        minY: 0,
        maxX: 0,
        maxY: 0
      });
    });

    it('MultiPolygonの境界ボックスを正しく計算する', () => {
      const multiPolygonFeature: Feature = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'MultiPolygon',
          coordinates: [
            [[[0, 0], [5, 0], [5, 5], [0, 5], [0, 0]]],
            [[[10, 10], [15, 10], [15, 15], [10, 15], [10, 10]]]
          ]
        }
      };
      const bbox = getBbox(multiPolygonFeature);
      expect(bbox).toEqual({
        minX: 0,
        minY: 0,
        maxX: 15,
        maxY: 15
      });
    });

    it('GeometryCollectionの境界ボックスを正しく計算する', () => {
      const geometryCollection: Feature = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'GeometryCollection',
          geometries: [
            { type: 'Point', coordinates: [1, 1] },
            { type: 'Point', coordinates: [9, 9] }
          ]
        }
      };
      const bbox = getBbox(geometryCollection);
      expect(bbox).toEqual({
        minX: 1,
        minY: 1,
        maxX: 9,
        maxY: 9
      });
    });
  });

  describe('getCentroid', () => {
    it('Point Featureの中心点を正しく計算する', () => {
      const centroid = getCentroid(pointFeature);
      expect(centroid).toEqual({
        x: 10,
        y: 20
      });
    });

    it('Polygon Featureの中心点を正しく計算する', () => {
      const centroid = getCentroid(polygonFeature);
      // Polygon座標: [[0,0], [10,0], [10,10], [0,10], [0,0]] = 5座標の平均
      // X: (0+10+10+0+0)/5 = 20/5 = 4
      // Y: (0+0+10+10+0)/5 = 20/5 = 4
      expect(centroid).toEqual({
        x: 4,
        y: 4
      });
    });

    it('FeatureCollectionの中心点を正しく計算する', () => {
      const centroid = getCentroid(featureCollection);
      // 全座標: Point[10,20] + Polygon[[0,0],[10,0],[10,10],[0,10],[0,0]] + LineString[[5,5],[15,15]]
      // = [10,20] + [0,0,10,0,10,10,0,10,0,0] + [5,5,15,15] = 8座標
      // X: (10 + 0 + 10 + 10 + 0 + 0 + 5 + 15) / 8 = 50/8 = 6.25
      // Y: (20 + 0 + 0 + 10 + 10 + 0 + 5 + 15) / 8 = 60/8 = 7.5
      expect(centroid).toEqual({
        x: 6.25,
        y: 7.5
      });
    });

    it('空のFeatureCollectionでは初期値を返す', () => {
      const emptyCollection: FeatureCollection = {
        type: 'FeatureCollection',
        features: []
      };
      const centroid = getCentroid(emptyCollection);
      expect(centroid).toEqual({
        x: 0,
        y: 0
      });
    });
  });

  describe('merge', () => {
    it('複数のFeatureを正しくマージする', () => {
      const result = merge([pointFeature, polygonFeature]);
      expect(result.type).toBe('FeatureCollection');
      expect(result.features).toHaveLength(2);
      expect(result.features[0]).toEqual(pointFeature);
      expect(result.features[1]).toEqual(polygonFeature);
    });

    it('FeatureCollectionを正しくマージする', () => {
      const collection1: FeatureCollection = {
        type: 'FeatureCollection',
        features: [pointFeature]
      };
      const collection2: FeatureCollection = {
        type: 'FeatureCollection',
        features: [polygonFeature]
      };
      const result = merge([collection1, collection2]);
      expect(result.type).toBe('FeatureCollection');
      expect(result.features).toHaveLength(2);
      expect(result.features[0]).toEqual(pointFeature);
      expect(result.features[1]).toEqual(polygonFeature);
    });

    it('GeometryオブジェクトをFeatureに変換してマージする', () => {
      const geometry: Geometry = {
        type: 'Point',
        coordinates: [5, 10]
      };
      const result = merge([geometry as GeoJSON, pointFeature]);
      expect(result.type).toBe('FeatureCollection');
      expect(result.features).toHaveLength(2);
      expect(result.features[0].type).toBe('Feature');
      expect(result.features[0].geometry).toEqual(geometry);
      expect(result.features[0].properties).toEqual({});
    });

    it('空の配列では空のFeatureCollectionを返す', () => {
      const result = merge([]);
      expect(result.type).toBe('FeatureCollection');
      expect(result.features).toHaveLength(0);
    });

    it('混合タイプを正しくマージする', () => {
      const geometry: Geometry = { type: 'Point', coordinates: [1, 2] };
      const collection: FeatureCollection = {
        type: 'FeatureCollection',
        features: [pointFeature]
      };
      const result = merge([geometry as GeoJSON, polygonFeature, collection]);
      expect(result.type).toBe('FeatureCollection');
      expect(result.features).toHaveLength(3);
    });
  });

  describe('isValidGeoJSON', () => {
    it('有効なFeatureを正しく判定する', () => {
      expect(isValidGeoJSON(pointFeature)).toBe(true);
      expect(isValidGeoJSON(polygonFeature)).toBe(true);
    });

    it('有効なFeatureCollectionを正しく判定する', () => {
      expect(isValidGeoJSON(featureCollection)).toBe(true);
    });

    it('有効なGeometryを正しく判定する', () => {
      const geometry: Geometry = {
        type: 'Point',
        coordinates: [1, 2]
      };
      expect(isValidGeoJSON(geometry)).toBe(true);
    });

    it('無効なオブジェクトを正しく判定する', () => {
      expect(isValidGeoJSON(null)).toBe(false);
      expect(isValidGeoJSON(undefined)).toBe(false);
      expect(isValidGeoJSON({})).toBe(false);
      expect(isValidGeoJSON({ type: 'InvalidType' })).toBe(false);
      expect(isValidGeoJSON('string')).toBe(false);
      expect(isValidGeoJSON(123)).toBe(false);
    });

    it('すべての有効なGeoJSONタイプを正しく判定する', () => {
      const validTypes = [
        'Feature',
        'FeatureCollection',
        'Point',
        'LineString',
        'Polygon',
        'MultiPoint',
        'MultiLineString',
        'MultiPolygon',
        'GeometryCollection'
      ];

      validTypes.forEach(type => {
        expect(isValidGeoJSON({ type })).toBe(true);
      });
    });

    it('例外が発生した場合はfalseを返す', () => {
      const throwingObject = {
        get type() {
          throw new Error('Test error');
        }
      };
      expect(isValidGeoJSON(throwingObject)).toBe(false);
    });
  });

  describe('getBboxCenter', () => {
    it('BBoxの中心点を正しく計算する', () => {
      const bbox: BBox = {
        minX: 0,
        minY: 0,
        maxX: 10,
        maxY: 20
      };
      const center = getBboxCenter(bbox);
      expect(center).toEqual({
        x: 5,
        y: 10
      });
    });

    it('負の座標を含むBBoxの中心点を正しく計算する', () => {
      const bbox: BBox = {
        minX: -10,
        minY: -20,
        maxX: 10,
        maxY: 20
      };
      const center = getBboxCenter(bbox);
      expect(center).toEqual({
        x: 0,
        y: 0
      });
    });
  });

  describe('getBboxDimensions', () => {
    it('BBoxの幅と高さを正しく計算する', () => {
      const bbox: BBox = {
        minX: 0,
        minY: 0,
        maxX: 10,
        maxY: 20
      };
      const dimensions = getBboxDimensions(bbox);
      expect(dimensions).toEqual({
        width: 10,
        height: 20
      });
    });

    it('負の座標を含むBBoxの幅と高さを正しく計算する', () => {
      const bbox: BBox = {
        minX: -5,
        minY: -10,
        maxX: 5,
        maxY: 10
      };
      const dimensions = getBboxDimensions(bbox);
      expect(dimensions).toEqual({
        width: 10,
        height: 20
      });
    });
  });

  describe('mergeBbox', () => {
    it('2つのBBoxを正しくマージする', () => {
      const bbox1: BBox = {
        minX: 0,
        minY: 0,
        maxX: 10,
        maxY: 10
      };
      const bbox2: BBox = {
        minX: 5,
        minY: 5,
        maxX: 15,
        maxY: 15
      };
      const merged = mergeBbox(bbox1, bbox2);
      expect(merged).toEqual({
        minX: 0,
        minY: 0,
        maxX: 15,
        maxY: 15
      });
    });

    it('離れたBBoxを正しくマージする', () => {
      const bbox1: BBox = {
        minX: 0,
        minY: 0,
        maxX: 5,
        maxY: 5
      };
      const bbox2: BBox = {
        minX: 10,
        minY: 10,
        maxX: 15,
        maxY: 15
      };
      const merged = mergeBbox(bbox1, bbox2);
      expect(merged).toEqual({
        minX: 0,
        minY: 0,
        maxX: 15,
        maxY: 15
      });
    });

    it('負の座標を含むBBoxを正しくマージする', () => {
      const bbox1: BBox = {
        minX: -10,
        minY: -10,
        maxX: 0,
        maxY: 0
      };
      const bbox2: BBox = {
        minX: 0,
        minY: 0,
        maxX: 10,
        maxY: 10
      };
      const merged = mergeBbox(bbox1, bbox2);
      expect(merged).toEqual({
        minX: -10,
        minY: -10,
        maxX: 10,
        maxY: 10
      });
    });
  });

  describe('expandBbox', () => {
    it('デフォルトパディング（10%）でBBoxを拡張する', () => {
      const bbox: BBox = {
        minX: 0,
        minY: 0,
        maxX: 10,
        maxY: 10
      };
      const expanded = expandBbox(bbox);
      expect(expanded).toEqual({
        minX: -1,
        minY: -1,
        maxX: 11,
        maxY: 11
      });
    });

    it('カスタムパディングでBBoxを拡張する', () => {
      const bbox: BBox = {
        minX: 0,
        minY: 0,
        maxX: 10,
        maxY: 20
      };
      const expanded = expandBbox(bbox, 0.2); // 20%パディング
      expect(expanded).toEqual({
        minX: -2,
        minY: -4,
        maxX: 12,
        maxY: 24
      });
    });

    it('パディング0でBBoxを拡張する（変化なし）', () => {
      const bbox: BBox = {
        minX: 5,
        minY: 10,
        maxX: 15,
        maxY: 20
      };
      const expanded = expandBbox(bbox, 0);
      expect(expanded).toEqual(bbox);
    });

    it('負の座標を含むBBoxを拡張する', () => {
      const bbox: BBox = {
        minX: -5,
        minY: -10,
        maxX: 5,
        maxY: 10
      };
      const expanded = expandBbox(bbox, 0.1);
      expect(expanded).toEqual({
        minX: -6,
        minY: -12,
        maxX: 6,
        maxY: 12
      });
    });
  });
});