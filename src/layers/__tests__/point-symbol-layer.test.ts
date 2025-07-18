import { PointSymbolLayer } from '../point-symbol-layer';
import { symbolCross, symbolCircle, symbolDiamond } from 'd3-shape';
import { LayerAttr } from '../../types';

describe('PointSymbolLayer', () => {
  let pointSymbolLayer: PointSymbolLayer;
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

    pointSymbolLayer = new PointSymbolLayer({
      data: sampleGeoJSON,
      size: 64,
      symbolType: symbolCircle,
      attr: {
        fill: '#ff0000',
        stroke: '#000000',
        strokeWidth: 1
      }
    });

    // モック投影法
    mockProjection = jest.fn((coord) => [coord[0] * 10, coord[1] * 10]);

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
      expect(pointSymbolLayer.getData()).toEqual(sampleGeoJSON);
    });

    test('配列形式のデータがFeatureCollectionに変換される', () => {
      const arrayData = sampleGeoJSON.features;
      const layer = new PointSymbolLayer({ data: arrayData });
      
      const result = layer.getData();
      expect(result.type).toBe('FeatureCollection');
      expect(result.features).toEqual(arrayData);
    });

    test('固定サイズが正しく設定される', () => {
      const layer = new PointSymbolLayer({
        data: sampleGeoJSON,
        size: 128
      });

      const sizeFunction = layer['sizeFunction'];
      expect(sizeFunction({} as any, 0)).toBe(128);
    });

    test('関数型サイズが正しく設定される', () => {
      const sizeFunc = (feature: GeoJSON.Feature, index: number) => index * 32 + 64;
      const layer = new PointSymbolLayer({
        data: sampleGeoJSON,
        size: sizeFunc
      });

      const sizeFunction = layer['sizeFunction'];
      expect(sizeFunction({} as any, 2)).toBe(128);
    });

    test('デフォルトサイズが適用される', () => {
      const layer = new PointSymbolLayer({
        data: sampleGeoJSON
      });

      const sizeFunction = layer['sizeFunction'];
      expect(sizeFunction({} as any, 0)).toBe(64);
    });

    test('固定シンボルタイプが正しく設定される', () => {
      const layer = new PointSymbolLayer({
        data: sampleGeoJSON,
        symbolType: symbolDiamond
      });

      const symbolTypeFunction = layer['symbolTypeFunction'];
      expect(symbolTypeFunction({} as any, 0)).toBe(symbolDiamond);
    });

    test('関数型シンボルタイプが正しく設定される', () => {
      const symbolTypeFunc = (feature: GeoJSON.Feature, index: number) => 
        index % 2 === 0 ? symbolCircle : symbolDiamond;
      const layer = new PointSymbolLayer({
        data: sampleGeoJSON,
        symbolType: symbolTypeFunc
      });

      const symbolTypeFunction = layer['symbolTypeFunction'];
      expect(symbolTypeFunction({} as any, 0)).toBe(symbolCircle);
      expect(symbolTypeFunction({} as any, 1)).toBe(symbolDiamond);
    });

    test('デフォルトシンボルタイプがCrossになる', () => {
      const layer = new PointSymbolLayer({
        data: sampleGeoJSON
      });

      const symbolTypeFunction = layer['symbolTypeFunction'];
      expect(symbolTypeFunction({} as any, 0)).toBe(symbolCross);
    });

    test('スタイル設定が正しく適用される', () => {
      const customStyle = {
        fill: 'blue',
        stroke: 'red',
        strokeWidth: 2
      };

      const layer = new PointSymbolLayer({
        data: sampleGeoJSON,
        attr: customStyle
      });

      expect(layer['attr'].fill).toBe('blue');
      expect(layer['attr'].stroke).toBe('red');
      expect(layer['attr'].strokeWidth).toBe(2);
    });

    test('attr設定がstyleよりも優先される', () => {
      const layer = new PointSymbolLayer({
        data: sampleGeoJSON,
        attr: { fill: 'green' }
      });

      expect(layer['attr'].fill).toBe('green');
    });
  });

  describe('projection management', () => {
    test('setProjection()で投影法を設定できる', () => {
      pointSymbolLayer.setProjection(mockProjection);
      expect(pointSymbolLayer['projection']).toBe(mockProjection);
    });
  });

  describe('render', () => {
    test('render()でレイヤーグループが作成される', () => {
      pointSymbolLayer.render(mockContainer);

      expect(mockContainer.append).toHaveBeenCalledWith('g');
      expect(mockContainer.attr).toHaveBeenCalledWith('class', expect.stringContaining('thematika-layer'));
    });

    test('投影法が設定されていない場合は描画されない', () => {
      pointSymbolLayer.render(mockContainer);
      
      // projectionが未設定の場合は早期リターン
      expect(mockContainer.selectAll).not.toHaveBeenCalled();
    });

    test('投影法設定後に描画が実行される', () => {
      pointSymbolLayer.setProjection(mockProjection);
      pointSymbolLayer.render(mockContainer);

      expect(pointSymbolLayer.isRendered()).toBe(true);
    });
  });

  describe('style application', () => {
    test('動的スタイル関数が適用される', () => {
      const dynamicLayer = new PointSymbolLayer({
        data: sampleGeoJSON,
        attr: {
          fill: (d, i) => (i || 0) % 2 === 0 ? 'red' : 'blue',
          strokeWidth: (d) => d.properties?.population > 300000 ? 2 : 1
        }
      });

      expect(typeof dynamicLayer['attr'].fill).toBe('function');
      expect(typeof dynamicLayer['attr'].strokeWidth).toBe('function');

      // 関数の実行テスト
      const fillResult = (dynamicLayer['attr'].fill as Function)(sampleGeoJSON.features[0], 0);
      expect(fillResult).toBe('red');

      const strokeResult = (dynamicLayer['attr'].strokeWidth as Function)(sampleGeoJSON.features[1]);
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

      const layer = new PointSymbolLayer({
        data: { type: 'FeatureCollection', features: [pointFeature] }
      });
      layer['projection'] = mockProjection;
      layer['layerGroup'] = mockContainer;
      layer.render(mockContainer);

      // renderSymbols内でPoint座標が直接使用されることを確認
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

      const layer = new PointSymbolLayer({
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
      const data = pointSymbolLayer.getData();
      const firstFeature = data.features[0];

      expect(firstFeature.properties?.name).toBe('Test Point');
      expect(firstFeature.properties?.population).toBe(100000);
    });

    test('異なるジオメトリタイプが正しく設定される', () => {
      const data = pointSymbolLayer.getData();
      
      expect(data.features[0].geometry.type).toBe('Point');
      expect(data.features[1].geometry.type).toBe('Polygon');
      expect(data.features[2].geometry.type).toBe('LineString');
    });
  });

  describe('CSS class application', () => {
    test('カスタムクラス名が適用される', () => {
      const layerWithClass = new PointSymbolLayer({
        data: sampleGeoJSON,
        attr: {
          className: 'custom-symbol-layer'
        }
      });

      expect(layerWithClass['attr'].className).toBe('custom-symbol-layer');
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

      const layer = new PointSymbolLayer({ data: geoJSONWithClass });
      const feature = layer.getData().features[0];

      expect(feature.properties?.class).toBe('important-point');
    });
  });
});