import { LineEdgeBundlingLayer } from '../line/line-edgebundling-layer';
import { geoMercator } from 'd3-geo';
import { select } from 'd3-selection';
import { JSDOM } from 'jsdom';
import * as GeoJSON from 'geojson';

// テスト用のGeoJSONデータ
const testLineStringData: GeoJSON.Feature = {
  type: 'Feature',
  geometry: {
    type: 'LineString',
    coordinates: [
      [-120, 40],
      [-75, 35]
    ]
  },
  properties: { name: 'test-line' }
};

const testMultiLineStringData: GeoJSON.Feature = {
  type: 'Feature',
  geometry: {
    type: 'MultiLineString',
    coordinates: [
      [[-118, 38], [-77, 37]],
      [[-122, 42], [-73, 33]]
    ]
  },
  properties: { name: 'test-multiline' }
};

const testFeatureCollection: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    testLineStringData,
    testMultiLineStringData
  ]
};

describe('LineEdgeBundlingLayer', () => {
  let dom: JSDOM;
  let svg: any;
  let container: any;
  let projection: any;

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body><svg></svg></body></html>');
    global.document = dom.window.document;
    global.window = dom.window as any;
    global.HTMLElement = dom.window.HTMLElement;
    global.Element = dom.window.Element;
    global.SVGElement = dom.window.SVGElement;
    
    svg = select(document.querySelector('svg')!);
    container = svg.append('g');
    projection = geoMercator().scale(1000).translate([400, 300]);
  });

  afterEach(() => {
    dom.window.close();
  });

  describe('constructor', () => {
    test('LineStringデータでインスタンスを作成できる', () => {
      const layer = new LineEdgeBundlingLayer({
        data: testLineStringData
      });
      expect(layer).toBeInstanceOf(LineEdgeBundlingLayer);
      expect(layer.id).toMatch(/^line-edgebundling-/);
    });

    test('MultiLineStringデータでインスタンスを作成できる', () => {
      const layer = new LineEdgeBundlingLayer({
        data: testMultiLineStringData
      });
      expect(layer).toBeInstanceOf(LineEdgeBundlingLayer);
    });

    test('FeatureCollectionデータでインスタンスを作成できる', () => {
      const layer = new LineEdgeBundlingLayer({
        data: testFeatureCollection
      });
      expect(layer).toBeInstanceOf(LineEdgeBundlingLayer);
    });

    test('Feature配列データでインスタンスを作成できる', () => {
      const layer = new LineEdgeBundlingLayer({
        data: [testLineStringData, testMultiLineStringData]
      });
      expect(layer).toBeInstanceOf(LineEdgeBundlingLayer);
    });

    test('デフォルトオプションが設定される', () => {
      const layer = new LineEdgeBundlingLayer({
        data: testLineStringData
      });
      expect(layer['bundlingStrength']).toBe(0.85);
      expect(layer['forceStrength']).toBe(20);
      expect(layer['segmentSteps']).toBe('auto');
      expect(layer['showControlPoints']).toBe(false);
      expect(layer['showOriginalLines']).toBe(false);
      expect(layer['animateForce']).toBe(true);
      expect(layer['controlPointSize']).toBe(3);
      expect(layer['endpointSize']).toBe(6);
    });

    test('カスタムオプションが設定される', () => {
      const layer = new LineEdgeBundlingLayer({
        data: testLineStringData,
        bundlingStrength: 0.5,
        forceStrength: 10,
        segmentSteps: 5,
        showControlPoints: true,
        showOriginalLines: true,
        animateForce: false,
        controlPointSize: 4,
        endpointSize: 8
      });
      expect(layer['bundlingStrength']).toBe(0.5);
      expect(layer['forceStrength']).toBe(10);
      expect(layer['segmentSteps']).toBe(5);
      expect(layer['showControlPoints']).toBe(true);
      expect(layer['showOriginalLines']).toBe(true);
      expect(layer['animateForce']).toBe(false);
      expect(layer['controlPointSize']).toBe(4);
      expect(layer['endpointSize']).toBe(8);
    });

    test('属性とスタイルが設定される', () => {
      const attr = { stroke: '#ff0000', strokeWidth: 2 };
      const style = { opacity: 0.7 };
      
      const layer = new LineEdgeBundlingLayer({
        data: testLineStringData,
        attr,
        style
      });
      
      expect(layer['attr']).toEqual(expect.objectContaining(attr));
      expect(layer['style']).toEqual(style);
    });
  });

  describe('data validation', () => {
    test('不正なデータ型でエラーを投げる', () => {
      expect(() => {
        new LineEdgeBundlingLayer({
          data: { type: 'Point' } as any
        });
      }).toThrow('データはFeatureCollectionである必要があります');
    });

    test('featuresが欠けている場合にエラーを投げる', () => {
      expect(() => {
        new LineEdgeBundlingLayer({
          data: { type: 'FeatureCollection' } as any
        });
      }).toThrow('featuresが配列ではありません');
    });

    test('geometryが欠けている場合にエラーを投げる', () => {
      expect(() => {
        new LineEdgeBundlingLayer({
          data: {
            type: 'FeatureCollection',
            features: [{ type: 'Feature', properties: {} } as any]
          }
        });
      }).toThrow('フィーチャー[0]にgeometryが存在しません');
    });

    test('不正なgeometryタイプでエラーを投げる', () => {
      expect(() => {
        new LineEdgeBundlingLayer({
          data: {
            type: 'FeatureCollection',
            features: [{
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [0, 0] },
              properties: {}
            } as any]
          }
        });
      }).toThrow('フィーチャー[0]は\'LineString\'または\'MultiLineString\'である必要があります');
    });

    test('座標が不足している場合にエラーを投げる', () => {
      expect(() => {
        new LineEdgeBundlingLayer({
          data: {
            type: 'FeatureCollection',
            features: [{
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: [[0, 0]]
              },
              properties: {}
            }]
          }
        });
      }).toThrow('フィーチャー[0]は少なくとも2点の座標が必要です');
    });

    test('不正な座標形式でエラーを投げる', () => {
      expect(() => {
        new LineEdgeBundlingLayer({
          data: {
            type: 'FeatureCollection',
            features: [{
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: [0, 0] as any
              },
              properties: {}
            }]
          }
        });
      }).toThrow('座標[0]は[経度, 緯度]の配列である必要があります');
    });

    test('不正な経度でエラーを投げる', () => {
      expect(() => {
        new LineEdgeBundlingLayer({
          data: {
            type: 'FeatureCollection',
            features: [{
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: [[-200, 0], [0, 0]]
              },
              properties: {}
            }]
          }
        });
      }).toThrow('経度は-180から180の範囲である必要があります');
    });

    test('不正な緯度でエラーを投げる', () => {
      expect(() => {
        new LineEdgeBundlingLayer({
          data: {
            type: 'FeatureCollection',
            features: [{
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: [[0, -100], [0, 0]]
              },
              properties: {}
            }]
          }
        });
      }).toThrow('緯度は-90から90の範囲である必要があります');
    });
  });

  describe('setProjection', () => {
    test('投影法を設定しパスを更新できる', () => {
      const layer = new LineEdgeBundlingLayer({
        data: testLineStringData
      });
      
      layer.setProjection(projection);
      expect(layer['projection']).toBe(projection);
      expect(layer['path']).toBeDefined();
    });

    test('初回描画後に投影法が変更された場合に再描画される', () => {
      const layer = new LineEdgeBundlingLayer({
        data: testLineStringData
      });
      
      layer.setProjection(projection);
      layer.render(container);
      
      // 新しい投影法を設定
      const newProjection = geoMercator().scale(500).translate([200, 150]);
      layer.setProjection(newProjection);
      
      expect(layer['projection']).toBe(newProjection);
    });
  });

  describe('render', () => {
    test('エラーなく描画できる', () => {
      const layer = new LineEdgeBundlingLayer({
        data: testLineStringData
      });
      
      layer.setProjection(projection);
      expect(() => layer.render(container)).not.toThrow();
    });

    test('レイヤーグループが作成される', () => {
      const layer = new LineEdgeBundlingLayer({
        data: testLineStringData
      });
      
      layer.setProjection(projection);
      layer.render(container);
      
      const layerGroup = container.select('.thematika-layer');
      expect(layerGroup.empty()).toBe(false);
      expect(layer.isRendered()).toBe(true);
    });

    test('バンドルされたラインが描画される', () => {
      const layer = new LineEdgeBundlingLayer({
        data: testLineStringData
      });
      
      layer.setProjection(projection);
      layer.render(container);
      
      const bundledLines = container.selectAll('.thematika-line-bundled');
      expect(bundledLines.empty()).toBe(false);
    });

    test('showOriginalLinesがtrueの場合に元のラインが描画される', () => {
      const layer = new LineEdgeBundlingLayer({
        data: testLineStringData,
        showOriginalLines: true
      });
      
      layer.setProjection(projection);
      layer.render(container);
      
      const originalLines = container.selectAll('.thematika-line-original');
      expect(originalLines.empty()).toBe(false);
    });

    test('showControlPointsがtrueの場合に制御点が描画される', () => {
      const layer = new LineEdgeBundlingLayer({
        data: testLineStringData,
        showControlPoints: true
      });
      
      layer.setProjection(projection);
      layer.render(container);
      
      const controlPoints = container.selectAll('.thematika-control-point');
      const endpoints = container.selectAll('.thematika-endpoint');
      expect(controlPoints.empty()).toBe(false);
      expect(endpoints.empty()).toBe(false);
    });

    test('投影法が設定されていない場合は描画されない', () => {
      const layer = new LineEdgeBundlingLayer({
        data: testLineStringData
      });
      
      layer.render(container);
      
      // LayerGroupは作成されるが、バンドリングデータは生成されない
      const layerGroup = container.select('.thematika-layer');
      expect(layerGroup.empty()).toBe(false);
      
      // バンドリングデータが生成されていないことを確認
      expect(layer['bundlingData']).toBeUndefined();
    });

    test('空のデータを適切に処理できる', () => {
      const layer = new LineEdgeBundlingLayer({
        data: { type: 'FeatureCollection', features: [] }
      });
      
      layer.setProjection(projection);
      expect(() => layer.render(container)).not.toThrow();
    });
  });

  describe('generateBundlingData', () => {
    test('LineStringのバンドリングデータを生成できる', () => {
      const layer = new LineEdgeBundlingLayer({
        data: testLineStringData
      });
      
      layer.setProjection(projection);
      const bundlingData = layer['generateBundlingData']();
      
      expect(bundlingData).toBeDefined();
      expect(bundlingData.nodes.length).toBeGreaterThan(0);
      expect(bundlingData.links.length).toBeGreaterThan(0);
      expect(bundlingData.paths.length).toBe(1);
    });

    test('MultiLineStringのバンドリングデータを生成できる', () => {
      const layer = new LineEdgeBundlingLayer({
        data: testMultiLineStringData
      });
      
      layer.setProjection(projection);
      const bundlingData = layer['generateBundlingData']();
      
      expect(bundlingData).toBeDefined();
      expect(bundlingData.nodes.length).toBeGreaterThan(0);
      expect(bundlingData.links.length).toBeGreaterThan(0);
      expect(bundlingData.paths.length).toBe(2); // MultiLineStringの2本のライン
    });

    test('FeatureCollectionのバンドリングデータを生成できる', () => {
      const layer = new LineEdgeBundlingLayer({
        data: testFeatureCollection
      });
      
      layer.setProjection(projection);
      const bundlingData = layer['generateBundlingData']();
      
      expect(bundlingData).toBeDefined();
      expect(bundlingData.nodes.length).toBeGreaterThan(0);
      expect(bundlingData.links.length).toBeGreaterThan(0);
      expect(bundlingData.paths.length).toBe(3); // LineString 1本 + MultiLineString 2本
    });
  });

  describe('calculateSegmentSteps', () => {
    test('セグメントステップを自動計算できる', () => {
      const layer = new LineEdgeBundlingLayer({
        data: testLineStringData,
        segmentSteps: 'auto'
      });
      
      const steps1 = layer['calculateSegmentSteps'](100); // 短い距離
      const steps2 = layer['calculateSegmentSteps'](500); // 長い距離
      
      expect(steps1).toBeGreaterThanOrEqual(3);
      expect(steps1).toBeLessThanOrEqual(10);
      expect(steps2).toBeGreaterThanOrEqual(3);
      expect(steps2).toBeLessThanOrEqual(10);
      expect(steps2).toBeGreaterThanOrEqual(steps1);
    });

    test('指定された固定セグメントステップを使用できる', () => {
      const layer = new LineEdgeBundlingLayer({
        data: testLineStringData,
        segmentSteps: 5
      });
      
      const steps = layer['calculateSegmentSteps'](100);
      expect(steps).toBe(5);
    });

    test('最小セグメントステップを強制できる', () => {
      const layer = new LineEdgeBundlingLayer({
        data: testLineStringData,
        segmentSteps: 1
      });
      
      const steps = layer['calculateSegmentSteps'](100);
      expect(steps).toBe(2); // 最小値
    });
  });

  describe('setBundlingStrength', () => {
    test('バンドリング強度を有効な範囲内で設定できる', () => {
      const layer = new LineEdgeBundlingLayer({
        data: testLineStringData
      });
      
      layer.setBundlingStrength(0.5);
      expect(layer['bundlingStrength']).toBe(0.5);
      
      layer.setBundlingStrength(-0.1);
      expect(layer['bundlingStrength']).toBe(0);
      
      layer.setBundlingStrength(1.1);
      expect(layer['bundlingStrength']).toBe(1);
    });
  });

  describe('getSimulation', () => {
    test('描画後にシミュレーションを返すことができる', () => {
      const layer = new LineEdgeBundlingLayer({
        data: testLineStringData,
        animateForce: true
      });
      
      layer.setProjection(projection);
      layer.render(container);
      
      const simulation = layer.getSimulation();
      expect(simulation).toBeDefined();
    });

    test('animateForceがfalseの場合はundefinedを返す', () => {
      const layer = new LineEdgeBundlingLayer({
        data: testLineStringData,
        animateForce: false
      });
      
      layer.setProjection(projection);
      layer.render(container);
      
      const simulation = layer.getSimulation();
      expect(simulation).toBeUndefined();
    });
  });


  describe('destroy', () => {
    test('シミュレーションを停止しクリーンアップできる', () => {
      const layer = new LineEdgeBundlingLayer({
        data: testLineStringData,
        animateForce: true
      });
      
      layer.setProjection(projection);
      layer.render(container);
      
      const simulation = layer.getSimulation();
      expect(simulation).toBeDefined();
      
      layer.destroy();
      
      expect(layer.getSimulation()).toBeUndefined();
      expect(layer.isRendered()).toBe(false);
    });
  });
});