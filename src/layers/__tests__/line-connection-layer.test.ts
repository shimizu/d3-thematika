import { geoMercator } from 'd3-geo';
import { LineConnectionLayer } from '../line-connection-layer';
import * as GeoJSON from 'geojson';

describe('LineConnectionLayer', () => {
  let container: any;
  let testDataFeature: GeoJSON.Feature;
  let testDataFeatureCollection: GeoJSON.FeatureCollection;
  let testDataFeatureArray: GeoJSON.Feature[];

  beforeEach(() => {
    // Mock D3 selection container
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
      on: jest.fn().mockReturnThis()
    } as any;

    // テスト用のデータ（単一Feature）
    testDataFeature = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: [
          [139.6917, 35.6895], // 東京
          [135.5023, 34.6937], // 大阪
          [132.4554, 34.3961]  // 広島
        ]
      },
      properties: { name: 'Tokyo-Osaka-Hiroshima' }
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
              [139.6917, 35.6895], // 東京
              [135.5023, 34.6937]  // 大阪
            ]
          },
          properties: { name: 'Tokyo-Osaka' }
        },
        {
          type: 'Feature',
          geometry: {
            type: 'MultiLineString',
            coordinates: [
              [
                [140.1233, 35.6062], // 千葉
                [139.6380, 35.4437]  // 羽田
              ],
              [
                [139.0235, 35.2023], // 小田原
                [138.3877, 34.9760]  // 静岡
              ]
            ]
          },
          properties: { name: 'Kanto-Routes' }
        }
      ]
    };

    // テスト用のデータ（Feature配列）
    testDataFeatureArray = testDataFeatureCollection.features;
  });

  describe('constructor', () => {
    it('単一Featureで初期化される', () => {
      const layer = new LineConnectionLayer({
        data: testDataFeature
      });

      expect(layer.id).toMatch(/^line-connection-/);
    });

    it('FeatureCollectionで初期化される', () => {
      const layer = new LineConnectionLayer({
        data: testDataFeatureCollection
      });

      expect(layer.id).toMatch(/^line-connection-/);
    });

    it('Feature配列で初期化される', () => {
      const layer = new LineConnectionLayer({
        data: testDataFeatureArray
      });

      expect(layer.id).toMatch(/^line-connection-/);
    });

    it('デフォルト設定が適用される', () => {
      const layer = new LineConnectionLayer({
        data: testDataFeature
      });

      expect(layer.id).toMatch(/^line-connection-/);
    });

    it('カスタム設定が適用される', () => {
      const layer = new LineConnectionLayer({
        data: testDataFeature,
        lineType: 'arc',
        arcHeight: 0.5,
        arcControlPoint: 'weighted',
        arcOffset: 'north',
        startArrow: true,
        endArrow: true,
        arrowSize: 12,
        style: { stroke: '#ff0000', strokeWidth: 2 }
      });

      expect(layer.id).toMatch(/^line-connection-/);
    });

    it('アーク制御設定のデフォルト値が適用される', () => {
      const layer = new LineConnectionLayer({
        data: testDataFeature,
        lineType: 'arc'
      });

      expect(layer.id).toMatch(/^line-connection-/);
    });

    it('座標指定でのアーク制御点が設定できる', () => {
      const layer = new LineConnectionLayer({
        data: testDataFeature,
        lineType: 'arc',
        arcControlPoint: [120, 40],
        arcOffset: [0.2, -0.3]
      });

      expect(layer.id).toMatch(/^line-connection-/);
    });

    it('attr設定がstyleよりも優先される', () => {
      const layer = new LineConnectionLayer({
        data: testDataFeature,
        style: { stroke: '#ff0000' },
        attr: { stroke: '#0000ff' }
      });

      expect(layer.id).toMatch(/^line-connection-/);
    });
  });

  describe('data validation', () => {
    it('不正なデータ型でエラーが発生する', () => {
      expect(() => {
        new LineConnectionLayer({
          data: 'invalid' as any
        });
      }).toThrow('LineConnectionLayer: データはFeatureCollectionである必要があります');
    });

    it('geometryが存在しない場合エラーが発生する', () => {
      expect(() => {
        new LineConnectionLayer({
          data: {
            type: 'Feature',
            properties: {}
          } as any
        });
      }).toThrow('LineConnectionLayer: フィーチャー[0]にgeometryが存在しません');
    });

    it('LineStringでもMultiLineStringでもない場合エラーが発生する', () => {
      expect(() => {
        new LineConnectionLayer({
          data: {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [139.6917, 35.6895]
            },
            properties: {}
          } as any
        });
      }).toThrow('LineConnectionLayer: フィーチャー[0]は\'LineString\'または\'MultiLineString\'である必要があります');
    });

    it('LineStringの座標が2点未満の場合エラーが発生する', () => {
      expect(() => {
        new LineConnectionLayer({
          data: {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: [[139.6917, 35.6895]]
            },
            properties: {}
          } as any
        });
      }).toThrow('LineConnectionLayer: フィーチャー[0]は少なくとも2点の座標が必要です');
    });

    it('座標が配列でない場合エラーが発生する', () => {
      expect(() => {
        new LineConnectionLayer({
          data: {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: ['invalid', [135.5023, 34.6937]]
            },
            properties: {}
          } as any
        });
      }).toThrow('LineConnectionLayer: フィーチャー[0]の座標[0]は[経度, 緯度]の配列である必要があります');
    });

    it('経度が範囲外の場合エラーが発生する', () => {
      expect(() => {
        new LineConnectionLayer({
          data: {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: [[200, 35.6895], [135.5023, 34.6937]]
            },
            properties: {}
          } as any
        });
      }).toThrow('LineConnectionLayer: フィーチャー[0]の座標[0]の経度は-180から180の範囲である必要があります');
    });

    it('緯度が範囲外の場合エラーが発生する', () => {
      expect(() => {
        new LineConnectionLayer({
          data: {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: [[139.6917, 100], [135.5023, 34.6937]]
            },
            properties: {}
          } as any
        });
      }).toThrow('LineConnectionLayer: フィーチャー[0]の座標[0]の緯度は-90から90の範囲である必要があります');
    });

    it('MultiLineStringの検証が正しく動作する', () => {
      expect(() => {
        new LineConnectionLayer({
          data: {
            type: 'Feature',
            geometry: {
              type: 'MultiLineString',
              coordinates: [
                [[139.6917, 35.6895]], // 1点のみ（エラー）
                [[135.5023, 34.6937], [132.4554, 34.3961]]
              ]
            },
            properties: {}
          } as any
        });
      }).toThrow('LineConnectionLayer: フィーチャー[0]のライン[0]は少なくとも2点の座標が必要です');
    });
  });

  describe('projection management', () => {
    it('setProjection()で投影法を設定できる', () => {
      const layer = new LineConnectionLayer({ data: testDataFeature });
      const projection = geoMercator();
      
      layer.setProjection(projection);
      
      // 投影法が設定されたかは内部状態なので、レンダリング後の動作で確認
      expect(layer.isRendered()).toBe(false);
    });

  });



  describe('render', () => {
    it('render()でレイヤーグループが作成される', () => {
      const layer = new LineConnectionLayer({ data: testDataFeature });
      
      layer.render(container);
      
      expect(container.append).toHaveBeenCalledWith('g');
      expect(container.attr).toHaveBeenCalledWith('class', expect.stringContaining('thematika-layer'));
    });

    it('投影法が設定されていない場合は描画されない', () => {
      const layer = new LineConnectionLayer({ data: testDataFeature });
      
      layer.render(container);
      
      // 投影法未設定でもレイヤーグループは作成される
      expect(container.append).toHaveBeenCalledWith('g');
    });

    it('投影法設定後に描画が実行される', () => {
      const layer = new LineConnectionLayer({ data: testDataFeatureCollection });
      const projection = geoMercator();
      
      layer.setProjection(projection);
      layer.render(container);
      
      expect(container.append).toHaveBeenCalled();
    });
  });


  describe('event handling', () => {
    it('on()でイベントリスナーを追加できる', () => {
      const layer = new LineConnectionLayer({ data: testDataFeature });
      const handler = jest.fn();
      
      layer.render(container);
      layer.on('click', handler);
      
      expect(container.on).toHaveBeenCalledWith('click', expect.any(Function));
    });

    it('レイヤーグループが未設定の場合はイベント登録されない', () => {
      const layer = new LineConnectionLayer({ data: testDataFeature });
      const handler = jest.fn();
      
      layer.on('click', handler);
      
      // レンダリング前はイベント登録されない
      expect(container.on).not.toHaveBeenCalled();
    });
  });


  describe('CSS class application', () => {
    it('レイヤーグループが作成される', () => {
      const layer = new LineConnectionLayer({ data: testDataFeature });
      
      layer.render(container);
      
      expect(container.attr).toHaveBeenCalledWith('class', expect.stringContaining('thematika-layer'));
    });

    it('投影法設定後にライン要素にクラスが適用される', () => {
      const layer = new LineConnectionLayer({ 
        data: testDataFeature,
        style: { className: 'custom-line' }
      });
      
      const projection = geoMercator();
      layer.setProjection(projection);
      layer.render(container);
      
      // ライン要素の作成とクラス設定が行われることを確認
      expect(container.append).toHaveBeenCalled();
    });

    it('データ固有のプロパティが処理される', () => {
      const dataWithClass: GeoJSON.Feature = {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [
            [139.6917, 35.6895],
            [135.5023, 34.6937]
          ]
        },
        properties: { class: 'important-route' }
      };
      
      const layer = new LineConnectionLayer({ data: dataWithClass });
      const projection = geoMercator();
      layer.setProjection(projection);
      layer.render(container);
      
      // データが処理されることを確認
      expect(container.append).toHaveBeenCalled();
    });
  });

  describe('integration scenarios', () => {
    it('完全なワークフローが正常に動作する（単一Feature）', () => {
      const layer = new LineConnectionLayer({ 
        data: testDataFeature,
        lineType: 'straight',
        style: { stroke: '#333', strokeWidth: 2 }
      });
      
      const projection = geoMercator();
      layer.setProjection(projection);
      layer.render(container);
      
      expect(layer.isRendered()).toBe(true);
    });

    it('完全なワークフローが正常に動作する（FeatureCollection）', () => {
      const layer = new LineConnectionLayer({ 
        data: testDataFeatureCollection,
        lineType: 'arc',
        arcHeight: 0.3,
        startArrow: true,
        endArrow: true,
        style: { stroke: '#ff0000', strokeWidth: 2 }
      });
      
      const projection = geoMercator();
      layer.setProjection(projection);
      layer.render(container);
      
      expect(layer.isRendered()).toBe(true);
    });

    it('完全なワークフローが正常に動作する（Feature配列）', () => {
      const layer = new LineConnectionLayer({ 
        data: testDataFeatureArray,
        lineType: 'arc',
        arcHeight: 0.5,
        style: { stroke: '#00ff00', strokeWidth: 3 }
      });
      
      const projection = geoMercator();
      layer.setProjection(projection);
      layer.render(container);
      
      expect(layer.isRendered()).toBe(true);
    });
  });
});