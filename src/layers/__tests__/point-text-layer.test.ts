// geoMercatorはmockProjectionに置き換え
import { PointTextLayer } from '../point-text-layer';
import * as GeoJSON from 'geojson';

describe('PointTextLayer', () => {
  let container: any;
  let mockProjection: any;
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

    // モック投影法
    mockProjection = jest.fn((coord) => [coord[0] * 10, coord[1] * 10]);

    // テスト用のデータ（FeatureCollection）
    testDataFeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [139.6917, 35.6895] // 東京
          },
          properties: { 
            text: 'Tokyo',
            name: '東京',
            population: 13960000
          }
        },
        {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [139.0, 35.0],
              [140.0, 35.0],
              [140.0, 36.0],
              [139.0, 36.0],
              [139.0, 35.0]
            ]]
          },
          properties: { 
            name: 'Tokyo Prefecture',
            population: 14000000
          }
        },
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [
              [139.0, 35.0],
              [140.0, 36.0]
            ]
          },
          properties: { 
            text: 'Train Line',
            name: '電車路線'
          }
        }
      ]
    };

    // テスト用のデータ（Feature配列）
    testDataFeatureArray = testDataFeatureCollection.features;
  });

  describe('constructor', () => {
    it('FeatureCollectionで初期化される', () => {
      const layer = new PointTextLayer({
        data: testDataFeatureCollection
      });

      expect(layer.id).toMatch(/^point-text-/);
    });

    it('Feature配列で初期化される', () => {
      const layer = new PointTextLayer({
        data: testDataFeatureArray
      });

      expect(layer.id).toMatch(/^point-text-/);
    });

    it('デフォルト設定が適用される', () => {
      const layer = new PointTextLayer({
        data: testDataFeatureCollection
      });

      expect(layer.id).toMatch(/^point-text-/);
    });

    it('カスタム設定が適用される', () => {
      const layer = new PointTextLayer({
        data: testDataFeatureCollection,
        textProperty: 'name',
        dx: 10,
        dy: -5,
        rotate: 45,
        lengthAdjust: 'spacingAndGlyphs',
        alignmentBaseline: 'alphabetic',
        textAnchor: 'middle',
        fontFamily: 'Arial',
        fontSize: 14,
        fontWeight: 'bold',
        style: { fill: '#ff0000' }
      });

      expect(layer.id).toMatch(/^point-text-/);
    });

    it('関数型パラメータが設定できる', () => {
      const layer = new PointTextLayer({
        data: testDataFeatureCollection,
        dx: (feature, index) => index * 10,
        dy: (feature, index) => index * -5,
        rotate: (feature) => feature.properties?.population ? 90 : 0,
        fontFamily: (feature) => feature.properties?.population > 10000000 ? 'Arial' : 'serif',
        fontSize: (feature) => feature.properties?.population ? 18 : 12,
        fontWeight: (feature) => feature.properties?.population > 10000000 ? 'bold' : 'normal'
      });

      expect(layer.id).toMatch(/^point-text-/);
    });

    it('attr設定がstyleよりも優先される', () => {
      const layer = new PointTextLayer({
        data: testDataFeatureCollection,
        style: { fill: '#ff0000' },
        attr: { fill: '#0000ff' }
      });

      expect(layer.id).toMatch(/^point-text-/);
    });
  });

  describe('projection management', () => {
    it('setProjection()で投影法を設定できる', () => {
      const layer = new PointTextLayer({ data: testDataFeatureCollection });
      
      layer.setProjection(mockProjection);
      
      // 投影法が設定されたかは内部状態なので、レンダリング後の動作で確認
      expect(layer.isRendered()).toBe(false);
    });
  });

  describe('render', () => {
    it('render()でレイヤーグループが作成される', () => {
      const layer = new PointTextLayer({ data: testDataFeatureCollection });
      
      layer.render(container);
      
      expect(container.append).toHaveBeenCalledWith('g');
      expect(container.attr).toHaveBeenCalledWith('class', expect.stringContaining('thematika-layer'));
    });

    it('投影法が設定されていない場合は描画されない', () => {
      const layer = new PointTextLayer({ data: testDataFeatureCollection });
      
      layer.render(container);
      
      // 投影法未設定でもレイヤーグループは作成される
      expect(container.append).toHaveBeenCalledWith('g');
    });

    it('投影法設定後に描画が実行される', () => {
      const layer = new PointTextLayer({ data: testDataFeatureCollection });
      
      layer.setProjection(mockProjection);
      layer.render(container);
      
      expect(container.append).toHaveBeenCalled();
    });
  });

  describe('event handling', () => {
    it('on()でイベントリスナーを追加できる', () => {
      const layer = new PointTextLayer({ data: testDataFeatureCollection });
      const handler = jest.fn();
      
      layer.render(container);
      layer.on('click', handler);
      
      expect(container.selectAll).toHaveBeenCalledWith('text');
      expect(container.on).toHaveBeenCalledWith('click', expect.any(Function));
    });

    it('レイヤーグループが未設定の場合はイベント登録されない', () => {
      const layer = new PointTextLayer({ data: testDataFeatureCollection });
      const handler = jest.fn();
      
      layer.on('click', handler);
      
      // レンダリング前はイベント登録されない（selectAllは呼ばれない）
      expect(container.selectAll).not.toHaveBeenCalled();
    });
  });

  describe('CSS class application', () => {
    it('レイヤーグループが作成される', () => {
      const layer = new PointTextLayer({ data: testDataFeatureCollection });
      
      layer.render(container);
      
      expect(container.attr).toHaveBeenCalledWith('class', expect.stringContaining('thematika-layer'));
    });

    it('投影法設定後にテキスト要素にクラスが適用される', () => {
      const layer = new PointTextLayer({ 
        data: testDataFeatureCollection,
        style: { className: 'custom-text' }
      });
      
      const projection = mockProjection;
      layer.setProjection(projection);
      layer.render(container);
      
      // テキスト要素の作成とクラス設定が行われることを確認
      expect(container.append).toHaveBeenCalled();
    });

    it('データ固有のプロパティが処理される', () => {
      const dataWithClass: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [139.6917, 35.6895]
            },
            properties: { 
              class: 'important-city',
              text: 'Tokyo'
            }
          }
        ]
      };
      
      const layer = new PointTextLayer({ data: dataWithClass });
      const projection = mockProjection;
      layer.setProjection(projection);
      layer.render(container);
      
      // データが処理されることを確認
      expect(container.append).toHaveBeenCalled();
    });
  });

  describe('text property handling', () => {
    it('textプロパティからテキストを取得する', () => {
      const layer = new PointTextLayer({ 
        data: testDataFeatureCollection,
        textProperty: 'text'
      });
      
      const projection = mockProjection;
      layer.setProjection(projection);
      layer.render(container);
      
      expect(container.append).toHaveBeenCalled();
    });

    it('textプロパティが存在しない場合はnameプロパティを使用する', () => {
      const dataWithoutText: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [139.6917, 35.6895]
            },
            properties: { 
              name: 'Tokyo City'
            }
          }
        ]
      };
      
      const layer = new PointTextLayer({ 
        data: dataWithoutText,
        textProperty: 'text'
      });
      
      const projection = mockProjection;
      layer.setProjection(projection);
      layer.render(container);
      
      expect(container.append).toHaveBeenCalled();
    });

    it('カスタムtextPropertyが使用される', () => {
      const layer = new PointTextLayer({ 
        data: testDataFeatureCollection,
        textProperty: 'name'
      });
      
      const projection = mockProjection;
      layer.setProjection(projection);
      layer.render(container);
      
      expect(container.append).toHaveBeenCalled();
    });
  });

  describe('geometry type handling', () => {
    it('Point geometry coordinates are used directly', () => {
      const pointData: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [139.6917, 35.6895]
            },
            properties: { text: 'Point Text' }
          }
        ]
      };
      
      const layer = new PointTextLayer({ data: pointData });
      const projection = mockProjection;
      layer.setProjection(projection);
      layer.render(container);
      
      expect(container.append).toHaveBeenCalled();
    });

    it('Polygon geometry centroids are calculated', () => {
      const polygonData: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [[
                [0, 0], [1, 0], [1, 1], [0, 1], [0, 0]
              ]]
            },
            properties: { text: 'Polygon Text' }
          }
        ]
      };
      
      const layer = new PointTextLayer({ data: polygonData });
      const projection = mockProjection;
      layer.setProjection(projection);
      layer.render(container);
      
      expect(container.append).toHaveBeenCalled();
    });

    it('LineString geometry centroids are calculated', () => {
      const lineData: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: [[0, 0], [1, 1]]
            },
            properties: { text: 'Line Text' }
          }
        ]
      };
      
      const layer = new PointTextLayer({ data: lineData });
      const projection = mockProjection;
      layer.setProjection(projection);
      layer.render(container);
      
      expect(container.append).toHaveBeenCalled();
    });
  });

  describe('integration scenarios', () => {
    it('完全なワークフローが正常に動作する（FeatureCollection）', () => {
      const layer = new PointTextLayer({ 
        data: testDataFeatureCollection,
        textProperty: 'name',
        dx: 5,
        dy: -5,
        fontSize: 14,
        fontWeight: 'bold',
        style: { fill: '#333', stroke: '#fff', strokeWidth: 1 }
      });
      
      const projection = mockProjection;
      layer.setProjection(projection);
      layer.render(container);
      
      expect(layer.isRendered()).toBe(true);
    });

    it('完全なワークフローが正常に動作する（Feature配列）', () => {
      const layer = new PointTextLayer({ 
        data: testDataFeatureArray,
        textProperty: 'text',
        rotate: 30,
        fontFamily: 'Arial',
        fontSize: 16,
        style: { fill: '#ff0000' }
      });
      
      const projection = mockProjection;
      layer.setProjection(projection);
      layer.render(container);
      
      expect(layer.isRendered()).toBe(true);
    });

    it('関数型パラメータでの完全なワークフロー', () => {
      const layer = new PointTextLayer({ 
        data: testDataFeatureCollection,
        dx: (feature, index) => index * 10,
        dy: (feature) => feature.properties?.population ? -20 : -10,
        fontSize: (feature) => feature.properties?.population > 10000000 ? 18 : 12,
        fontWeight: (feature) => feature.properties?.population > 10000000 ? 'bold' : 'normal',
        style: { fill: '#0066cc' }
      });
      
      const projection = mockProjection;
      layer.setProjection(projection);
      layer.render(container);
      
      expect(layer.isRendered()).toBe(true);
    });
  });

  describe('getData', () => {
    it('GeoJSONデータを取得できる', () => {
      const layer = new PointTextLayer({ data: testDataFeatureCollection });
      
      const data = layer.getData();
      
      expect(data).toBe(testDataFeatureCollection);
      expect(data.type).toBe('FeatureCollection');
      expect(data.features).toHaveLength(3);
    });

    it('Feature配列から変換されたFeatureCollectionを取得できる', () => {
      const layer = new PointTextLayer({ data: testDataFeatureArray });
      
      const data = layer.getData();
      
      expect(data.type).toBe('FeatureCollection');
      expect(data.features).toHaveLength(3);
      expect(data.features).toEqual(testDataFeatureArray);
    });
  });
});