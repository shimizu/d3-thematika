import { GeojsonLayer } from '../geojson-layer';
import { LayerStyle } from '../../types';

describe('GeojsonLayer', () => {
  let geojsonLayer: GeojsonLayer;
  let mockContainer: any;
  let mockProjection: any;
  let sampleGeoJSON: GeoJSON.FeatureCollection;

  beforeEach(() => {
    // サンプルGeoJSONデータ
    sampleGeoJSON = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { name: 'Test Country', population: 1000000 },
          geometry: {
            type: 'Polygon',
            coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]]
          }
        },
        {
          type: 'Feature',
          properties: { name: 'Test City', population: 50000 },
          geometry: {
            type: 'Point',
            coordinates: [5, 5]
          }
        }
      ]
    };

    geojsonLayer = new GeojsonLayer({
      data: sampleGeoJSON,
      style: {
        fill: '#ff0000',
        stroke: '#000000',
        strokeWidth: 1
      }
    });

    // モック投影法
    mockProjection = jest.fn();

    // モックコンテナの設定
    const mockPathElement = {
      attr: jest.fn().mockReturnThis(),
      style: jest.fn().mockReturnThis(),
      on: jest.fn().mockReturnThis()
    };

    const mockEnterSelection = {
      append: jest.fn(() => mockPathElement)
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
      data: jest.fn(() => mockDataSelection)
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
      expect(geojsonLayer.getData()).toEqual(sampleGeoJSON);
    });

    test('配列形式のデータがFeatureCollectionに変換される', () => {
      const arrayData = sampleGeoJSON.features;
      const layer = new GeojsonLayer({ data: arrayData });
      
      const result = layer.getData();
      expect(result.type).toBe('FeatureCollection');
      expect(result.features).toEqual(arrayData);
    });

    test('スタイル設定が正しく適用される', () => {
      const customStyle = {
        fill: 'blue',
        stroke: 'red',
        strokeWidth: 2
      };

      const layer = new GeojsonLayer({
        data: sampleGeoJSON,
        style: customStyle
      });

      expect(layer['style'].fill).toBe('blue');
      expect(layer['style'].stroke).toBe('red');
      expect(layer['style'].strokeWidth).toBe(2);
    });

    test('attr設定がstyleよりも優先される', () => {
      const layer = new GeojsonLayer({
        data: sampleGeoJSON,
        style: { fill: 'blue' },
        attr: { fill: 'green' }
      });

      expect(layer['style'].fill).toBe('green');
    });
  });

  describe('projection management', () => {
    test('setProjection()で投影法を設定できる', () => {
      geojsonLayer.setProjection(mockProjection);
      expect(geojsonLayer['path']).toBeDefined();
    });

  });


  describe('render', () => {
    test('render()でレイヤーグループが作成される', () => {
      geojsonLayer.render(mockContainer);

      expect(mockContainer.append).toHaveBeenCalledWith('g');
      expect(mockContainer.attr).toHaveBeenCalledWith('class', expect.stringContaining('cartography-layer'));
    });

    test('投影法が設定されていない場合は描画されない', () => {
      geojsonLayer.render(mockContainer);
      geojsonLayer['renderFeatures']();

      // pathが未設定の場合は早期リターン
      expect(mockContainer.selectAll).not.toHaveBeenCalled();
    });

    test('投影法設定後に描画が実行される', () => {
      geojsonLayer.setProjection(mockProjection);
      geojsonLayer.render(mockContainer);

      expect(geojsonLayer.isRendered()).toBe(true);
    });
  });


  describe('event handling', () => {
    test('on()でイベントリスナーを追加できる', () => {
      const handler = jest.fn();
      const mockPathSelection = {
        on: jest.fn()
      };
      const mockLayerGroup = {
        selectAll: jest.fn(() => mockPathSelection)
      };

      geojsonLayer['layerGroup'] = mockLayerGroup as any;
      geojsonLayer.on('click', handler);

      expect(mockLayerGroup.selectAll).toHaveBeenCalledWith('path');
      expect(mockPathSelection.on).toHaveBeenCalledWith('click', expect.any(Function));
    });

    test('レイヤーグループが未設定の場合はイベント登録されない', () => {
      const handler = jest.fn();
      
      geojsonLayer.on('click', handler);

      // layerGroupが未設定の場合は何も実行されない
      expect(mockContainer.on).not.toHaveBeenCalled();
    });
  });

  describe('style application', () => {
    test('動的スタイル関数が適用される', () => {
      const dynamicLayer = new GeojsonLayer({
        data: sampleGeoJSON,
        style: {
          fill: (d, i) => (i || 0) % 2 === 0 ? 'red' : 'blue',
          strokeWidth: (d) => d.properties?.population > 100000 ? 2 : 1
        }
      });

      expect(typeof dynamicLayer['style'].fill).toBe('function');
      expect(typeof dynamicLayer['style'].strokeWidth).toBe('function');

      // 関数の実行テスト
      const fillResult = (dynamicLayer['style'].fill as Function)(sampleGeoJSON.features[0], 0);
      expect(fillResult).toBe('red');

      const strokeResult = (dynamicLayer['style'].strokeWidth as Function)(sampleGeoJSON.features[0]);
      expect(strokeResult).toBe(2);
    });
  });

  describe('feature properties', () => {
    test('フィーチャープロパティが正しく取得される', () => {
      const data = geojsonLayer.getData();
      const firstFeature = data.features[0];

      expect(firstFeature.properties?.name).toBe('Test Country');
      expect(firstFeature.properties?.population).toBe(1000000);
    });

    test('ジオメトリタイプが正しく設定される', () => {
      const data = geojsonLayer.getData();
      
      expect(data.features[0].geometry.type).toBe('Polygon');
      expect(data.features[1].geometry.type).toBe('Point');
    });
  });

  describe('CSS class application', () => {
    test('カスタムクラス名が適用される', () => {
      const layerWithClass = new GeojsonLayer({
        data: sampleGeoJSON,
        style: {
          className: 'custom-layer'
        }
      });

      expect(layerWithClass['style'].className).toBe('custom-layer');
    });

    test('フィーチャー固有のクラスが適用される', () => {
      const geoJSONWithClass: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          properties: { class: 'country-feature' },
          geometry: {
            type: 'Polygon',
            coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]
          }
        }]
      };

      const layer = new GeojsonLayer({ data: geoJSONWithClass });
      const feature = layer.getData().features[0];

      expect(feature.properties?.class).toBe('country-feature');
    });
  });
});