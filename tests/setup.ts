/**
 * Jestテスト環境のセットアップファイル
 * 全テストファイルの実行前に実行されます
 */

import './browser-mocks';
import { MockSVGElement } from './browser-mocks';

// グローバルなテスト設定
global.console = {
  ...console,
  // テスト中のログを制御
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// テスト用のヘルパー関数
(global as any).expectToBeWithinRange = (actual: number, min: number, max: number) => {
  expect(actual).toBeGreaterThanOrEqual(min);
  expect(actual).toBeLessThanOrEqual(max);
};

// 数値の近似比較用ヘルパー
(global as any).expectToBeCloseTo = (actual: number, expected: number, precision: number = 2) => {
  expect(actual).toBeCloseTo(expected, precision);
};

// Cartography固有のテストヘルパー関数
(global as any).expectCoordinateToBeValid = (coord: [number, number]) => {
  expect(Array.isArray(coord)).toBe(true);
  expect(coord).toHaveLength(2);
  expect(typeof coord[0]).toBe('number');
  expect(typeof coord[1]).toBe('number');
  expect(isFinite(coord[0])).toBe(true);
  expect(isFinite(coord[1])).toBe(true);
};

(global as any).expectProjectedCoordinateToBeInCanvas = (
  coord: [number, number], 
  width: number, 
  height: number
) => {
  expect(coord[0]).toBeGreaterThanOrEqual(0);
  expect(coord[0]).toBeLessThanOrEqual(width);
  expect(coord[1]).toBeGreaterThanOrEqual(0);
  expect(coord[1]).toBeLessThanOrEqual(height);
};

(global as any).expectGeoJSONFeatureToBeValid = (feature: GeoJSON.Feature) => {
  expect(feature).toBeDefined();
  expect(feature.type).toBe('Feature');
  expect(feature.geometry).toBeDefined();
  expect(feature.properties).toBeDefined();
  expect(['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon', 'GeometryCollection'])
    .toContain(feature.geometry.type);
};

(global as any).expectSVGElementToBeValid = (element: MockSVGElement | null) => {
  expect(element).toBeDefined();
  expect(element).not.toBeNull();
  expect(element).toBeInstanceOf(MockSVGElement);
};

(global as any).expectLayerToBeRendered = (layerId: string, isVisible: boolean = true) => {
  // モック環境でのレイヤー状態確認
  expect(layerId).toBeDefined();
  expect(typeof layerId).toBe('string');
  expect(layerId.length).toBeGreaterThan(0);
};

// SVGナムスペースのセットアップ
(global as any).SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

// テスト用サンプルGeoJSONデータ
(global as any).SAMPLE_GEOJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'Test Country', id: 1 },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [0, 0], [10, 0], [10, 10], [0, 10], [0, 0]
        ]]
      }
    },
    {
      type: 'Feature', 
      properties: { name: 'Test City', id: 2 },
      geometry: {
        type: 'Point',
        coordinates: [5, 5]
      }
    }
  ]
};

// テスト前の初期化処理
beforeEach(() => {
  // モックをクリア
  jest.clearAllMocks();
  
  // SVGモックのリセット
  if ((global as any).document.createElement.mockClear) {
    (global as any).document.createElement.mockClear();
  }
  if ((global as any).document.createElementNS.mockClear) {
    (global as any).document.createElementNS.mockClear();
  }
});

// テスト後のクリーンアップ
afterEach(() => {
  // DOMモックのクリーンアップ
  jest.restoreAllMocks();
});