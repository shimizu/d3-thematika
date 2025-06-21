import { GraticuleLayer } from '../graticule-layer';
import { LayerStyle } from '../../types';

describe('GraticuleLayer', () => {
  let graticuleLayer: GraticuleLayer;
  let mockContainer: any;
  let mockProjection: any;
  let mockGraticule: any;

  beforeEach(() => {
    // モックGraticule関数
    mockGraticule = {
      step: jest.fn().mockReturnThis(),
      extent: jest.fn().mockReturnThis()
    };

    // d3.geoGraticuleのモック
    const mockD3Geo = require('d3-geo');
    mockD3Geo.geoGraticule.mockReturnValue(mockGraticule);

    graticuleLayer = new GraticuleLayer({
      step: [15, 15],
      style: {
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
      
      expect(defaultLayer.getStep()).toEqual([10, 10]);
      expect(defaultLayer.getExtent()).toBeUndefined();
      expect(defaultLayer['style'].fill).toBe('none');
      expect(defaultLayer['style'].stroke).toBe('#cccccc');
      expect(defaultLayer['style'].strokeWidth).toBe(0.5);
      expect(defaultLayer['style'].opacity).toBe(0.7);
    });

    test('カスタム設定が正しく適用される', () => {
      const customOptions = {
        step: [20, 20] as [number, number],
        extent: [[-180, -90], [180, 90]] as [[number, number], [number, number]],
        style: {
          fill: 'blue',
          stroke: 'red',
          strokeWidth: 1.5,
          opacity: 0.9
        }
      };

      const customLayer = new GraticuleLayer(customOptions);

      expect(customLayer.getStep()).toEqual([20, 20]);
      expect(customLayer.getExtent()).toEqual([[-180, -90], [180, 90]]);
      expect(customLayer['style'].fill).toBe('blue');
      expect(customLayer['style'].stroke).toBe('red');
      expect(customLayer['style'].strokeWidth).toBe(1.5);
      expect(customLayer['style'].opacity).toBe(0.9);
    });

    test('attr設定がstyleよりも優先される', () => {
      const layer = new GraticuleLayer({
        style: { stroke: 'blue' },
        attr: { stroke: 'green' }
      });

      expect(layer['style'].stroke).toBe('green');
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

    test('投影法設定後にupdate()が呼ばれる', () => {
      const mockUpdate = jest.spyOn(graticuleLayer, 'update');
      graticuleLayer['layerGroup'] = mockContainer;

      graticuleLayer.setProjection(mockProjection);

      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  describe('step management', () => {
    test('setStep()で間隔を変更できる', () => {
      expect(graticuleLayer.getStep()).toEqual([15, 15]);

      graticuleLayer.setStep([30, 30]);
      expect(graticuleLayer.getStep()).toEqual([30, 30]);
    });

    test('setStep()後にupdate()が呼ばれる', () => {
      const mockUpdate = jest.spyOn(graticuleLayer, 'update');
      graticuleLayer['layerGroup'] = mockContainer;

      graticuleLayer.setStep([20, 20]);

      expect(mockUpdate).toHaveBeenCalled();
    });

    test('異なる経度・緯度間隔を設定できる', () => {
      graticuleLayer.setStep([10, 5]);
      expect(graticuleLayer.getStep()).toEqual([10, 5]);
    });
  });

  describe('extent management', () => {
    test('setExtent()で範囲を設定できる', () => {
      const extent: [[number, number], [number, number]] = [[-90, -45], [90, 45]];
      
      graticuleLayer.setExtent(extent);
      expect(graticuleLayer.getExtent()).toEqual(extent);
    });

    test('setExtent()でundefinedを設定できる', () => {
      graticuleLayer.setExtent([[-90, -45], [90, 45]]);
      expect(graticuleLayer.getExtent()).toBeDefined();

      graticuleLayer.setExtent(undefined);
      expect(graticuleLayer.getExtent()).toBeUndefined();
    });

    test('setExtent()後にupdate()が呼ばれる', () => {
      const mockUpdate = jest.spyOn(graticuleLayer, 'update');
      graticuleLayer['layerGroup'] = mockContainer;

      graticuleLayer.setExtent([[-180, -90], [180, 90]]);

      expect(mockUpdate).toHaveBeenCalled();
    });
  });

  describe('render', () => {
    test('render()でレイヤーグループが作成される', () => {
      graticuleLayer.render(mockContainer);

      expect(mockContainer.append).toHaveBeenCalledWith('g');
      expect(mockContainer.attr).toHaveBeenCalledWith('class', expect.stringContaining('cartography-layer'));
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

  describe('update', () => {
    test('update()で既存の要素が削除される', () => {
      graticuleLayer['layerGroup'] = mockContainer;
      graticuleLayer.update();

      expect(mockContainer.selectAll).toHaveBeenCalledWith('path');
      expect(mockContainer.remove).toHaveBeenCalled();
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
      graticuleLayer.setExtent(extent);

      graticuleLayer['renderGraticule']();

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
        style: {
          fill: 'rgba(255,0,0,0.1)',
          stroke: '#ff0000',
          strokeWidth: 1.5,
          opacity: 0.8
        }
      });

      expect(styledLayer['style'].fill).toBe('rgba(255,0,0,0.1)');
      expect(styledLayer['style'].stroke).toBe('#ff0000');
      expect(styledLayer['style'].strokeWidth).toBe(1.5);
      expect(styledLayer['style'].opacity).toBe(0.8);
    });

    test('動的スタイル関数が設定できる', () => {
      const dynamicLayer = new GraticuleLayer({
        style: {
          strokeWidth: (d, i) => (i || 0) === 0 ? 1 : 0.5,
          opacity: () => 0.6
        }
      });

      expect(typeof dynamicLayer['style'].strokeWidth).toBe('function');
      expect(typeof dynamicLayer['style'].opacity).toBe('function');

      // 関数の実行テスト
      const strokeResult = (dynamicLayer['style'].strokeWidth as Function)({}, 0);
      expect(strokeResult).toBe(1);

      const opacityResult = (dynamicLayer['style'].opacity as Function)();
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
        style: {
          className: 'custom-graticule'
        }
      });

      expect(layerWithClass['style'].className).toBe('custom-graticule');
    });
  });

  describe('parameter validation', () => {
    test('step配列の長さが2であることを確認', () => {
      expect(graticuleLayer.getStep()).toHaveLength(2);
      
      graticuleLayer.setStep([5, 10]);
      expect(graticuleLayer.getStep()).toHaveLength(2);
    });

    test('extent配列の構造が正しいことを確認', () => {
      const extent: [[number, number], [number, number]] = [[-180, -90], [180, 90]];
      graticuleLayer.setExtent(extent);
      
      const result = graticuleLayer.getExtent();
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

      expect(globalLayer.getStep()).toEqual([30, 15]);
      expect(globalLayer.getExtent()).toEqual([[-180, -90], [180, 90]]);
    });

    test('地域限定の経緯線設定', () => {
      const regionalLayer = new GraticuleLayer({
        step: [5, 5],
        extent: [[120, 20], [150, 50]] // 日本周辺
      });

      expect(regionalLayer.getStep()).toEqual([5, 5]);
      expect(regionalLayer.getExtent()).toEqual([[120, 20], [150, 50]]);
    });

    test('高密度経緯線設定', () => {
      const denseLayer = new GraticuleLayer({
        step: [1, 1],
        style: {
          strokeWidth: 0.25,
          opacity: 0.3
        }
      });

      expect(denseLayer.getStep()).toEqual([1, 1]);
      expect(denseLayer['style'].strokeWidth).toBe(0.25);
      expect(denseLayer['style'].opacity).toBe(0.3);
    });
  });
});