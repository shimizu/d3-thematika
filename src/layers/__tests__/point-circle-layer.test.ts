import { PointCircleLayer } from '../point-circle-layer';
import { LayerAttributes } from '../../types';

describe('PointCircleLayer', () => {
  let pointCircleLayer: PointCircleLayer;
  let mockContainer: any;
  let mockProjection: any;
  let sampleGeoJSON: GeoJSON.FeatureCollection;

  beforeEach(() => {
    // サンプルGeoJSONデータ（Point、Polygon、LineStringを含む）
    sampleGeoJSON = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { name: 'Test Point', population: 100000 },
          geometry: {
            type: 'Point',
            coordinates: [5, 5]
          }
        },
        {
          type: 'Feature',
          properties: { name: 'Test Polygon', population: 500000 },
          geometry: {
            type: 'Polygon',
            coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]]
          }
        },
        {
          type: 'Feature',
          properties: { name: 'Test LineString', population: 200000 },
          geometry: {
            type: 'LineString',
            coordinates: [[0, 0], [5, 5], [10, 10]]
          }
        }
      ]
    };

    pointCircleLayer = new PointCircleLayer({
      data: sampleGeoJSON,
      r: 5,
      attributes: {
        fill: '#ff0000',
        stroke: '#000000',
        strokeWidth: 1
      }
    });

    // モック投影法
    mockProjection = jest.fn((coord) => [coord[0] * 10, coord[1] * 10]);

    // モックコンテナの設定
    const mockCircleElement = {
      attr: jest.fn().mockReturnThis(),
      style: jest.fn().mockReturnThis(),
      on: jest.fn().mockReturnThis()
    };

    const mockEnterSelection = {
      append: jest.fn(() => mockCircleElement)
    };

    const mockDataSelection = {
      enter: jest.fn(() => mockEnterSelection),
      exit: jest.fn().mockReturnThis(),
      remove: jest.fn().mockReturnThis(),
      attr: jest.fn().mockReturnThis(),
      style: jest.fn().mockReturnThis(),
      on: jest.fn().mockReturnThis()
    };

    const mockSubSelection = {
      remove: jest.fn().mockReturnThis(),
      on: jest.fn().mockReturnThis(),
      attr: jest.fn().mockReturnThis(),
      style: jest.fn().mockReturnThis(),
      data: jest.fn(() => mockDataSelection),
      empty: jest.fn(() => false)
    };

    mockContainer = {
      append: jest.fn().mockReturnThis(),
      attr: jest.fn().mockReturnThis(),
      style: jest.fn().mockReturnThis(),
      selectAll: jest.fn(() => mockSubSelection),
      data: jest.fn().mockReturnThis(),
      enter: jest.fn().mockReturnThis(),
      node: jest.fn(() => ({
        tagName: 'g',
        remove: jest.fn()
      })),
      on: jest.fn().mockReturnThis()
    };
  });

  describe('constructor', () => {
    test('GeoJSONデータが正しく設定される', () => {
      expect(pointCircleLayer.getData()).toEqual(sampleGeoJSON);
    });

    test('配列形式のデータがFeatureCollectionに変換される', () => {
      const arrayData = sampleGeoJSON.features;
      const layer = new PointCircleLayer({ data: arrayData });
      
      const result = layer.getData();
      expect(result.type).toBe('FeatureCollection');
      expect(result.features).toEqual(arrayData);
    });

    test('固定半径が正しく設定される', () => {
      const layer = new PointCircleLayer({
        data: sampleGeoJSON,
        r: 10
      });

      const radiusFunction = layer['radiusFunction'];
      expect(radiusFunction({} as any, 0)).toBe(10);
    });

    test('関数型半径が正しく設定される', () => {
      const radiusFunc = (feature: GeoJSON.Feature, index: number) => index + 5;
      const layer = new PointCircleLayer({
        data: sampleGeoJSON,
        r: radiusFunc
      });

      const radiusFunction = layer['radiusFunction'];
      expect(radiusFunction({} as any, 2)).toBe(7);
    });

    test('デフォルト半径が適用される', () => {
      const layer = new PointCircleLayer({
        data: sampleGeoJSON
      });

      const radiusFunction = layer['radiusFunction'];
      expect(radiusFunction({} as any, 0)).toBe(5);
    });

    test('スタイル設定が正しく適用される', () => {
      const customStyle = {
        fill: 'blue',
        stroke: 'red',
        strokeWidth: 2
      };

      const layer = new PointCircleLayer({
        data: sampleGeoJSON,
        attributes: customStyle
      });

      expect(layer['attributes'].fill).toBe('blue');
      expect(layer['attributes'].stroke).toBe('red');
      expect(layer['attributes'].strokeWidth).toBe(2);
    });

    test('attr設定がstyleよりも優先される', () => {
      const layer = new PointCircleLayer({
        data: sampleGeoJSON,
        attributes: { fill: 'green' }
      });

      expect(layer['attributes'].fill).toBe('green');
    });
  });

  describe('projection management', () => {
    test('setProjection()で投影法を設定できる', () => {
      pointCircleLayer.setProjection(mockProjection);
      expect(pointCircleLayer['projection']).toBe(mockProjection);
    });

  });


  describe('render', () => {
    test('render()でレイヤーグループが作成される', () => {
      pointCircleLayer.render(mockContainer);

      expect(mockContainer.append).toHaveBeenCalledWith('g');
      expect(mockContainer.attr).toHaveBeenCalledWith('class', expect.stringContaining('thematika-layer'));
    });

    test('投影法が設定されていない場合は描画されない', () => {
      pointCircleLayer.render(mockContainer);
      
      // projectionが未設定の場合は早期リターン
      expect(mockContainer.selectAll).not.toHaveBeenCalled();
    });

    test('投影法設定後に描画が実行される', () => {
      pointCircleLayer.setProjection(mockProjection);
      pointCircleLayer.render(mockContainer);

      expect(pointCircleLayer.isRendered()).toBe(true);
    });
  });


  describe('event handling', () => {
    test('on()でイベントリスナーを追加できる', () => {
      const handler = jest.fn();
      const mockCircleSelection = {
        on: jest.fn()
      };
      const mockLayerGroup = {
        selectAll: jest.fn(() => mockCircleSelection)
      };

      pointCircleLayer['layerGroup'] = mockLayerGroup as any;
      pointCircleLayer.on('click', handler);

      expect(mockLayerGroup.selectAll).toHaveBeenCalledWith('circle');
      expect(mockCircleSelection.on).toHaveBeenCalledWith('click', expect.any(Function));
    });

    test('レイヤーグループが未設定の場合はイベント登録されない', () => {
      const handler = jest.fn();
      
      pointCircleLayer.on('click', handler);

      // layerGroupが未設定の場合は何も実行されない
      expect(mockContainer.on).not.toHaveBeenCalled();
    });
  });

  describe('style application', () => {
    test('動的スタイル関数が適用される', () => {
      const dynamicLayer = new PointCircleLayer({
        data: sampleGeoJSON,
        attributes: {
          fill: (d, i) => (i || 0) % 2 === 0 ? 'red' : 'blue',
          strokeWidth: (d) => d.properties?.population > 300000 ? 2 : 1
        }
      });

      expect(typeof dynamicLayer['attributes'].fill).toBe('function');
      expect(typeof dynamicLayer['attributes'].strokeWidth).toBe('function');

      // 関数の実行テスト
      const fillResult = (dynamicLayer['attributes'].fill as Function)(sampleGeoJSON.features[0], 0);
      expect(fillResult).toBe('red');

      const strokeResult = (dynamicLayer['attributes'].strokeWidth as Function)(sampleGeoJSON.features[1]);
      expect(strokeResult).toBe(2);
    });

  });

  describe('geometry handling', () => {
    test('Point geometryの座標が正しく処理される', () => {
      const pointFeature: GeoJSON.Feature = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Point',
          coordinates: [10, 20]
        }
      };

      const layer = new PointCircleLayer({
        data: { type: 'FeatureCollection', features: [pointFeature] }
      });
      layer['projection'] = mockProjection;
      layer['layerGroup'] = mockContainer;
      layer.render(mockContainer);

      // renderCircles内でPoint座標が直接使用されることを確認
      expect(mockProjection).toHaveBeenCalledWith([10, 20]);
    });

    test('Polygon geometryの中心点が計算される', () => {
      const polygonFeature: GeoJSON.Feature = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]]
        }
      };

      const layer = new PointCircleLayer({
        data: { type: 'FeatureCollection', features: [polygonFeature] }
      });
      layer['projection'] = mockProjection;
      layer['layerGroup'] = mockContainer;
      layer.render(mockContainer);

      // 中心点が計算されて投影法に渡されることを確認（具体的な値は getCentroid の実装に依存）
      expect(mockProjection).toHaveBeenCalled();
    });
  });

  describe('feature properties', () => {
    test('フィーチャープロパティが正しく取得される', () => {
      const data = pointCircleLayer.getData();
      const firstFeature = data.features[0];

      expect(firstFeature.properties?.name).toBe('Test Point');
      expect(firstFeature.properties?.population).toBe(100000);
    });

    test('異なるジオメトリタイプが正しく設定される', () => {
      const data = pointCircleLayer.getData();
      
      expect(data.features[0].geometry.type).toBe('Point');
      expect(data.features[1].geometry.type).toBe('Polygon');
      expect(data.features[2].geometry.type).toBe('LineString');
    });
  });

  describe('CSS class application', () => {
    test('カスタムクラス名が適用される', () => {
      const layerWithClass = new PointCircleLayer({
        data: sampleGeoJSON,
        attributes: {
          className: 'custom-circle-layer'
        }
      });

      expect(layerWithClass['attributes'].className).toBe('custom-circle-layer');
    });

    test('フィーチャー固有のクラスが適用される', () => {
      const geoJSONWithClass: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          properties: { class: 'important-point' },
          geometry: {
            type: 'Point',
            coordinates: [5, 5]
          }
        }]
      };

      const layer = new PointCircleLayer({ data: geoJSONWithClass });
      const feature = layer.getData().features[0];

      expect(feature.properties?.class).toBe('important-point');
    });
  });
});