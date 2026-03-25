import { geoMercator } from 'd3-geo';
import { LineTaperedLayer } from '../line/line-tapered-layer';
import * as GeoJSON from 'geojson';

describe('LineTaperedLayer', () => {
  let container: any;
  let testDataFeature: GeoJSON.Feature;
  let testDataFeatureCollection: GeoJSON.FeatureCollection;
  let testDataFeatureArray: GeoJSON.Feature[];

  beforeEach(() => {
    const mockElement = {
      appendChild: jest.fn(),
      setAttribute: jest.fn(),
      getAttribute: jest.fn(),
      removeChild: jest.fn(),
      tagName: 'g'
    };

    container = {
      append: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      attr: jest.fn().mockReturnThis(),
      style: jest.fn().mockReturnThis(),
      text: jest.fn().mockReturnThis(),
      selectAll: jest.fn().mockReturnThis(),
      data: jest.fn().mockReturnThis(),
      datum: jest.fn().mockReturnThis(),
      enter: jest.fn().mockReturnThis(),
      exit: jest.fn().mockReturnThis(),
      remove: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      node: jest.fn(() => mockElement),
      size: jest.fn(() => 5),
      call: jest.fn().mockReturnThis(),
      on: jest.fn().mockReturnThis(),
      each: jest.fn().mockReturnThis()
    } as any;

    // テスト用のデータ（単一Feature - 3点のLineString、中間点は無視される）
    testDataFeature = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [139.6917, 35.6895], // 東京（始点）
          [137.0, 35.0],      // 中間点（無視される）
          [135.5023, 34.6937]  // 大阪（終点）
        ]
      },
      properties: { name: 'Tokyo-Osaka', arc: 'left' }
    };

    // テスト用のデータ（FeatureCollection）
    testDataFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [139.6917, 35.6895],
              [135.5023, 34.6937]
            ]
          },
          properties: { name: 'Tokyo-Osaka', arc: 'right' }
        },
        {
          type: 'Feature',
          geometry: {
            type: 'MultiLineString',
            coordinates: [
              [
                [140.1233, 35.6062],
                [139.6380, 35.4437]
              ],
              [
                [139.0235, 35.2023],
                [138.3877, 34.9760]
              ]
            ]
          },
          properties: { name: 'Kanto-Routes', arc: 'left' }
        }
      ]
    };

    testDataFeatureArray = testDataFeatureCollection.features;
  });

  describe('constructor', () => {
    it('単一Featureで初期化される', () => {
      const layer = new LineTaperedLayer({
        data: testDataFeature
      });
      expect(layer.id).toMatch(/^line-tapered-/);
    });

    it('FeatureCollectionで初期化される', () => {
      const layer = new LineTaperedLayer({
        data: testDataFeatureCollection
      });
      expect(layer.id).toMatch(/^line-tapered-/);
    });

    it('Feature配列で初期化される', () => {
      const layer = new LineTaperedLayer({
        data: testDataFeatureArray
      });
      expect(layer.id).toMatch(/^line-tapered-/);
    });

    it('カスタム設定が適用される', () => {
      const layer = new LineTaperedLayer({
        data: testDataFeature,
        startSize: 15,
        endSize: 3,
        arcHeight: 0.5,
        flipArc: true,
        attr: { fill: '#ff6b6b', opacity: 0.8 }
      });
      expect(layer.id).toMatch(/^line-tapered-/);
    });

    it('コールバック関数でstartSize/endSizeを指定できる', () => {
      const layer = new LineTaperedLayer({
        data: testDataFeature,
        startSize: (d, i) => 10 + i * 2,
        endSize: (d, i) => 2 + i
      });
      expect(layer.id).toMatch(/^line-tapered-/);
    });

    it('コールバック関数でflipArcを指定できる', () => {
      const layer = new LineTaperedLayer({
        data: testDataFeature,
        flipArc: (d, i) => d.properties?.arc === 'left'
      });
      expect(layer.id).toMatch(/^line-tapered-/);
    });
  });

  describe('data validation', () => {
    it('不正なデータ型でエラーが発生する', () => {
      expect(() => {
        new LineTaperedLayer({
          data: { type: 'FeatureCollection', features: 'invalid' } as any
        });
      }).toThrow('featuresが配列ではありません');
    });

    it('geometryが存在しない場合エラーが発生する', () => {
      expect(() => {
        new LineTaperedLayer({
          data: {
            type: 'Feature',
            geometry: null as any,
            properties: {}
          }
        });
      }).toThrow('geometryが存在しません');
    });

    it('LineStringでもMultiLineStringでもない場合エラーが発生する', () => {
      expect(() => {
        new LineTaperedLayer({
          data: {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [0, 0] } as any,
            properties: {}
          }
        });
      }).toThrow("'LineString'または'MultiLineString'である必要があります");
    });

    it('座標が2点未満の場合エラーが発生する', () => {
      expect(() => {
        new LineTaperedLayer({
          data: {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: [[0, 0]] },
            properties: {}
          }
        });
      }).toThrow('少なくとも2点の座標が必要です');
    });

    it('経度が範囲外の場合エラーが発生する', () => {
      expect(() => {
        new LineTaperedLayer({
          data: {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: [[200, 0], [0, 0]] },
            properties: {}
          }
        });
      }).toThrow('経度は-180から180の範囲である必要があります');
    });

    it('緯度が範囲外の場合エラーが発生する', () => {
      expect(() => {
        new LineTaperedLayer({
          data: {
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: [[0, 100], [0, 0]] },
            properties: {}
          }
        });
      }).toThrow('緯度は-90から90の範囲である必要があります');
    });
  });

  describe('projection management', () => {
    it('setProjection()で投影法を設定できる', () => {
      const layer = new LineTaperedLayer({
        data: testDataFeature
      });
      const projection = geoMercator();
      layer.setProjection(projection);
      expect(layer.id).toMatch(/^line-tapered-/);
    });
  });

  describe('render', () => {
    it('render()でレイヤーグループが作成される', () => {
      const layer = new LineTaperedLayer({
        data: testDataFeature
      });
      layer.render(container);
      expect(layer.isRendered()).toBe(true);
    });

    it('投影法が設定されていない場合は描画されない', () => {
      const layer = new LineTaperedLayer({
        data: testDataFeature
      });
      layer.render(container);
      expect(layer.isRendered()).toBe(true);
    });

    it('投影法設定後に描画が実行される', () => {
      const layer = new LineTaperedLayer({
        data: testDataFeature,
        attr: { fill: '#ff6b6b' }
      });
      const projection = geoMercator();
      layer.setProjection(projection);
      layer.render(container);
      expect(layer.isRendered()).toBe(true);
    });
  });

  describe('tapered polygon rendering', () => {
    it('デフォルト設定で描画が正常に実行される', () => {
      const layer = new LineTaperedLayer({
        data: testDataFeature,
        attr: { fill: '#333' }
      });
      const projection = geoMercator();
      layer.setProjection(projection);
      layer.render(container);
      expect(layer.isRendered()).toBe(true);
    });

    it('flipArc=trueで描画が正常に実行される', () => {
      const layer = new LineTaperedLayer({
        data: testDataFeature,
        flipArc: true,
        attr: { fill: '#ff0000' }
      });
      const projection = geoMercator();
      layer.setProjection(projection);
      layer.render(container);
      expect(layer.isRendered()).toBe(true);
    });

    it('flipArcコールバックで描画が正常に実行される', () => {
      const layer = new LineTaperedLayer({
        data: testDataFeatureCollection,
        flipArc: (d, i) => d.properties?.arc === 'left',
        attr: { fill: '#0000ff' }
      });
      const projection = geoMercator();
      layer.setProjection(projection);
      layer.render(container);
      expect(layer.isRendered()).toBe(true);
    });

    it('startSize/endSizeコールバックで描画が正常に実行される', () => {
      const layer = new LineTaperedLayer({
        data: testDataFeatureCollection,
        startSize: (d, i) => 10 + i * 5,
        endSize: (d, i) => 2 + i,
        attr: { fill: '#00ff00' }
      });
      const projection = geoMercator();
      layer.setProjection(projection);
      layer.render(container);
      expect(layer.isRendered()).toBe(true);
    });

    it('MultiLineStringが正常に処理される', () => {
      const layer = new LineTaperedLayer({
        data: testDataFeatureCollection,
        startSize: 8,
        endSize: 1
      });
      const projection = geoMercator();
      layer.setProjection(projection);
      layer.render(container);
      expect(layer.isRendered()).toBe(true);
    });

    it('arcHeightを変更して描画が正常に実行される', () => {
      const layer = new LineTaperedLayer({
        data: testDataFeature,
        arcHeight: 0.6,
        attr: { fill: '#purple' }
      });
      const projection = geoMercator();
      layer.setProjection(projection);
      layer.render(container);
      expect(layer.isRendered()).toBe(true);
    });

    it('startSizeとendSizeが同じでも動作する', () => {
      const layer = new LineTaperedLayer({
        data: testDataFeature,
        startSize: 5,
        endSize: 5
      });
      const projection = geoMercator();
      layer.setProjection(projection);
      layer.render(container);
      expect(layer.isRendered()).toBe(true);
    });
  });

  describe('arrow', () => {
    it('endArrow有効時に描画が正常に実行される', () => {
      const layer = new LineTaperedLayer({
        data: testDataFeature,
        endArrow: true,
        arrowSize: 12,
        attr: { fill: '#ff6b6b' }
      });
      const projection = geoMercator();
      layer.setProjection(projection);
      layer.render(container);
      expect(layer.isRendered()).toBe(true);
    });

    it('startArrow有効時に描画が正常に実行される', () => {
      const layer = new LineTaperedLayer({
        data: testDataFeature,
        startArrow: true,
        attr: { fill: '#333' }
      });
      const projection = geoMercator();
      layer.setProjection(projection);
      layer.render(container);
      expect(layer.isRendered()).toBe(true);
    });

    it('両方の矢印が有効時に正常に動作する', () => {
      const layer = new LineTaperedLayer({
        data: testDataFeatureCollection,
        startArrow: true,
        endArrow: true,
        arrowSize: 8,
        attr: { fill: '#0000ff' }
      });
      const projection = geoMercator();
      layer.setProjection(projection);
      layer.render(container);
      expect(layer.isRendered()).toBe(true);
    });

    it('flipArcと矢印を同時に使用できる', () => {
      const layer = new LineTaperedLayer({
        data: testDataFeature,
        flipArc: true,
        endArrow: true,
        arrowSize: 10,
        attr: { fill: '#ff0000' }
      });
      const projection = geoMercator();
      layer.setProjection(projection);
      layer.render(container);
      expect(layer.isRendered()).toBe(true);
    });
  });

  describe('getData', () => {
    it('GeoJSONデータを取得できる', () => {
      const layer = new LineTaperedLayer({
        data: testDataFeature
      });
      const data = layer.getData();
      expect(data.type).toBe('FeatureCollection');
      expect(data.features.length).toBe(1);
    });
  });
});
