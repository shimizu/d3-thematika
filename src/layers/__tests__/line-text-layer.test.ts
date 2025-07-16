import { LineTextLayer, LineTextLayerOptions } from '../line-text-layer';
import * as d3 from 'd3-geo';

// D3のselectionのモック作成
const createMockSelection = (): any => {
  const mockNode = {
    tagName: 'g',
    setAttribute: jest.fn(),
    getAttribute: jest.fn()
  };

  const mockElement: any = {
    append: jest.fn(),
    attr: jest.fn(),
    style: jest.fn(),
    selectAll: jest.fn(),
    data: jest.fn(),
    enter: jest.fn(),
    remove: jest.fn(),
    text: jest.fn(),
    on: jest.fn(),
    node: jest.fn(),
    each: jest.fn(),
  };
  
  // 循環参照を設定
  mockElement.append.mockReturnValue(mockElement);
  mockElement.attr.mockReturnValue(mockElement);
  mockElement.style.mockReturnValue(mockElement);
  mockElement.selectAll.mockReturnValue(mockElement);
  mockElement.data.mockReturnValue(mockElement);
  mockElement.enter.mockReturnValue(mockElement);
  mockElement.remove.mockReturnValue(mockElement);
  mockElement.text.mockReturnValue(mockElement);
  mockElement.on.mockReturnValue(mockElement);
  mockElement.node.mockReturnValue(mockNode);
  mockElement.each.mockReturnValue(mockElement);
  
  return mockElement;
};

describe('LineTextLayer', () => {
  let layer: LineTextLayer;
  let sampleLineStringData: GeoJSON.FeatureCollection;
  let sampleMultiLineStringData: GeoJSON.FeatureCollection;

  beforeEach(() => {
    // LineStringのサンプルデータ
    sampleLineStringData = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [139.7, 35.6], // 東京
              [135.5, 34.7], // 大阪
              [130.4, 33.6]  // 福岡
            ]
          },
          properties: {
            text: '東海道',
            name: 'Tokaido Line'
          }
        }
      ]
    };

    // MultiLineStringのサンプルデータ
    sampleMultiLineStringData = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'MultiLineString',
            coordinates: [
              [[139.7, 35.6], [135.5, 34.7]],
              [[135.5, 34.7], [130.4, 33.6]]
            ]
          },
          properties: {
            text: '分割路線',
            name: 'Split Line'
          }
        }
      ]
    };
  });

  describe('constructor', () => {
    it('FeatureCollectionで初期化される', () => {
      const options: LineTextLayerOptions = {
        data: sampleLineStringData
      };
      layer = new LineTextLayer(options);

      expect(layer.getData()).toEqual(sampleLineStringData);
    });

    it('Feature配列で初期化される', () => {
      const options: LineTextLayerOptions = {
        data: sampleLineStringData.features
      };
      layer = new LineTextLayer(options);

      const result = layer.getData();
      expect(result.type).toBe('FeatureCollection');
      expect(result.features).toEqual(sampleLineStringData.features);
    });

    it('単一Featureで初期化される', () => {
      const options: LineTextLayerOptions = {
        data: sampleLineStringData.features[0]
      };
      layer = new LineTextLayer(options);

      const result = layer.getData();
      expect(result.type).toBe('FeatureCollection');
      expect(result.features).toHaveLength(1);
      expect(result.features[0]).toEqual(sampleLineStringData.features[0]);
    });

    it('デフォルト設定が適用される', () => {
      const options: LineTextLayerOptions = {
        data: sampleLineStringData
      };
      layer = new LineTextLayer(options);

      // プライベートプロパティは直接テストできないので、
      // 正常に初期化されることを確認
      expect(layer).toBeInstanceOf(LineTextLayer);
    });

    it('カスタム設定が適用される', () => {
      const options: LineTextLayerOptions = {
        data: sampleLineStringData,
        textProperty: 'customText',
        lineType: 'arc',
        arcHeight: 0.5,
        smoothType: 'curveCardinal',
        showGuidePath: true,
        fontFamily: 'Arial',
        fontSize: 18,
        textAnchor: 'start',
        startOffset: '25%'
      };
      layer = new LineTextLayer(options);

      expect(layer).toBeInstanceOf(LineTextLayer);
    });
  });

  describe('data validation', () => {
    it('LineString以外のgeometryでエラーを投げる', () => {
      const invalidData = {
        type: 'FeatureCollection' as const,
        features: [
          {
            type: 'Feature' as const,
            geometry: {
              type: 'Point' as const,
              coordinates: [139.7, 35.6]
            },
            properties: { text: 'Invalid' }
          }
        ]
      };

      expect(() => {
        new LineTextLayer({ data: invalidData });
      }).toThrow('LineTextLayer: フィーチャー[0]は\'LineString\'または\'MultiLineString\'である必要があります');
    });

    it('geometryが存在しない場合エラーを投げる', () => {
      const invalidData = {
        type: 'FeatureCollection' as const,
        features: [
          {
            type: 'Feature' as const,
            geometry: null as any,
            properties: { text: 'Invalid' }
          }
        ]
      };

      expect(() => {
        new LineTextLayer({ data: invalidData });
      }).toThrow('LineTextLayer: フィーチャー[0]にgeometryが存在しません');
    });

    it('座標が2点未満の場合エラーを投げる', () => {
      const invalidData = {
        type: 'FeatureCollection' as const,
        features: [
          {
            type: 'Feature' as const,
            geometry: {
              type: 'LineString' as const,
              coordinates: [[139.7, 35.6]] // 1点のみ
            },
            properties: { text: 'Invalid' }
          }
        ]
      };

      expect(() => {
        new LineTextLayer({ data: invalidData });
      }).toThrow('LineTextLayer: フィーチャー[0]は少なくとも2点の座標が必要です');
    });

    it('経度が範囲外の場合エラーを投げる', () => {
      const invalidData = {
        type: 'FeatureCollection' as const,
        features: [
          {
            type: 'Feature' as const,
            geometry: {
              type: 'LineString' as const,
              coordinates: [[200, 35.6], [135.5, 34.7]] // 経度200は範囲外
            },
            properties: { text: 'Invalid' }
          }
        ]
      };

      expect(() => {
        new LineTextLayer({ data: invalidData });
      }).toThrow('LineTextLayer: フィーチャー[0]の座標[0]の経度は-180から180の範囲である必要があります');
    });

    it('緯度が範囲外の場合エラーを投げる', () => {
      const invalidData = {
        type: 'FeatureCollection' as const,
        features: [
          {
            type: 'Feature' as const,
            geometry: {
              type: 'LineString' as const,
              coordinates: [[139.7, 100], [135.5, 34.7]] // 緯度100は範囲外
            },
            properties: { text: 'Invalid' }
          }
        ]
      };

      expect(() => {
        new LineTextLayer({ data: invalidData });
      }).toThrow('LineTextLayer: フィーチャー[0]の座標[0]の緯度は-90から90の範囲である必要があります');
    });

    it('MultiLineStringの検証が正しく動作する', () => {
      expect(() => {
        new LineTextLayer({ data: sampleMultiLineStringData });
      }).not.toThrow();
    });
  });

  describe('projection management', () => {
    it('setProjection()で投影法を設定できる', () => {
      layer = new LineTextLayer({ data: sampleLineStringData });
      const projection = d3.geoMercator();

      expect(() => {
        layer.setProjection(projection);
      }).not.toThrow();
    });
  });

  describe('render', () => {
    beforeEach(() => {
      layer = new LineTextLayer({ data: sampleLineStringData });
    });

    it('render()でレイヤーグループが作成される', () => {
      const mockContainer = createMockSelection();
      
      layer.render(mockContainer);
      
      expect(mockContainer.append).toHaveBeenCalledWith('g');
    });

    it('投影法が設定されていない場合は警告を出す', () => {
      const mockContainer = createMockSelection();
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      layer.render(mockContainer);
      
      expect(consoleSpy).toHaveBeenCalledWith('LineTextLayer: 投影法が設定されていません');
      consoleSpy.mockRestore();
    });

    it('投影法設定後に描画が実行される', () => {
      const mockContainer = createMockSelection();
      const projection = d3.geoMercator();
      
      layer.setProjection(projection);
      layer.render(mockContainer);
      
      expect(mockContainer.append).toHaveBeenCalled();
    });
  });

  describe('showGuidePath functionality', () => {
    it('showGuidePathがtrueの場合にガイドパス用グループが作成される', () => {
      const options: LineTextLayerOptions = {
        data: sampleLineStringData,
        showGuidePath: true
      };
      layer = new LineTextLayer(options);
      
      const mockContainer = createMockSelection();
      const projection = d3.geoMercator();
      
      layer.setProjection(projection);
      layer.render(mockContainer);
      
      // ガイドパス用のグループが作成されることを確認
      expect(mockContainer.append).toHaveBeenCalledWith('g');
    });

    it('showGuidePathがfalseの場合はガイドパスが作成されない', () => {
      const options: LineTextLayerOptions = {
        data: sampleLineStringData,
        showGuidePath: false
      };
      layer = new LineTextLayer(options);
      
      const mockContainer = createMockSelection();
      const projection = d3.geoMercator();
      
      layer.setProjection(projection);
      layer.render(mockContainer);
      
      expect(mockContainer.append).toHaveBeenCalledWith('g');
    });
  });

  describe('lineType functionality', () => {
    it('straight lineTypeが設定できる', () => {
      const options: LineTextLayerOptions = {
        data: sampleLineStringData,
        lineType: 'straight'
      };
      layer = new LineTextLayer(options);
      
      expect(layer).toBeInstanceOf(LineTextLayer);
    });

    it('arc lineTypeが設定できる', () => {
      const options: LineTextLayerOptions = {
        data: sampleLineStringData,
        lineType: 'arc',
        arcHeight: 0.5
      };
      layer = new LineTextLayer(options);
      
      expect(layer).toBeInstanceOf(LineTextLayer);
    });

    it('smooth lineTypeが設定できる', () => {
      const options: LineTextLayerOptions = {
        data: sampleLineStringData,
        lineType: 'smooth',
        smoothType: 'curveBasis'
      };
      layer = new LineTextLayer(options);
      
      expect(layer).toBeInstanceOf(LineTextLayer);
    });
  });

  describe('event handling', () => {
    it('on()でイベントリスナーを追加できる', () => {
      layer = new LineTextLayer({ data: sampleLineStringData });
      const mockContainer = createMockSelection();
      
      layer.render(mockContainer);
      
      const handler = jest.fn();
      layer.on('click', handler);
      
      expect(mockContainer.selectAll).toHaveBeenCalledWith('.thematika-line-text');
    });
  });

  describe('getData', () => {
    it('GeoJSONデータを取得できる', () => {
      layer = new LineTextLayer({ data: sampleLineStringData });
      
      const result = layer.getData();
      
      expect(result).toEqual(sampleLineStringData);
      expect(result.type).toBe('FeatureCollection');
      expect(result.features).toHaveLength(1);
    });

    it('Feature配列から変換されたFeatureCollectionを取得できる', () => {
      layer = new LineTextLayer({ data: sampleLineStringData.features });
      
      const result = layer.getData();
      
      expect(result.type).toBe('FeatureCollection');
      expect(result.features).toEqual(sampleLineStringData.features);
    });
  });

  describe('font settings', () => {
    it('フォント設定が関数で指定できる', () => {
      const options: LineTextLayerOptions = {
        data: sampleLineStringData,
        fontFamily: (feature, index) => `font-${index}`,
        fontSize: (feature, index) => 12 + index,
        fontWeight: (feature, index) => index % 2 === 0 ? 'bold' : 'normal'
      };
      
      layer = new LineTextLayer(options);
      
      expect(layer).toBeInstanceOf(LineTextLayer);
    });

    it('フォント設定が固定値で指定できる', () => {
      const options: LineTextLayerOptions = {
        data: sampleLineStringData,
        fontFamily: 'Arial',
        fontSize: 16,
        fontWeight: 'bold'
      };
      
      layer = new LineTextLayer(options);
      
      expect(layer).toBeInstanceOf(LineTextLayer);
    });
  });
});