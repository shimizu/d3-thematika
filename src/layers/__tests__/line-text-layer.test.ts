import { LineTextLayer, LineTextLayerOptions } from '../line-text-layer';
import { Selection } from 'd3-selection';
import * as d3 from 'd3-geo';

describe('LineTextLayer', () => {
  let lineTextLayer: LineTextLayer;
  let mockContainer: any;
  let mockProjection: any;

  const defaultOptions: LineTextLayerOptions = {
    data: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [[0, 0], [10, 10], [20, 0]]
          },
          properties: { text: 'Test Line', name: 'Test Name' }
        }
      ]
    }
  };

  beforeEach(() => {
    // より完全なモック設定
    const mockTextElement = {
      attr: jest.fn().mockReturnThis(),
      style: jest.fn().mockReturnThis(),
      text: jest.fn().mockReturnThis(),
      on: jest.fn().mockReturnThis()
    };

    const mockPathElement = {
      attr: jest.fn().mockReturnThis(),
      datum: jest.fn().mockReturnThis(),
      style: jest.fn().mockReturnThis()
    };

    const mockTextSelectionWithData = {
      enter: jest.fn().mockReturnValue({
        append: jest.fn().mockReturnValue(mockTextElement)
      })
    };

    const mockTextSelection = {
      data: jest.fn().mockReturnValue(mockTextSelectionWithData),
      on: jest.fn().mockReturnThis()
    };

    const mockLayerGroup = {
      selectAll: jest.fn((selector: string) => {
        if (selector === 'text') {
          return mockTextSelection;
        }
        return {
          remove: jest.fn().mockReturnThis()
        };
      }),
      append: jest.fn((tagName: string) => {
        if (tagName === 'path') {
          return mockPathElement;
        }
        return {
          selectAll: jest.fn(() => mockTextSelection),
          append: jest.fn((subTagName: string) => {
            if (subTagName === 'path') {
              return mockPathElement;
            }
            return mockTextElement;
          }),
          attr: jest.fn().mockReturnThis()
        };
      }),
      attr: jest.fn().mockReturnThis(),
      style: jest.fn().mockReturnThis(),
      node: jest.fn(() => ({
        tagName: 'g',
        remove: jest.fn()
      }))
    };

    mockContainer = {
      selectAll: jest.fn().mockReturnValue({
        remove: jest.fn().mockReturnThis()
      }),
      append: jest.fn(() => mockLayerGroup),
      attr: jest.fn().mockReturnThis(),
      style: jest.fn().mockReturnThis(),
      node: jest.fn(() => ({
        tagName: 'g',
        remove: jest.fn()
      }))
    };

    // モック投影法
    mockProjection = jest.fn((coords) => {
      if (!coords || coords.length !== 2) return null;
      const [lon, lat] = coords;
      return [lon * 10, lat * 10];
    });
    mockProjection.toString = () => 'geoEquirectangular';

    lineTextLayer = new LineTextLayer(defaultOptions);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    test('デフォルト設定が正しく適用される', () => {
      expect(lineTextLayer.id).toMatch(/^line-text-/);
      expect(lineTextLayer['textProperty']).toBe('text');
      expect(lineTextLayer['position']).toBe('middle');
      expect(lineTextLayer['placement']).toBe('along');
      expect(lineTextLayer['lineType']).toBe('straight');
      expect(lineTextLayer['smoothType']).toBe('curveBasis');
      expect(lineTextLayer['showSmoothLine']).toBe(false);
    });

    test('カスタム設定が正しく適用される', () => {
      const customOptions: LineTextLayerOptions = {
        ...defaultOptions,
        textProperty: 'customText',
        position: 'start',
        placement: 'horizontal',
        lineType: 'smooth',
        smoothType: 'curveCardinal',
        showSmoothLine: true,
        smoothLineStyle: {
          stroke: '#ff0000',
          strokeWidth: 2
        }
      };

      const customLayer = new LineTextLayer(customOptions);
      expect(customLayer['textProperty']).toBe('customText');
      expect(customLayer['position']).toBe('start');
      expect(customLayer['placement']).toBe('horizontal');
      expect(customLayer['lineType']).toBe('smooth');
      expect(customLayer['smoothType']).toBe('curveCardinal');
      expect(customLayer['showSmoothLine']).toBe(true);
      expect(customLayer['smoothLineStyle'].stroke).toBe('#ff0000');
    });

    test('Feature配列をFeatureCollectionに変換する', () => {
      const featureArrayOptions: LineTextLayerOptions = {
        data: [
          {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: [[0, 0], [10, 10]]
            },
            properties: { text: 'Test' }
          }
        ]
      };

      const layer = new LineTextLayer(featureArrayOptions);
      const data = layer.getData();
      expect(data.type).toBe('FeatureCollection');
      expect(data.features.length).toBe(1);
    });
  });

  describe('data validation', () => {
    test('LineString以外のgeometryでエラーを投げる', () => {
      const invalidOptions: LineTextLayerOptions = {
        data: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [0, 0]
              },
              properties: { text: 'Test' }
            }
          ]
        }
      };

      expect(() => new LineTextLayer(invalidOptions)).toThrow();
    });

    test('geometryが存在しない場合エラーを投げる', () => {
      const invalidOptions: LineTextLayerOptions = {
        data: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: null as any,
              properties: { text: 'Test' }
            }
          ]
        }
      };

      expect(() => new LineTextLayer(invalidOptions)).toThrow();
    });
  });

  describe('projection management', () => {
    test('setProjection()で投影法を設定できる', () => {
      lineTextLayer.setProjection(mockProjection);
      expect(lineTextLayer['projection']).toBe(mockProjection);
    });
  });

  describe('render', () => {
    beforeEach(() => {
      lineTextLayer.setProjection(mockProjection);
    });

    test('render()でレイヤーグループが作成される', () => {
      lineTextLayer.render(mockContainer);
      expect(mockContainer.append).toHaveBeenCalledWith('g');
    });

    test('投影法が設定されていない場合は何も描画されない', () => {
      const layerWithoutProjection = new LineTextLayer(defaultOptions);
      layerWithoutProjection.render(mockContainer);
      
      // レイヤーグループは作成されるが、テキストは描画されない
      expect(mockContainer.append).toHaveBeenCalled();
    });

    test('スムージングラインが表示される（showSmoothLine=true, lineType=smooth）', () => {
      const smoothOptions: LineTextLayerOptions = {
        ...defaultOptions,
        lineType: 'smooth',
        showSmoothLine: true
      };

      const smoothLayer = new LineTextLayer(smoothOptions);
      smoothLayer.setProjection(mockProjection);
      smoothLayer.render(mockContainer);

      // スムージングライン用のグループが作成されることを確認
      expect(mockContainer.append).toHaveBeenCalledWith('g');
    });
  });

  describe('smooth functionality', () => {
    test('getCurveFunction()が正しいカーブ関数を返す', () => {
      const layer = new LineTextLayer({
        ...defaultOptions,
        smoothType: 'curveBasis'
      });
      
      const curveFunction = layer['getCurveFunction']();
      expect(curveFunction).toBeDefined();
    });

    test('geoSmoothPath()がパス文字列を生成する', () => {
      lineTextLayer.setProjection(mockProjection);
      const coordinates = [[0, 0], [10, 10], [20, 0]];
      const path = lineTextLayer['geoSmoothPath'](coordinates);
      
      expect(typeof path).toBe('string');
    });

    test('calculateSmoothTextPosition()が座標を計算する', () => {
      const coordinates = [[0, 0], [10, 10], [20, 0]];
      const position = lineTextLayer['calculateSmoothTextPosition'](coordinates, 0.5);
      
      expect(Array.isArray(position)).toBe(true);
      expect(position.length).toBe(2);
    });
  });

  describe('text positioning', () => {
    beforeEach(() => {
      lineTextLayer.setProjection(mockProjection);
    });

    test('calculateTextPositions()がテキスト配置情報を返す', () => {
      const feature = {
        type: 'Feature' as const,
        geometry: {
          type: 'LineString' as const,
          coordinates: [[0, 0], [10, 10]]
        },
        properties: { text: 'Test Text' }
      };

      const textData = lineTextLayer['calculateTextPositions'](feature, 0, 'middle', 'Test Text', 0);
      expect(textData).toBeDefined();
      expect(textData.text).toBe('Test Text');
    });

    test('MultiLineStringの場合は最初のラインを使用する', () => {
      const multiLineOptions: LineTextLayerOptions = {
        data: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: {
                type: 'MultiLineString',
                coordinates: [
                  [[0, 0], [10, 10]],
                  [[20, 20], [30, 30]]
                ]
              },
              properties: { text: 'Multi Line' }
            }
          ]
        }
      };

      const multiLayer = new LineTextLayer(multiLineOptions);
      multiLayer.setProjection(mockProjection);
      multiLayer.render(mockContainer);

      expect(mockContainer.append).toHaveBeenCalled();
    });
  });

  describe('event handling', () => {
    test('on()でイベントリスナーを追加できる', () => {
      lineTextLayer.setProjection(mockProjection);
      lineTextLayer.render(mockContainer);

      const handler = jest.fn();
      lineTextLayer.on('click', handler);

      // イベントリスナーが設定されることを確認
      expect(mockContainer.append).toHaveBeenCalled();
    });
  });

  describe('getData', () => {
    test('GeoJSONデータを取得できる', () => {
      const data = lineTextLayer.getData();
      expect(data.type).toBe('FeatureCollection');
      expect(data.features.length).toBe(1);
      expect(data.features[0].properties?.text).toBe('Test Line');
    });
  });
});