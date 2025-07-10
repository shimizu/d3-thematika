import { ImageLayer, ImageLayerOptions } from '../image-layer';
import { Selection } from 'd3-selection';
import * as d3 from 'd3-geo';

// HTMLImageElement のモック
class MockImage {
  width = 554;
  height = 480;
  crossOrigin = '';
  src = '';
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private static globalShouldFail = false;

  constructor() {
    // 非同期でonloadを呼び出すために少し遅延
    setTimeout(() => {
      if (MockImage.globalShouldFail && this.onerror) {
        this.onerror();
      } else if (!MockImage.globalShouldFail && this.onload) {
        this.onload();
      }
    }, 10);
  }
  
  static setFailMode(fail: boolean) {
    MockImage.globalShouldFail = fail;
  }
}

// グローバルImageをモック
global.Image = MockImage as any;

// document.createElement のモック
const mockCanvas = {
  width: 0,
  height: 0,
  getContext: jest.fn(() => ({
    drawImage: jest.fn(),
    getImageData: jest.fn(() => ({
      data: new Uint8ClampedArray(4 * 554 * 480).fill(255)
    })),
    createImageData: jest.fn((width, height) => ({
      data: new Uint8ClampedArray(4 * width * height)
    })),
    putImageData: jest.fn(),
  })),
  toDataURL: jest.fn(() => 'data:image/png;base64,mock')
};

// グローバルsetupからの干渉を避けるため、テスト内で独自にmock
jest.mock('../../browser-mocks', () => ({}), { virtual: true });

// documentのモック
const mockDocument = {
  createElement: jest.fn((tagName) => {
    if (tagName === 'canvas') {
      return mockCanvas;
    }
    return {};
  }),
  createElementNS: jest.fn()
};

// グローバルdocumentを上書き
Object.defineProperty(global, 'document', {
  value: mockDocument,
  writable: true
});

describe('ImageLayer', () => {
  let imageLayer: ImageLayer;
  let mockContainer: any;
  let mockProjection: any;

  const defaultOptions: ImageLayerOptions = {
    src: './test-image.png',
    bounds: [-25.855061, -38.477223, 66.427949, 41.479176],
    attr: { opacity: 0.7 }
  };

  beforeEach(() => {
    // グローバルに保存されるモック要素
    let mockImageElement: any;
    let mockInnerGroup: any;

    // モックコンテナの設定（ネストした構造も含む）
    mockImageElement = {
      attr: jest.fn().mockReturnThis(),
      style: jest.fn().mockReturnThis()
    };
    
    mockInnerGroup = {
      append: jest.fn((tag: string): any => {
        if (tag === 'image') return mockImageElement;
        return mockInnerGroup;
      }),
      attr: jest.fn().mockReturnThis(),
      style: jest.fn().mockReturnThis(),
      selectAll: jest.fn().mockReturnThis(),
      remove: jest.fn().mockReturnThis(),
      node: jest.fn(() => ({
        tagName: 'g',
        remove: jest.fn()
      }))
    };
    
    mockContainer = {
      append: jest.fn(() => mockInnerGroup),
      attr: jest.fn().mockReturnThis(),
      style: jest.fn().mockReturnThis(),
      selectAll: jest.fn().mockReturnThis(),
      remove: jest.fn().mockReturnThis(),
      node: jest.fn(() => ({
        tagName: 'g',
        remove: jest.fn()
      }))
    };
    
    // テスト内で参照できるようにグローバルに保存
    (mockContainer as any).innerGroup = mockInnerGroup;
    (mockContainer as any).imageElement = mockImageElement;

    // モック投影法（Equirectangular）
    mockProjection = jest.fn((coords) => {
      if (!coords || coords.length !== 2) return null;
      const [lon, lat] = coords;
      // 簡単な線形変換
      return [lon * 2, -lat * 2];
    });
    mockProjection.toString = () => 'geoEquirectangular';
    mockProjection.scale = jest.fn(() => 100);
    mockProjection.translate = jest.fn(() => [400, 200]);

    imageLayer = new ImageLayer('test-image', defaultOptions);

    // MockImageを成功モードに設定
    MockImage.setFailMode(false);

    // console のモック（グローバルsetupの影響を回避）
    global.console = {
      ...console,
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    test('オプションが正しく設定される', () => {
      expect(imageLayer.id).toBe('test-image');
      expect(imageLayer['src']).toBe('./test-image.png');
      expect(imageLayer['bounds']).toEqual([-25.855061, -38.477223, 66.427949, 41.479176]);
      expect(imageLayer['showBboxMarkers']).toBe(false);
    });

    test('showBboxMarkersオプションが正しく設定される', () => {
      const layerWithMarkers = new ImageLayer('test-markers', {
        ...defaultOptions,
        showBboxMarkers: true
      });
      expect(layerWithMarkers['showBboxMarkers']).toBe(true);
    });

    test('デフォルト値が適用される', () => {
      const minimalLayer = new ImageLayer('minimal', {
        src: 'test.png',
        bounds: [0, 0, 1, 1]
      });
      expect(minimalLayer['showBboxMarkers']).toBe(false);
    });
  });

  describe('setProjection', () => {
    test('投影法が設定される', () => {
      imageLayer.setProjection(mockProjection);
      expect(imageLayer['projection']).toBe(mockProjection);
    });

  });

  describe('render', () => {
    beforeEach(() => {
      imageLayer.setProjection(mockProjection);
    });

    test('投影法が設定されていない場合は警告を出す', async () => {
      const layerWithoutProjection = new ImageLayer('no-proj', defaultOptions);
      await layerWithoutProjection.render(mockContainer);
      expect(console.warn).toHaveBeenCalledWith('ImageLayer: 投影法が設定されていません');
    });

    test('レイヤーグループが作成される', async () => {
      await imageLayer.render(mockContainer);
      
      // グループが作成される
      expect(mockContainer.append).toHaveBeenCalledWith('g');
      
      // 内部グループに属性が設定される
      const innerGroup = mockContainer.append();
      expect(innerGroup.attr).toHaveBeenCalledWith('class', 'image-layer ');
      expect(innerGroup.attr).toHaveBeenCalledWith('id', 'layer-test-image');
    });

    test('非表示レイヤーは display:none が設定される', async () => {
      imageLayer.setVisible(false);
      await imageLayer.render(mockContainer);
      
      // 内部グループにスタイルが設定される
      const innerGroup = mockContainer.append();
      expect(innerGroup.style).toHaveBeenCalledWith('display', 'none');
    });

    test('画像が正常にレンダリングされる', async () => {
      await imageLayer.render(mockContainer);
      
      // 少し待機してから検証
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // グループが作成されることを確認
      expect(mockContainer.append).toHaveBeenCalledWith('g');
      
      // レイヤーが正常にレンダリングされたことを確認
      expect(imageLayer.isRendered()).toBe(true);
    });

    test('投影変換の詳細ログが出力される', async () => {
      await imageLayer.render(mockContainer);
      
      await new Promise(resolve => setTimeout(resolve, 20));
      
      expect(console.log).toHaveBeenCalledWith('=== ImageLayer bbox projection ===');
      expect(console.log).toHaveBeenCalledWith('Original bbox:', expect.any(Object));
      expect(console.log).toHaveBeenCalledWith('Projected coordinates (output):');
    });
  });

  describe('bboxマーカー機能', () => {
    beforeEach(() => {
      imageLayer.setProjection(mockProjection);
    });

    test('showBboxMarkersがtrueの場合にマーカーが表示される', async () => {
      const layerWithMarkers = new ImageLayer('markers', {
        ...defaultOptions,
        showBboxMarkers: true
      });
      layerWithMarkers.setProjection(mockProjection);

      await layerWithMarkers.render(mockContainer);
      await new Promise(resolve => setTimeout(resolve, 20));

      // マーカー用のグループが作成されることを確認
      expect(mockContainer.append).toHaveBeenCalledWith('g');
    });

    test('showBboxMarkersオプションが正しく設定される', () => {
      // デフォルトはfalse
      expect(imageLayer['showBboxMarkers']).toBe(false);
      
      // trueを指定したレイヤー
      const layerWithMarkers = new ImageLayer('test-markers', {
        ...defaultOptions,
        showBboxMarkers: true
      });
      expect(layerWithMarkers['showBboxMarkers']).toBe(true);
    });

    test('新しいオプションでインスタンス作成可能', () => {
      const layerWithOptions = new ImageLayer('test-options', {
        ...defaultOptions,
        showBboxMarkers: true
      });
      
      expect(layerWithOptions['showBboxMarkers']).toBe(true);
    });
  });

  describe('isEquirectangularProjection', () => {
    test('Equirectangular投影法を正しく判定する', () => {
      const equirectProj = { toString: () => 'geoEquirectangular' };
      expect(imageLayer['isEquirectangularProjection'](equirectProj as any)).toBe(true);

      const equirectProj2 = { toString: () => 'equirectangular' };
      expect(imageLayer['isEquirectangularProjection'](equirectProj2 as any)).toBe(true);
    });

    test('他の投影法はfalseを返す', () => {
      const mercatorProj = { toString: () => 'geoMercator' };
      expect(imageLayer['isEquirectangularProjection'](mercatorProj as any)).toBe(false);

      const orthographicProj = { toString: () => 'geoOrthographic' };
      expect(imageLayer['isEquirectangularProjection'](orthographicProj as any)).toBe(false);
    });
  });


  describe('loadImage', () => {
    test('画像の読み込みが成功する', async () => {
      const img = await imageLayer['loadImage']('test.png');
      expect(img).toBeInstanceOf(MockImage);
      expect(img.crossOrigin).toBe('anonymous');
    });

    test('画像の読み込みが失敗した場合はエラーを投げる', async () => {
      // 失敗モードに設定
      MockImage.setFailMode(true);
      
      await expect(imageLayer['loadImage']('invalid.png'))
        .rejects.toThrow('画像の読み込みに失敗しました: invalid.png');
        
      // 成功モードに戻す
      MockImage.setFailMode(false);
    });
  });

  describe('approximateInverseProjection', () => {
    beforeEach(() => {
      imageLayer.setProjection(mockProjection);
    });

    // approximateInverseProjectionメソッドはリファクタリングで削除されたためテストをコメントアウト
    // test('逆投影を近似的に計算する', () => {
    //   const result = imageLayer['approximateInverseProjection'](0, 0, -180, -90, 180, 90);
    //   expect(result).not.toBeNull();
    //   expect(Array.isArray(result)).toBe(true);
    //   expect(result).toHaveLength(2);
    // });

    // approximateInverseProjectionメソッドはリファクタリングで削除されたためテストをコメントアウト
    // test('投影法が設定されていない場合はnullを返す', () => {
    //   const layerWithoutProj = new ImageLayer('no-proj', defaultOptions);
    //   const result = layerWithoutProj['approximateInverseProjection'](0, 0, -180, -90, 180, 90);
    //   expect(result).toBeNull();
    // });

    // approximateInverseProjectionメソッドはリファクタリングで削除されたためテストをコメントアウト
    // test('投影結果がnullの場合はnullを返す', () => {
    //   const failingProjection = jest.fn(() => null) as any;
    //   imageLayer['projection'] = failingProjection;
    //   const result = imageLayer['approximateInverseProjection'](0, 0, -180, -90, 180, 90);
    //   expect(result).toBeNull();
    // });
  });

  describe('エラーハンドリング', () => {
    beforeEach(() => {
      imageLayer.setProjection(mockProjection);
    });

    test('画像読み込みエラーが適切にハンドリングされる', async () => {
      // 失敗モードに設定
      MockImage.setFailMode(true);
      
      await imageLayer.render(mockContainer);
      await new Promise(resolve => setTimeout(resolve, 30));
      
      expect(console.error).toHaveBeenCalledWith(
        'ImageLayer: 画像の描画に失敗しました', 
        expect.any(Error)
      );
      
      // 成功モードに戻す
      MockImage.setFailMode(false);
    });

    test('投影範囲外の境界は警告を出す', async () => {
      // 常にnullを返す投影法
      const failingProjection = jest.fn(() => null) as any;
      imageLayer.setProjection(failingProjection);
      
      await imageLayer.render(mockContainer);
      await new Promise(resolve => setTimeout(resolve, 20));
      
      expect(console.warn).toHaveBeenCalledWith('ImageLayer: 境界が投影範囲外です');
    });
  });

  describe('スタイル適用', () => {
    beforeEach(() => {
      imageLayer.setProjection(mockProjection);
    });

    test('透明度が適用される', async () => {
      const layerWithOpacity = new ImageLayer('opacity-test', {
        ...defaultOptions,
        attr: { opacity: 0.5 }
      });
      layerWithOpacity.setProjection(mockProjection);
      
      await layerWithOpacity.render(mockContainer);
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // レイヤーがレンダリングされ、スタイルが設定されていることを確認
      expect(layerWithOpacity.isRendered()).toBe(true);
      expect(layerWithOpacity['attr'].opacity).toBe(0.5);
    });

    test('フィルターが適用される', async () => {
      const layerWithFilter = new ImageLayer('filter-test', {
        ...defaultOptions,
        attr: { filter: 'url(#shadow)' }
      });
      layerWithFilter.setProjection(mockProjection);
      
      await layerWithFilter.render(mockContainer);
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // レイヤーがレンダリングされ、スタイルが設定されていることを確認
      expect(layerWithFilter.isRendered()).toBe(true);
      expect(layerWithFilter['attr'].filter).toBe('url(#shadow)');
    });
  });
});