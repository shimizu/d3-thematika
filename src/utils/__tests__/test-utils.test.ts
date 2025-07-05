import {
  testProjectionTransform,
  testProjectionBounds,
  logTestResult,
  type ProjectionTestResult,
  type AbnormalCoordinate
} from '../test-utils';
import { GeoProjection } from 'd3-geo';

// D3投影法のモック
const mockProjection: GeoProjection = jest.fn((coords: [number, number]) => {
  // 簡単な線形変換でテスト
  const [lng, lat] = coords;
  return [lng * 10, lat * 10]; // 10倍にスケール
}) as any;

// コンソールのモック
const mockConsole = {
  log: jest.fn(),
  warn: jest.fn()
};

// オリジナルのconsoleメソッドを保存
const originalConsole = {
  log: console.log,
  warn: console.warn
};

describe('test-utils', () => {
  // テスト用のGeoJSONデータ
  const testFeatureCollection: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { name: 'test-point' },
        geometry: {
          type: 'Point',
          coordinates: [1, 1] // 変換後: [10, 10]
        }
      },
      {
        type: 'Feature',
        properties: { name: 'test-polygon' },
        geometry: {
          type: 'Polygon',
          coordinates: [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]] // 変換後: [[0, 0], [20, 0], [20, 20], [0, 20], [0, 0]]
        }
      },
      {
        type: 'Feature',
        properties: { name: 'test-linestring' },
        geometry: {
          type: 'LineString',
          coordinates: [[1, 1], [3, 3]] // 変換後: [[10, 10], [30, 30]]
        }
      }
    ]
  };

  beforeEach(() => {
    // コンソールメソッドをモックに置換
    console.log = mockConsole.log;
    console.warn = mockConsole.warn;
    
    // モック関数をクリア
    jest.clearAllMocks();
  });

  afterEach(() => {
    // コンソールメソッドを元に戻す
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
  });

  describe('testProjectionTransform', () => {
    it('正常範囲内の座標の場合、有効なテスト結果を返す', () => {
      const width = 100;
      const height = 100;
      
      const result = testProjectionTransform(width, height, mockProjection, testFeatureCollection);
      
      expect(result.totalCoords).toBe(8); // Point:1 + Polygon:5 + LineString:2 = 8
      expect(result.normalCoords).toBe(8);
      expect(result.abnormalCoords).toBe(0);
      expect(result.abnormalDetails).toHaveLength(0);
      expect(result.isValid).toBe(true);
      expect(result.summary).toContain('✅ すべての座標が正常範囲内です');
    });

    it('範囲外の座標がある場合、異常値を正しく検出する', () => {
      const width = 15; // 小さな範囲に設定
      const height = 15;
      
      const result = testProjectionTransform(width, height, mockProjection, testFeatureCollection);
      
      expect(result.totalCoords).toBe(8);
      expect(result.abnormalCoords).toBeGreaterThan(0);
      expect(result.normalCoords).toBe(result.totalCoords - result.abnormalCoords);
      expect(result.abnormalDetails.length).toBe(result.abnormalCoords);
      expect(result.isValid).toBe(false);
      expect(result.summary).toContain('⚠️');
      expect(result.summary).toContain('個の座標が範囲外です');
    });

    it('異常値の詳細情報を正しく記録する', () => {
      const width = 15;
      const height = 15;
      
      const result = testProjectionTransform(width, height, mockProjection, testFeatureCollection);
      
      const abnormalDetail = result.abnormalDetails[0];
      expect(abnormalDetail).toHaveProperty('featureName');
      expect(abnormalDetail).toHaveProperty('originalCoord');
      expect(abnormalDetail).toHaveProperty('projectedCoord');
      expect(abnormalDetail).toHaveProperty('outOfBounds');
      expect(abnormalDetail.outOfBounds).toHaveProperty('x');
      expect(abnormalDetail.outOfBounds).toHaveProperty('y');
    });

    it('空のFeatureCollectionを処理できる', () => {
      const emptyCollection: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: []
      };
      
      const result = testProjectionTransform(100, 100, mockProjection, emptyCollection);
      
      expect(result.totalCoords).toBe(0);
      expect(result.normalCoords).toBe(0);
      expect(result.abnormalCoords).toBe(0);
      expect(result.abnormalDetails).toHaveLength(0);
      expect(result.isValid).toBe(true);
    });

    it('MultiPoint geometryを正しく処理する', () => {
      const multiPointFeature: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { name: 'multi-point' },
            geometry: {
              type: 'MultiPoint',
              coordinates: [[1, 1], [2, 2]]
            }
          }
        ]
      };
      
      const result = testProjectionTransform(100, 100, mockProjection, multiPointFeature);
      
      expect(result.totalCoords).toBe(2);
      expect(result.isValid).toBe(true);
    });

    it('GeometryCollectionを正しく処理する', () => {
      const geometryCollectionFeature: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { name: 'geometry-collection' },
            geometry: {
              type: 'GeometryCollection',
              geometries: [
                { type: 'Point', coordinates: [1, 1] },
                { type: 'Point', coordinates: [2, 2] }
              ]
            }
          }
        ]
      };
      
      const result = testProjectionTransform(100, 100, mockProjection, geometryCollectionFeature);
      
      expect(result.totalCoords).toBe(2);
      expect(result.isValid).toBe(true);
    });

    it('投影に失敗する座標を適切に処理する', () => {
      // 投影に失敗する場合nullを返すモック
      const failingProjection: GeoProjection = jest.fn(() => null) as any;
      
      const result = testProjectionTransform(100, 100, failingProjection, testFeatureCollection);
      
      expect(result.totalCoords).toBe(0); // nullの場合はカウントされない
      expect(result.isValid).toBe(true);
    });
  });

  describe('testProjectionBounds', () => {
    it('正常な投影法の場合、有効な結果を返す', () => {
      const result = testProjectionBounds(mockProjection, testFeatureCollection);
      
      expect(result.isValid).toBe(true);
      expect(result.message).toContain('✅ 投影法の境界設定は正常です');
    });

    it('投影に失敗する座標がある場合、無効な結果を返す', () => {
      // 一部の座標で投影に失敗するモック
      const partiallyFailingProjection: GeoProjection = jest.fn((coords: [number, number]) => {
        const [lng, lat] = coords;
        // 特定の座標で投影に失敗
        if (lng === 3 && lat === 3) return null;
        return [lng * 10, lat * 10];
      }) as any;
      
      const result = testProjectionBounds(partiallyFailingProjection, testFeatureCollection);
      
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('⚠️ 投影法で変換できない座標があります');
    });

    it('投影法でエラーが発生した場合、エラーメッセージを返す', () => {
      // エラーを投げるモック
      const errorProjection: GeoProjection = jest.fn(() => {
        throw new Error('Projection error');
      }) as any;
      
      const result = testProjectionBounds(errorProjection, testFeatureCollection);
      
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('❌ 境界テスト中にエラーが発生しました');
      expect(result.message).toContain('Projection error');
    });

    it('空のFeatureCollectionを処理できる', () => {
      const emptyCollection: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: []
      };
      
      const result = testProjectionBounds(mockProjection, emptyCollection);
      
      expect(result.isValid).toBe(true);
      expect(result.message).toContain('✅');
    });

    it('非Errorオブジェクトの例外を適切に処理する', () => {
      const stringThrowingProjection: GeoProjection = jest.fn(() => {
        throw 'String error';
      }) as any;
      
      const result = testProjectionBounds(stringThrowingProjection, testFeatureCollection);
      
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Unknown error');
    });
  });

  describe('logTestResult', () => {
    const mockTestResult: ProjectionTestResult = {
      totalCoords: 10,
      normalCoords: 8,
      abnormalCoords: 2,
      abnormalDetails: [
        {
          featureName: 'test-feature',
          originalCoord: [1, 2],
          projectedCoord: [150, 250],
          outOfBounds: {
            x: 'x > 100',
            y: 'y > 200'
          }
        },
        {
          featureName: 'another-feature',
          originalCoord: [3, 4],
          projectedCoord: [-10, 50],
          outOfBounds: {
            x: 'x < 0',
            y: 'y OK'
          }
        }
      ],
      isValid: false,
      summary: '⚠️ 2個の座標が範囲外です'
    };

    it('基本的なテスト結果を正しく出力する', () => {
      logTestResult(mockTestResult);
      
      expect(mockConsole.log).toHaveBeenCalledWith('=== 座標変換テスト結果 ===');
      expect(mockConsole.log).toHaveBeenCalledWith('総座標数: 10');
      expect(mockConsole.log).toHaveBeenCalledWith('正常座標数: 8');
      expect(mockConsole.log).toHaveBeenCalledWith('異常座標数: 2');
      expect(mockConsole.log).toHaveBeenCalledWith('⚠️ 2個の座標が範囲外です');
    });

    it('詳細モードで異常値の詳細を出力する', () => {
      logTestResult(mockTestResult, true);
      
      expect(mockConsole.warn).toHaveBeenCalledWith('異常値の詳細:');
      expect(mockConsole.warn).toHaveBeenCalledWith(
        '  1. test-feature: [1,2] → [150.00,250.00] (x > 100, y > 200)'
      );
      expect(mockConsole.warn).toHaveBeenCalledWith(
        '  2. another-feature: [3,4] → [-10.00,50.00] (x < 0, y OK)'
      );
    });

    it('異常座標がない場合は詳細を出力しない', () => {
      const validResult: ProjectionTestResult = {
        ...mockTestResult,
        abnormalCoords: 0,
        abnormalDetails: [],
        isValid: true,
        summary: '✅ すべての座標が正常範囲内です'
      };
      
      logTestResult(validResult, true);
      
      expect(mockConsole.warn).not.toHaveBeenCalled();
    });

    it('詳細モードがfalseの場合は異常値詳細を出力しない', () => {
      logTestResult(mockTestResult, false);
      
      expect(mockConsole.warn).not.toHaveBeenCalled();
    });

    it('詳細モードのデフォルト値はfalse', () => {
      logTestResult(mockTestResult);
      
      expect(mockConsole.warn).not.toHaveBeenCalled();
    });
  });
});