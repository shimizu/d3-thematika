import { GraticuleLayer } from '../graticule-layer';
import { LayerAttr } from '../../types';

// d3-geoのモック
jest.mock('d3-geo', () => ({
  geoGraticule: jest.fn(),
  geoPath: jest.fn(() => jest.fn())
}));

describe('GraticuleLayer', () => {
  let graticuleLayer: GraticuleLayer;
  let mockContainer: any;
  let mockProjection: any;
  let mockGraticule: any;

  beforeEach(() => {
    // モックGraticule関数
    mockGraticule = jest.fn(() => ({
      type: 'Feature',
      geometry: {
        type: 'MultiLineString',
        coordinates: [[[0, 0], [1, 0]], [[0, 1], [1, 1]]]
      }
    }));
    mockGraticule.step = jest.fn().mockReturnValue(mockGraticule);
    mockGraticule.extent = jest.fn().mockReturnValue(mockGraticule);

    // d3.geoGraticuleのモック
    const mockD3Geo = require('d3-geo');
    mockD3Geo.geoGraticule.mockReturnValue(mockGraticule);

    graticuleLayer = new GraticuleLayer({
      step: [15, 15],
      attr: {
        fill: 'none',
        stroke: '#cccccc',
        strokeWidth: 0.5
      }
    });

    // モック投影法
    mockProjection = jest.fn();

    // モックコンテナの設定
    mockContainer = {
      append: jest.fn().mockReturnThis(),
      attr: jest.fn().mockReturnThis(),
      style: jest.fn().mockReturnThis(),
      selectAll: jest.fn().mockReturnThis(),
      datum: jest.fn().mockReturnThis(),
      remove: jest.fn().mockReturnThis(),
      node: jest.fn(() => ({
        tagName: 'g',
        remove: jest.fn()
      }))
    };
  });

  describe('constructor', () => {
    test('デフォルト設定が正しく適用される', () => {
      const defaultLayer = new GraticuleLayer();
      
      expect(defaultLayer['step']).toEqual([10, 10]);
      expect(defaultLayer['extent']).toBeUndefined();
      expect(defaultLayer['attr'].fill).toBe('none');
      expect(defaultLayer['attr'].stroke).toBe('#cccccc');
      expect(defaultLayer['attr'].strokeWidth).toBe(0.5);
      expect(defaultLayer['attr'].opacity).toBe(0.7);
    });

    test('カスタム設定が正しく適用される', () => {
      const customOptions = {
        step: [20, 20] as [number, number],
        extent: [[-180, -90], [180, 90]] as [[number, number], [number, number]],
        attr: {
          fill: 'blue',
          stroke: 'red',
          strokeWidth: 1.5,
          opacity: 0.9
        }
      };

      const customLayer = new GraticuleLayer(customOptions);

      expect(customLayer['step']).toEqual([20, 20]);
      expect(customLayer['extent']).toEqual([[-180, -90], [180, 90]]);
      expect(customLayer['attr'].fill).toBe('blue');
      expect(customLayer['attr'].stroke).toBe('red');
      expect(customLayer['attr'].strokeWidth).toBe(1.5);
      expect(customLayer['attr'].opacity).toBe(0.9);
    });

    test('attr設定がstyleよりも優先される', () => {
      const layer = new GraticuleLayer({
        attr: { stroke: 'green' }
      });

      expect(layer['attr'].stroke).toBe('green');
    });

    test('一意のIDが自動生成される', () => {
      const layer1 = new GraticuleLayer();
      const layer2 = new GraticuleLayer();

      expect(layer1.id).not.toEqual(layer2.id);
      expect(layer1.id).toContain('graticule-');
      expect(layer2.id).toContain('graticule-');
    });
  });

  describe('projection management', () => {
    test('setProjection()で投影法を設定できる', () => {
      graticuleLayer.setProjection(mockProjection);
      expect(graticuleLayer['path']).toBeDefined();
    });

  });

  describe('step management', () => {
    test('コンストラクタで間隔を設定できる', () => {
      expect(graticuleLayer['step']).toEqual([15, 15]);

      const customStepLayer = new GraticuleLayer({
        step: [30, 30]
      });
      expect(customStepLayer['step']).toEqual([30, 30]);
    });

    test('異なる経度・緯度間隔を設定できる', () => {
      const customStepLayer = new GraticuleLayer({
        step: [10, 5]
      });
      expect(customStepLayer['step']).toEqual([10, 5]);
    });
  });

  describe('extent management', () => {
    test('コンストラクタで範囲を設定できる', () => {
      const extent: [[number, number], [number, number]] = [[-90, -45], [90, 45]];
      
      const customExtentLayer = new GraticuleLayer({
        extent: extent
      });
      expect(customExtentLayer['extent']).toEqual(extent);
    });

    test('コンストラクタでundefinedを設定できる', () => {
      const layerWithExtent = new GraticuleLayer({
        extent: [[-90, -45], [90, 45]]
      });
      expect(layerWithExtent['extent']).toBeDefined();

      const layerWithoutExtent = new GraticuleLayer();
      expect(layerWithoutExtent['extent']).toBeUndefined();
    });

  });

  describe('render', () => {
    test('render()でレイヤーグループが作成される', () => {
      graticuleLayer.render(mockContainer);

      expect(mockContainer.append).toHaveBeenCalledWith('g');
      expect(mockContainer.attr).toHaveBeenCalledWith('class', expect.stringContaining('thematika-layer'));
    });

    test('投影法が設定されていない場合は描画されない', () => {
      graticuleLayer.render(mockContainer);
      
      // pathが未設定の場合は早期リターン
      expect(mockContainer.append).toHaveBeenCalledTimes(1); // レイヤーグループのみ
    });

    test('投影法設定後に描画が実行される', () => {
      graticuleLayer.setProjection(mockProjection);
      graticuleLayer.render(mockContainer);

      expect(graticuleLayer.isRendered()).toBe(true);
    });
  });


  describe('graticule rendering', () => {
    beforeEach(() => {
      graticuleLayer['path'] = jest.fn() as any;
      graticuleLayer['layerGroup'] = mockContainer;
    });

    test('geoGraticule()が正しいstepで呼ばれる', () => {
      graticuleLayer['renderGraticule']();

      expect(mockGraticule.step).toHaveBeenCalledWith([15, 15]);
    });

    test('extentが設定されている場合はgraticule.extent()が呼ばれる', () => {
      const extent: [[number, number], [number, number]] = [[-90, -45], [90, 45]];
      const layerWithExtent = new GraticuleLayer({
        extent: extent
      });
      layerWithExtent['path'] = jest.fn() as any;
      layerWithExtent['layerGroup'] = mockContainer;

      layerWithExtent['renderGraticule']();

      expect(mockGraticule.extent).toHaveBeenCalledWith(extent);
    });

    test('extentが設定されていない場合はgraticule.extent()が呼ばれない', () => {
      graticuleLayer['renderGraticule']();

      expect(mockGraticule.extent).not.toHaveBeenCalled();
    });

    test('経緯線パス要素が作成される', () => {
      graticuleLayer['renderGraticule']();

      expect(mockContainer.append).toHaveBeenCalledWith('path');
      expect(mockContainer.datum).toHaveBeenCalled();
      expect(mockContainer.attr).toHaveBeenCalledWith('d', graticuleLayer['path']);
    });

    test('CSS classが正しく設定される', () => {
      graticuleLayer['renderGraticule']();

      expect(mockContainer.attr).toHaveBeenCalledWith('class', expect.any(Function));
    });
  });

  describe('style application', () => {
    test('基本スタイルが正しく適用される', () => {
      const styledLayer = new GraticuleLayer({
        attr: {
          fill: 'rgba(255,0,0,0.1)',
          stroke: '#ff0000',
          strokeWidth: 1.5,
          opacity: 0.8
        }
      });

      expect(styledLayer['attr'].fill).toBe('rgba(255,0,0,0.1)');
      expect(styledLayer['attr'].stroke).toBe('#ff0000');
      expect(styledLayer['attr'].strokeWidth).toBe(1.5);
      expect(styledLayer['attr'].opacity).toBe(0.8);
    });

    test('動的スタイル関数が設定できる', () => {
      const dynamicLayer = new GraticuleLayer({
        attr: {
          strokeWidth: (d, i) => (i || 0) === 0 ? 1 : 0.5,
          opacity: () => 0.6
        }
      });

      expect(typeof dynamicLayer['attr'].strokeWidth).toBe('function');
      expect(typeof dynamicLayer['attr'].opacity).toBe('function');

      // 関数の実行テスト
      const strokeResult = (dynamicLayer['attr'].strokeWidth as Function)({}, 0);
      expect(strokeResult).toBe(1);

      const opacityResult = (dynamicLayer['attr'].opacity as Function)();
      expect(opacityResult).toBe(0.6);
    });
  });

  describe('CSS class application', () => {
    test('デフォルトクラス名が適用される', () => {
      graticuleLayer['path'] = jest.fn() as any;
      graticuleLayer['layerGroup'] = mockContainer;

      graticuleLayer['renderGraticule']();

      expect(mockContainer.attr).toHaveBeenCalledWith('class', expect.any(Function));
    });

    test('カスタムクラス名が適用される', () => {
      const layerWithClass = new GraticuleLayer({
        attr: {
          className: 'custom-graticule'
        }
      });

      expect(layerWithClass['attr'].className).toBe('custom-graticule');
    });
  });

  describe('parameter validation', () => {
    test('step配列の長さが2であることを確認', () => {
      expect(graticuleLayer['step']).toHaveLength(2);
      
      const customLayer = new GraticuleLayer({
        step: [5, 10]
      });
      expect(customLayer['step']).toHaveLength(2);
    });

    test('extent配列の構造が正しいことを確認', () => {
      const extent: [[number, number], [number, number]] = [[-180, -90], [180, 90]];
      const layerWithExtent = new GraticuleLayer({
        extent: extent
      });
      
      const result = layerWithExtent['extent'];
      expect(result).toHaveLength(2);
      expect(result![0]).toHaveLength(2);
      expect(result![1]).toHaveLength(2);
    });
  });

  describe('error handling', () => {
    test('layerGroupが未設定の場合は処理が中断される', () => {
      graticuleLayer['path'] = jest.fn() as any;
      // layerGroupを意図的に未設定にする

      expect(() => {
        graticuleLayer['renderGraticule']();
      }).not.toThrow();

      expect(mockGraticule.step).not.toHaveBeenCalled();
    });

    test('pathが未設定の場合は処理が中断される', () => {
      graticuleLayer['layerGroup'] = mockContainer;
      // pathを意図的に未設定にする

      expect(() => {
        graticuleLayer['renderGraticule']();
      }).not.toThrow();

      expect(mockContainer.append).not.toHaveBeenCalled();
    });
  });

  describe('integration scenarios', () => {
    test('全世界の経緯線設定', () => {
      const globalLayer = new GraticuleLayer({
        step: [30, 15],
        extent: [[-180, -90], [180, 90]]
      });

      expect(globalLayer['step']).toEqual([30, 15]);
      expect(globalLayer['extent']).toEqual([[-180, -90], [180, 90]]);
    });

    test('地域限定の経緯線設定', () => {
      const regionalLayer = new GraticuleLayer({
        step: [5, 5],
        extent: [[120, 20], [150, 50]] // 日本周辺
      });

      expect(regionalLayer['step']).toEqual([5, 5]);
      expect(regionalLayer['extent']).toEqual([[120, 20], [150, 50]]);
    });

    test('高密度経緯線設定', () => {
      const denseLayer = new GraticuleLayer({
        step: [1, 1],
        attr: {
          strokeWidth: 0.25,
          opacity: 0.3
        }
      });

      expect(denseLayer['step']).toEqual([1, 1]);
      expect(denseLayer['attr'].strokeWidth).toBe(0.25);
      expect(denseLayer['attr'].opacity).toBe(0.3);
    });
  });
});