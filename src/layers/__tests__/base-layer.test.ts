import { BaseLayer } from '../base-layer';
import { LayerAttributes } from '../../types';
import { Selection } from 'd3-selection';

// テスト用のBaseLayerの具象クラス
class TestLayer extends BaseLayer {
  render(container: Selection<SVGGElement, unknown, HTMLElement, any>): void {
    // テスト用の空実装
    this.createLayerGroup(container);
  }

}

describe('BaseLayer', () => {
  let testLayer: TestLayer;
  let mockContainer: any;

  beforeEach(() => {
    testLayer = new TestLayer('test-layer', {
      fill: '#ff0000',
      stroke: '#000000',
      strokeWidth: 2
    });

    // モックコンテナの設定
    mockContainer = {
      append: jest.fn().mockReturnThis(),
      attr: jest.fn().mockReturnThis(),
      style: jest.fn().mockReturnThis(),
      node: jest.fn(() => ({ 
        tagName: 'g',
        remove: jest.fn() 
      }))
    };
  });

  describe('constructor', () => {
    test('IDとデフォルトスタイルが正しく設定される', () => {
      expect(testLayer.id).toBe('test-layer');
      expect(testLayer.visible).toBe(true);
      expect(testLayer.zIndex).toBe(0);
    });

    test('カスタムスタイルがマージされる', () => {
      const customLayer = new TestLayer('custom', { fill: 'blue' });
      expect(customLayer['attributes'].fill).toBe('blue');
      expect(customLayer['attributes'].stroke).toBe('#333333'); // デフォルト値
    });
  });

  describe('visibility management', () => {
    test('setVisible()で表示状態を変更できる', () => {
      expect(testLayer.visible).toBe(true);
      
      testLayer.setVisible(false);
      expect(testLayer.visible).toBe(false);
      
      testLayer.setVisible(true);
      expect(testLayer.visible).toBe(true);
    });
  });

  describe('zIndex management', () => {
    test('setZIndex()でz-indexを変更できる', () => {
      expect(testLayer.zIndex).toBe(0);
      
      testLayer.setZIndex(5);
      expect(testLayer.zIndex).toBe(5);
      
      testLayer.setZIndex(-1);
      expect(testLayer.zIndex).toBe(-1);
    });
  });


  describe('render management', () => {
    test('render()でレイヤーグループが作成される', () => {
      testLayer.render(mockContainer);
      
      expect(mockContainer.append).toHaveBeenCalledWith('g');
      expect(mockContainer.attr).toHaveBeenCalledWith('class', 'thematika-layer thematika-layer--test-layer');
      expect(testLayer.isRendered()).toBe(true);
    });

    test('isRendered()で描画状態を確認できる', () => {
      expect(testLayer.isRendered()).toBe(false);
      
      testLayer.render(mockContainer);
      expect(testLayer.isRendered()).toBe(true);
    });
  });

  describe('destroy', () => {
    test('destroy()でレイヤーが削除される', () => {
      testLayer.render(mockContainer);
      expect(testLayer.isRendered()).toBe(true);
      
      testLayer.destroy();
      expect(testLayer.isRendered()).toBe(false);
    });
  });

  describe('ATTRIBUTE_MAPPINGS', () => {
    test('属性マッピングが定義されている', () => {
      const attributeMappings = (BaseLayer as any).ATTRIBUTE_MAPPINGS;
      
      expect(Array.isArray(attributeMappings)).toBe(true);
      expect(attributeMappings.length).toBeGreaterThan(0);
      
      // 基本的な属性が含まれているかチェック
      const keys = attributeMappings.map((mapping: any) => mapping.key);
      expect(keys).toContain('fill');
      expect(keys).toContain('stroke');
      expect(keys).toContain('strokeWidth');
      expect(keys).toContain('opacity');
    });
  });
});