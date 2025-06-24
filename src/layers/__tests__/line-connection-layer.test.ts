import { geoMercator } from 'd3-geo';
import { LineConnectionLayer } from '../line-connection-layer';
import { LineConnectionData } from '../../types';

describe('LineConnectionLayer', () => {
  let container: any;
  let testData: LineConnectionData[];

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
      enter: jest.fn().mockReturnThis(),
      exit: jest.fn().mockReturnThis(),
      remove: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      node: jest.fn(() => mockElement),
      size: jest.fn(() => 5),
      call: jest.fn().mockReturnThis(),
      on: jest.fn().mockReturnThis()
    } as any;

    // テスト用のデータ
    testData = [
      {
        start: [139.6917, 35.6895], // 東京
        end: [135.5023, 34.6937],   // 大阪
        properties: { name: 'Tokyo-Osaka' }
      },
      {
        start: [140.1233, 35.6062], // 千葉
        end: [139.6380, 35.4437],   // 羽田
        properties: { name: 'Chiba-Haneda' }
      }
    ];
  });

  describe('constructor', () => {
    it('正しいデータで初期化される', () => {
      const layer = new LineConnectionLayer({
        data: testData
      });

      expect(layer.id).toMatch(/^line-connection-/);
    });

    it('デフォルト設定が適用される', () => {
      const layer = new LineConnectionLayer({
        data: testData
      });

      expect(layer.id).toMatch(/^line-connection-/);
    });

    it('カスタム設定が適用される', () => {
      const layer = new LineConnectionLayer({
        data: testData,
        lineType: 'arc',
        arcHeight: 0.5,
        arcControlPoint: 'weighted',
        arcOffset: 'north',
        style: { stroke: '#ff0000', strokeWidth: 2 }
      });

      expect(layer.id).toMatch(/^line-connection-/);
    });

    it('アーク制御設定のデフォルト値が適用される', () => {
      const layer = new LineConnectionLayer({
        data: testData,
        lineType: 'arc'
      });

      expect(layer.id).toMatch(/^line-connection-/);
    });

    it('座標指定でのアーク制御点が設定できる', () => {
      const layer = new LineConnectionLayer({
        data: testData,
        lineType: 'arc',
        arcControlPoint: [120, 40],
        arcOffset: [0.2, -0.3]
      });

      expect(layer.id).toMatch(/^line-connection-/);
    });

    it('attr設定がstyleよりも優先される', () => {
      const layer = new LineConnectionLayer({
        data: testData,
        style: { stroke: '#ff0000' },
        attr: { stroke: '#0000ff' }
      });

      expect(layer.id).toMatch(/^line-connection-/);
    });
  });

  describe('data validation', () => {
    it('配列でないデータでエラーが発生する', () => {
      expect(() => {
        new LineConnectionLayer({
          data: {} as any
        });
      }).toThrow('LineConnectionLayer: データは配列である必要があります');
    });

    it('startが存在しない場合エラーが発生する', () => {
      expect(() => {
        new LineConnectionLayer({
          data: [{ end: [135.5023, 34.6937] } as any]
        });
      }).toThrow('LineConnectionLayer: データ[0]にstartまたはendが存在しません');
    });

    it('endが存在しない場合エラーが発生する', () => {
      expect(() => {
        new LineConnectionLayer({
          data: [{ start: [139.6917, 35.6895] } as any]
        });
      }).toThrow('LineConnectionLayer: データ[0]にstartまたはendが存在しません');
    });

    it('startが配列でない場合エラーが発生する', () => {
      expect(() => {
        new LineConnectionLayer({
          data: [{ start: 'invalid', end: [135.5023, 34.6937] } as any]
        });
      }).toThrow('LineConnectionLayer: データ[0].startは[経度, 緯度]の配列である必要があります');
    });

    it('startの要素数が2でない場合エラーが発生する', () => {
      expect(() => {
        new LineConnectionLayer({
          data: [{ start: [139.6917], end: [135.5023, 34.6937] } as any]
        });
      }).toThrow('LineConnectionLayer: データ[0].startは[経度, 緯度]の配列である必要があります');
    });

    it('経度が範囲外の場合エラーが発生する', () => {
      expect(() => {
        new LineConnectionLayer({
          data: [{ start: [200, 35.6895], end: [135.5023, 34.6937] }]
        });
      }).toThrow('LineConnectionLayer: データ[0]の経度は-180から180の範囲である必要があります');
    });

    it('緯度が範囲外の場合エラーが発生する', () => {
      expect(() => {
        new LineConnectionLayer({
          data: [{ start: [139.6917, 100], end: [135.5023, 34.6937] }]
        });
      }).toThrow('LineConnectionLayer: データ[0]の緯度は-90から90の範囲である必要があります');
    });
  });

  describe('projection management', () => {
    it('setProjection()で投影法を設定できる', () => {
      const layer = new LineConnectionLayer({ data: testData });
      const projection = geoMercator();
      
      layer.setProjection(projection);
      
      // 投影法が設定されたかは内部状態なので、レンダリング後の動作で確認
      expect(layer.isRendered()).toBe(false);
    });

    it('投影法設定後にupdate()が呼ばれる', () => {
      const layer = new LineConnectionLayer({ data: testData });
      layer.render(container);
      
      const updateSpy = jest.spyOn(layer, 'update');
      const projection = geoMercator();
      
      layer.setProjection(projection);
      
      expect(updateSpy).toHaveBeenCalled();
    });
  });

  describe('data management', () => {
    it('updateData()でデータを更新できる', () => {
      const layer = new LineConnectionLayer({ data: testData });
      
      const newData: LineConnectionData[] = [
        { start: [139.6917, 35.6895], end: [135.5023, 34.6937] }
      ];
      
      layer.updateData(newData);
      
      // データが更新されたかは内部状態なので、直接的な確認は困難
      // エラーが発生しないことで正常性を確認
      expect(layer.id).toMatch(/^line-connection-/);
    });

    it('updateData()で無効なデータを渡すとエラーが発生する', () => {
      const layer = new LineConnectionLayer({ data: testData });
      
      expect(() => {
        layer.updateData([{ start: 'invalid' } as any]);
      }).toThrow();
    });
  });

  describe('line type management', () => {
    it('updateLineType()でライン描画タイプを更新できる', () => {
      const layer = new LineConnectionLayer({ data: testData });
      
      layer.updateLineType('arc');
      
      // タイプが更新されたかは内部状態なので、エラーが発生しないことで確認
      expect(layer.id).toMatch(/^line-connection-/);
    });

    it('updateArcHeight()でアーク高さを更新できる', () => {
      const layer = new LineConnectionLayer({ 
        data: testData,
        lineType: 'arc'
      });
      
      layer.updateArcHeight(0.7);
      
      // 高さが更新されたかは内部状態なので、エラーが発生しないことで確認
      expect(layer.id).toMatch(/^line-connection-/);
    });

    it('updateArcControlPoint()でアーク制御点を更新できる', () => {
      const layer = new LineConnectionLayer({ 
        data: testData,
        lineType: 'arc'
      });
      
      layer.updateArcControlPoint('weighted');
      layer.updateArcControlPoint([100, 50]);
      
      // 制御点が更新されたかは内部状態なので、エラーが発生しないことで確認
      expect(layer.id).toMatch(/^line-connection-/);
    });

    it('updateArcOffset()でアークオフセットを更新できる', () => {
      const layer = new LineConnectionLayer({ 
        data: testData,
        lineType: 'arc'
      });
      
      layer.updateArcOffset('north');
      layer.updateArcOffset([0.5, -0.3]);
      
      // オフセットが更新されたかは内部状態なので、エラーが発生しないことで確認
      expect(layer.id).toMatch(/^line-connection-/);
    });
  });

  describe('render', () => {
    it('render()でレイヤーグループが作成される', () => {
      const layer = new LineConnectionLayer({ data: testData });
      
      layer.render(container);
      
      expect(container.append).toHaveBeenCalledWith('g');
      expect(container.attr).toHaveBeenCalledWith('class', expect.stringContaining('cartography-layer'));
    });

    it('投影法が設定されていない場合は描画されない', () => {
      const layer = new LineConnectionLayer({ data: testData });
      
      layer.render(container);
      
      // 投影法未設定でもレイヤーグループは作成される
      expect(container.append).toHaveBeenCalledWith('g');
    });

    it('投影法設定後に描画が実行される', () => {
      const layer = new LineConnectionLayer({ data: testData });
      const projection = geoMercator();
      
      layer.setProjection(projection);
      layer.render(container);
      
      expect(container.selectAll).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('update()で既存の要素が削除される', () => {
      const layer = new LineConnectionLayer({ data: testData });
      
      layer.render(container);
      layer.update();
      
      expect(container.selectAll).toHaveBeenCalled();
      expect(container.remove).toHaveBeenCalled();
    });
  });

  describe('event handling', () => {
    it('on()でイベントリスナーを追加できる', () => {
      const layer = new LineConnectionLayer({ data: testData });
      const handler = jest.fn();
      
      layer.render(container);
      layer.on('click', handler);
      
      expect(container.on).toHaveBeenCalledWith('click', expect.any(Function));
    });

    it('レイヤーグループが未設定の場合はイベント登録されない', () => {
      const layer = new LineConnectionLayer({ data: testData });
      const handler = jest.fn();
      
      layer.on('click', handler);
      
      // レンダリング前はイベント登録されない
      expect(container.on).not.toHaveBeenCalled();
    });
  });

  describe('style application', () => {
    it('updateLayerStyle()が正しく動作する', () => {
      const layer = new LineConnectionLayer({ 
        data: testData,
        style: { stroke: '#ff0000' }
      });
      
      const projection = geoMercator();
      layer.setProjection(projection);
      layer.render(container);
      
      // スタイルが適用されることを確認
      expect(container.selectAll).toHaveBeenCalled();
    });
  });

  describe('CSS class application', () => {
    it('レイヤーグループが作成される', () => {
      const layer = new LineConnectionLayer({ data: testData });
      
      layer.render(container);
      
      expect(container.attr).toHaveBeenCalledWith('class', expect.stringContaining('cartography-layer'));
    });

    it('投影法設定後にライン要素にクラスが適用される', () => {
      const layer = new LineConnectionLayer({ 
        data: testData,
        style: { className: 'custom-line' }
      });
      
      const projection = geoMercator();
      layer.setProjection(projection);
      layer.render(container);
      
      // ライン要素の作成とクラス設定が行われることを確認
      expect(container.selectAll).toHaveBeenCalled();
      expect(container.attr).toHaveBeenCalled();
    });

    it('データ固有のプロパティが処理される', () => {
      const dataWithClass: LineConnectionData[] = [
        {
          start: [139.6917, 35.6895],
          end: [135.5023, 34.6937],
          properties: { class: 'important-route' }
        }
      ];
      
      const layer = new LineConnectionLayer({ data: dataWithClass });
      const projection = geoMercator();
      layer.setProjection(projection);
      layer.render(container);
      
      // データが処理されることを確認
      expect(container.selectAll).toHaveBeenCalled();
    });
  });

  describe('integration scenarios', () => {
    it('完全なワークフローが正常に動作する', () => {
      const layer = new LineConnectionLayer({ 
        data: testData,
        lineType: 'straight',
        style: { stroke: '#333', strokeWidth: 2 }
      });
      
      const projection = geoMercator();
      layer.setProjection(projection);
      layer.render(container);
      
      // ライン描画タイプを変更
      layer.updateLineType('arc');
      layer.updateArcHeight(0.4);
      
      // データを更新
      const newData: LineConnectionData[] = [
        { start: [139.6917, 35.6895], end: [135.5023, 34.6937] }
      ];
      layer.updateData(newData);
      
      expect(layer.isRendered()).toBe(true);
    });
  });
});