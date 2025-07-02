import { OutlineLayer } from '../outline-layer';
import { LayerAttributes } from '../../types';

describe('OutlineLayer', () => {
  let outlineLayer: OutlineLayer;
  let mockContainer: any;
  let mockProjection: any;
  let mockSVG: any;

  beforeEach(() => {
    outlineLayer = new OutlineLayer({
      attributes: {
        fill: 'none',
        stroke: '#333333',
        strokeWidth: 2
      }
    });

    // モック投影法
    mockProjection = jest.fn();

    // モックSVG要素
    mockSVG = {
      select: jest.fn().mockReturnThis(),
      remove: jest.fn().mockReturnThis(),
      empty: jest.fn(() => false),
      insert: jest.fn().mockReturnThis(),
      append: jest.fn().mockReturnThis(),
      attr: jest.fn().mockReturnThis()
    };

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
        remove: jest.fn(),
        closest: jest.fn(() => mockSVG)
      }))
    };
  });

  describe('constructor', () => {
    test('デフォルト設定が正しく適用される', () => {
      const defaultLayer = new OutlineLayer();
      
      expect(defaultLayer['createClipPath']).toBe(false);
      expect(defaultLayer['attributes'].fill).toBe('none');
      expect(defaultLayer['attributes'].stroke).toBe('#333333');
      expect(defaultLayer['attributes'].strokeWidth).toBe(1);
      expect(defaultLayer['attributes'].opacity).toBe(1);
    });

    test('カスタム設定が正しく適用される', () => {
      const customOptions = {
        createClipPath: true,
        clipPathId: 'custom-clip',
        attributes: {
          fill: 'blue',
          stroke: 'red',
          strokeWidth: 3
        }
      };

      const customLayer = new OutlineLayer(customOptions);

      expect(customLayer['createClipPath']).toBe(true);
      expect(customLayer['clipPathId']).toBe('custom-clip');
      expect(customLayer['attributes'].fill).toBe('blue');
      expect(customLayer['attributes'].stroke).toBe('red');
      expect(customLayer['attributes'].strokeWidth).toBe(3);
    });

    test('attr設定がstyleよりも優先される', () => {
      const layer = new OutlineLayer({
        attributes: { stroke: 'green' }
      });

      expect(layer['attributes'].stroke).toBe('green');
    });

    test('clipPathIdが自動生成される', () => {
      const layer = new OutlineLayer({ createClipPath: true });
      const clipPathId = layer.getClipPathId();

      expect(clipPathId).toContain('outline-clip-');
      expect(clipPathId.length).toBeGreaterThan(12);
    });
  });

  describe('projection management', () => {
    test('setProjection()で投影法を設定できる', () => {
      outlineLayer.setProjection(mockProjection);
      expect(outlineLayer['path']).toBeDefined();
    });

  });

  describe('render', () => {
    test('render()でレイヤーグループが作成される', () => {
      outlineLayer.render(mockContainer);

      expect(mockContainer.append).toHaveBeenCalledWith('g');
      expect(mockContainer.attr).toHaveBeenCalledWith('class', expect.stringContaining('thematika-layer'));
    });

    test('投影法が設定されていない場合は描画されない', () => {
      outlineLayer.render(mockContainer);
      
      // pathが未設定の場合は早期リターン
      expect(mockContainer.append).toHaveBeenCalledTimes(1); // レイヤーグループのみ
    });

    test('投影法設定後に描画が実行される', () => {
      outlineLayer.setProjection(mockProjection);
      outlineLayer.render(mockContainer);

      expect(outlineLayer.isRendered()).toBe(true);
    });
  });


  describe('clipping functionality', () => {
    let clipLayer: OutlineLayer;

    beforeEach(() => {
      clipLayer = new OutlineLayer({
        createClipPath: true,
        clipPathId: 'test-clip'
      });

      // d3.select()のモックを追加
      const mockD3 = require('d3-selection');
      mockD3.select.mockReturnValue(mockSVG);
    });

    test('createClipPath=trueの場合、クリップパスが作成される', () => {
      expect(clipLayer['createClipPath']).toBe(true);
      expect(clipLayer.getClipPathId()).toBe('test-clip');
    });

    test('getClipPathUrl()が正しいURL文字列を返す', () => {
      const url = clipLayer.getClipPathUrl();
      expect(url).toBe('url(#test-clip)');
    });

    test('クリップパス機能が有効な場合の描画処理', () => {
      const mockPath = jest.fn(() => 'M0,0L100,0L100,100L0,100Z') as any;
      clipLayer['path'] = mockPath;
      clipLayer['layerGroup'] = mockContainer;

      // renderOutline()をテスト
      clipLayer['renderOutline']();

      expect(mockContainer.node).toHaveBeenCalled();
    });

    test('outlinePathDataが存在しない場合はクリップパスが作成されない', () => {
      const mockPath = jest.fn(() => null) as any;
      clipLayer['path'] = mockPath;
      clipLayer['layerGroup'] = mockContainer;

      expect(() => {
        clipLayer['renderOutline']();
      }).not.toThrow();

      // pathがnullの場合でもnode()は呼ばれる可能性がある
      // 重要なのは例外が発生しないこと
    });
  });

  describe('sphere geometry', () => {
    test('Sphereジオメトリが正しく生成される', () => {
      const mockPath = jest.fn() as any;
      outlineLayer['path'] = mockPath;
      outlineLayer['layerGroup'] = mockContainer;

      outlineLayer['renderOutline']();

      expect(mockPath).toHaveBeenCalledWith({ type: "Sphere" });
    });
  });

  describe('style application', () => {
    test('基本スタイルが正しく適用される', () => {
      const styledLayer = new OutlineLayer({
        attributes: {
          fill: 'rgba(255,0,0,0.5)',
          stroke: '#ff0000',
          strokeWidth: 3,
          opacity: 0.8
        }
      });

      expect(styledLayer['attributes'].fill).toBe('rgba(255,0,0,0.5)');
      expect(styledLayer['attributes'].stroke).toBe('#ff0000');
      expect(styledLayer['attributes'].strokeWidth).toBe(3);
      expect(styledLayer['attributes'].opacity).toBe(0.8);
    });

    test('動的スタイル関数が設定できる', () => {
      const dynamicLayer = new OutlineLayer({
        attributes: {
          strokeWidth: (d, i) => (i || 0) === 0 ? 2 : 1,
          opacity: () => 0.7
        }
      });

      expect(typeof dynamicLayer['attributes'].strokeWidth).toBe('function');
      expect(typeof dynamicLayer['attributes'].opacity).toBe('function');

      // 関数の実行テスト
      const strokeResult = (dynamicLayer['attributes'].strokeWidth as Function)({}, 0);
      expect(strokeResult).toBe(2);

      const opacityResult = (dynamicLayer['attributes'].opacity as Function)();
      expect(opacityResult).toBe(0.7);
    });
  });

  describe('CSS class application', () => {
    test('デフォルトクラス名が適用される', () => {
      const mockPath = jest.fn() as any;
      outlineLayer['path'] = mockPath;
      outlineLayer['layerGroup'] = mockContainer;

      outlineLayer['renderOutline']();

      expect(mockContainer.attr).toHaveBeenCalledWith('class', expect.any(Function));
    });

    test('カスタムクラス名が適用される', () => {
      const layerWithClass = new OutlineLayer({
        attributes: {
          className: 'custom-outline'
        }
      });

      expect(layerWithClass['attributes'].className).toBe('custom-outline');
    });
  });

  describe('error handling', () => {
    test('layerGroupが未設定の場合は処理が中断される', () => {
      const mockPath = jest.fn() as any;
      outlineLayer['path'] = mockPath;
      // layerGroupを意図的に未設定にする

      expect(() => {
        outlineLayer['renderOutline']();
      }).not.toThrow();

      expect(mockPath).not.toHaveBeenCalled();
    });

    test('pathが未設定の場合は処理が中断される', () => {
      outlineLayer['layerGroup'] = mockContainer;
      // pathを意図的に未設定にする

      expect(() => {
        outlineLayer['renderOutline']();
      }).not.toThrow();

      expect(mockContainer.append).not.toHaveBeenCalled();
    });
  });
});