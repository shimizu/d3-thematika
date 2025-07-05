import {
  createDotsTexture,
  createLinesTexture,
  createPathsTexture,
  createOceanTexture,
  createForestTexture,
  createDesertTexture,
  createMountainTexture,
  TexturePresets,
  type DotsTextureOptions,
  type LinesTextureOptions,
  type PathsTextureOptions
} from '../texture-utils';
import { Selection } from 'd3-selection';

// textures.jsは自動的にモックされる（jest.config.jsのmoduleNameMapperで設定済み）
const mockTexture = require('../../../tests/mocks/textures.js');

const mockTextureInstance = {
  radius: jest.fn().mockReturnThis(),
  fill: jest.fn().mockReturnThis(),
  background: jest.fn().mockReturnThis(),
  size: jest.fn().mockReturnThis(),
  id: jest.fn().mockReturnThis(),
  orientation: jest.fn().mockReturnThis(),
  stroke: jest.fn().mockReturnThis(),
  strokeWidth: jest.fn().mockReturnThis(),
  d: jest.fn().mockReturnThis(),
  url: jest.fn().mockReturnValue('url(#test-texture)')
};

// D3 Selectionのモック
const mockSelection = {
  call: jest.fn()
} as unknown as Selection<SVGDefsElement, unknown, HTMLElement, any>;

describe('texture-utils', () => {
  beforeEach(() => {
    // モック関数をクリア
    jest.clearAllMocks();
    
    // テクスチャメソッドが常にmockTextureInstanceを返すように設定
    mockTexture.circles.mockReturnValue(mockTextureInstance);
    mockTexture.lines.mockReturnValue(mockTextureInstance);
    mockTexture.paths.mockReturnValue(mockTextureInstance);
  });

  describe('createDotsTexture', () => {
    it('基本的なドットテクスチャを作成する', () => {
      const options: DotsTextureOptions = {
        id: 'test-dots'
      };
      
      const textureFunction = createDotsTexture(options);
      
      expect(mockTexture.circles).toHaveBeenCalled();
      expect(mockTextureInstance.id).toHaveBeenCalledWith('test-dots');
      expect(mockTextureInstance.radius).toHaveBeenCalledWith(1); // デフォルト値
      expect(mockTextureInstance.fill).toHaveBeenCalledWith('#000'); // デフォルト値
      expect(mockTextureInstance.background).toHaveBeenCalledWith('#ffffff'); // デフォルト値
      expect(mockTextureInstance.size).toHaveBeenCalledWith(4); // デフォルト値
    });

    it('カスタムオプションでドットテクスチャを作成する', () => {
      const options: DotsTextureOptions = {
        id: 'custom-dots',
        size: 8,
        background: '#f0f0f0',
        fill: '#ff0000',
        radius: 2
      };
      
      const textureFunction = createDotsTexture(options);
      
      expect(mockTextureInstance.id).toHaveBeenCalledWith('custom-dots');
      expect(mockTextureInstance.radius).toHaveBeenCalledWith(2);
      expect(mockTextureInstance.fill).toHaveBeenCalledWith('#ff0000');
      expect(mockTextureInstance.background).toHaveBeenCalledWith('#f0f0f0');
      expect(mockTextureInstance.size).toHaveBeenCalledWith(8);
    });

    it('テクスチャ関数を実行してselectionに適用する', () => {
      const options: DotsTextureOptions = {
        id: 'test-dots'
      };
      
      const textureFunction = createDotsTexture(options);
      textureFunction(mockSelection);
      
      expect(mockSelection.call).toHaveBeenCalledWith(mockTextureInstance);
    });

    it('url()メソッドが正しく委譲される', () => {
      const options: DotsTextureOptions = {
        id: 'test-dots'
      };
      
      const textureFunction = createDotsTexture(options);
      const url = (textureFunction as any).url();
      
      expect(mockTextureInstance.url).toHaveBeenCalled();
      expect(url).toBe('url(#test-texture)');
    });
  });

  describe('createLinesTexture', () => {
    it('基本的な線テクスチャを作成する', () => {
      const options: LinesTextureOptions = {
        id: 'test-lines'
      };
      
      const textureFunction = createLinesTexture(options);
      
      expect(mockTexture.lines).toHaveBeenCalled();
      expect(mockTextureInstance.id).toHaveBeenCalledWith('test-lines');
      expect(mockTextureInstance.orientation).toHaveBeenCalledWith('diagonal'); // デフォルト値
      expect(mockTextureInstance.stroke).toHaveBeenCalledWith('#000'); // デフォルト値
      expect(mockTextureInstance.strokeWidth).toHaveBeenCalledWith(1); // デフォルト値
      expect(mockTextureInstance.background).toHaveBeenCalledWith('#ffffff'); // デフォルト値
      expect(mockTextureInstance.size).toHaveBeenCalledWith(4); // デフォルト値
    });

    it('カスタムオプションで線テクスチャを作成する', () => {
      const options: LinesTextureOptions = {
        id: 'custom-lines',
        size: 6,
        background: '#e0e0e0',
        stroke: '#0000ff',
        strokeWidth: 2,
        orientation: ['horizontal', 'vertical']
      };
      
      const textureFunction = createLinesTexture(options);
      
      expect(mockTextureInstance.id).toHaveBeenCalledWith('custom-lines');
      expect(mockTextureInstance.orientation).toHaveBeenCalledWith('horizontal', 'vertical');
      expect(mockTextureInstance.stroke).toHaveBeenCalledWith('#0000ff');
      expect(mockTextureInstance.strokeWidth).toHaveBeenCalledWith(2);
      expect(mockTextureInstance.background).toHaveBeenCalledWith('#e0e0e0');
      expect(mockTextureInstance.size).toHaveBeenCalledWith(6);
    });

    it('テクスチャ関数を実行してselectionに適用する', () => {
      const options: LinesTextureOptions = {
        id: 'test-lines'
      };
      
      const textureFunction = createLinesTexture(options);
      textureFunction(mockSelection);
      
      expect(mockSelection.call).toHaveBeenCalledWith(mockTextureInstance);
    });

    it('url()メソッドが正しく委譲される', () => {
      const options: LinesTextureOptions = {
        id: 'test-lines'
      };
      
      const textureFunction = createLinesTexture(options);
      const url = (textureFunction as any).url();
      
      expect(mockTextureInstance.url).toHaveBeenCalled();
      expect(url).toBe('url(#test-texture)');
    });
  });

  describe('createPathsTexture', () => {
    it('基本的なパステクスチャを作成する', () => {
      const options: PathsTextureOptions = {
        id: 'test-paths'
      };
      
      const textureFunction = createPathsTexture(options);
      
      expect(mockTexture.paths).toHaveBeenCalled();
      expect(mockTextureInstance.id).toHaveBeenCalledWith('test-paths');
      expect(mockTextureInstance.d).toHaveBeenCalledWith('M 0,0 l 10,10 M 10,0 l -10,10'); // デフォルト値
      expect(mockTextureInstance.size).toHaveBeenCalledWith(10); // デフォルト値
      expect(mockTextureInstance.background).toHaveBeenCalledWith('#ffffff'); // デフォルト値
      expect(mockTextureInstance.fill).toHaveBeenCalledWith('none'); // デフォルト値
      expect(mockTextureInstance.stroke).toHaveBeenCalledWith('#000'); // デフォルト値
      expect(mockTextureInstance.strokeWidth).toHaveBeenCalledWith(1); // デフォルト値
    });

    it('カスタムオプションでパステクスチャを作成する', () => {
      const options: PathsTextureOptions = {
        id: 'custom-paths',
        d: 'M 0,0 L 10,10',
        size: 15,
        background: '#f5f5f5',
        fill: '#00ff00',
        stroke: '#ff00ff',
        strokeWidth: 3
      };
      
      const textureFunction = createPathsTexture(options);
      
      expect(mockTextureInstance.id).toHaveBeenCalledWith('custom-paths');
      expect(mockTextureInstance.d).toHaveBeenCalledWith('M 0,0 L 10,10');
      expect(mockTextureInstance.size).toHaveBeenCalledWith(15);
      expect(mockTextureInstance.background).toHaveBeenCalledWith('#f5f5f5');
      expect(mockTextureInstance.fill).toHaveBeenCalledWith('#00ff00');
      expect(mockTextureInstance.stroke).toHaveBeenCalledWith('#ff00ff');
      expect(mockTextureInstance.strokeWidth).toHaveBeenCalledWith(3);
    });

    it('テクスチャ関数を実行してselectionに適用する', () => {
      const options: PathsTextureOptions = {
        id: 'test-paths'
      };
      
      const textureFunction = createPathsTexture(options);
      textureFunction(mockSelection);
      
      expect(mockSelection.call).toHaveBeenCalledWith(mockTextureInstance);
    });

    it('url()メソッドが正しく委譲される', () => {
      const options: PathsTextureOptions = {
        id: 'test-paths'
      };
      
      const textureFunction = createPathsTexture(options);
      const url = (textureFunction as any).url();
      
      expect(mockTextureInstance.url).toHaveBeenCalled();
      expect(url).toBe('url(#test-texture)');
    });
  });

  describe('createOceanTexture', () => {
    it('デフォルトの海テクスチャを作成する', () => {
      const textureFunction = createOceanTexture();
      
      expect(mockTexture.lines).toHaveBeenCalled();
      expect(mockTextureInstance.id).toHaveBeenCalledWith('ocean');
      expect(mockTextureInstance.orientation).toHaveBeenCalledWith('horizontal');
      expect(mockTextureInstance.stroke).toHaveBeenCalledWith('#1976d2');
      expect(mockTextureInstance.strokeWidth).toHaveBeenCalledWith(0.8); // medium intensity
      expect(mockTextureInstance.background).toHaveBeenCalledWith('#bbdefb'); // medium intensity
      expect(mockTextureInstance.size).toHaveBeenCalledWith(4); // medium intensity
    });

    it('軽い強度の海テクスチャを作成する', () => {
      const textureFunction = createOceanTexture({
        id: 'light-ocean',
        intensity: 'light'
      });
      
      expect(mockTextureInstance.id).toHaveBeenCalledWith('light-ocean');
      expect(mockTextureInstance.strokeWidth).toHaveBeenCalledWith(0.5);
      expect(mockTextureInstance.background).toHaveBeenCalledWith('#e3f2fd');
      expect(mockTextureInstance.size).toHaveBeenCalledWith(6);
    });

    it('濃い強度の海テクスチャを作成する', () => {
      const textureFunction = createOceanTexture({
        id: 'heavy-ocean',
        intensity: 'heavy'
      });
      
      expect(mockTextureInstance.id).toHaveBeenCalledWith('heavy-ocean');
      expect(mockTextureInstance.strokeWidth).toHaveBeenCalledWith(1.2);
      expect(mockTextureInstance.background).toHaveBeenCalledWith('#90caf9');
      expect(mockTextureInstance.size).toHaveBeenCalledWith(3);
    });
  });

  describe('createForestTexture', () => {
    it('デフォルトの森林テクスチャを作成する', () => {
      const textureFunction = createForestTexture();
      
      expect(mockTexture.circles).toHaveBeenCalled();
      expect(mockTextureInstance.id).toHaveBeenCalledWith('forest');
      expect(mockTextureInstance.radius).toHaveBeenCalledWith(1.5); // medium density
      expect(mockTextureInstance.fill).toHaveBeenCalledWith('#2e7d32');
      expect(mockTextureInstance.background).toHaveBeenCalledWith('#c8e6c9'); // medium density
      expect(mockTextureInstance.size).toHaveBeenCalledWith(6); // medium density
    });

    it('疎らな密度の森林テクスチャを作成する', () => {
      const textureFunction = createForestTexture({
        id: 'sparse-forest',
        density: 'sparse'
      });
      
      expect(mockTextureInstance.id).toHaveBeenCalledWith('sparse-forest');
      expect(mockTextureInstance.radius).toHaveBeenCalledWith(1);
      expect(mockTextureInstance.background).toHaveBeenCalledWith('#e8f5e8');
      expect(mockTextureInstance.size).toHaveBeenCalledWith(8);
    });

    it('密な密度の森林テクスチャを作成する', () => {
      const textureFunction = createForestTexture({
        id: 'dense-forest',
        density: 'dense'
      });
      
      expect(mockTextureInstance.id).toHaveBeenCalledWith('dense-forest');
      expect(mockTextureInstance.radius).toHaveBeenCalledWith(2);
      expect(mockTextureInstance.background).toHaveBeenCalledWith('#a5d6a7');
      expect(mockTextureInstance.size).toHaveBeenCalledWith(4);
    });
  });

  describe('createDesertTexture', () => {
    it('砂漠テクスチャを作成する', () => {
      const textureFunction = createDesertTexture();
      
      expect(mockTexture.paths).toHaveBeenCalled();
      expect(mockTextureInstance.id).toHaveBeenCalledWith('desert');
      expect(mockTextureInstance.d).toHaveBeenCalledWith('M 0,5 Q 5,0 10,5 Q 15,10 20,5');
      expect(mockTextureInstance.size).toHaveBeenCalledWith(20);
      expect(mockTextureInstance.background).toHaveBeenCalledWith('#fff8e1');
      expect(mockTextureInstance.fill).toHaveBeenCalledWith('none');
      expect(mockTextureInstance.stroke).toHaveBeenCalledWith('#ff8f00');
      expect(mockTextureInstance.strokeWidth).toHaveBeenCalledWith(0.8);
    });

    it('カスタムIDで砂漠テクスチャを作成する', () => {
      const textureFunction = createDesertTexture({
        id: 'custom-desert'
      });
      
      expect(mockTextureInstance.id).toHaveBeenCalledWith('custom-desert');
    });
  });

  describe('createMountainTexture', () => {
    it('山岳テクスチャを作成する', () => {
      const textureFunction = createMountainTexture();
      
      expect(mockTexture.paths).toHaveBeenCalled();
      expect(mockTextureInstance.id).toHaveBeenCalledWith('mountain');
      expect(mockTextureInstance.d).toHaveBeenCalledWith('M 0,10 L 5,0 L 10,10 Z');
      expect(mockTextureInstance.size).toHaveBeenCalledWith(10);
      expect(mockTextureInstance.background).toHaveBeenCalledWith('#efebe9');
      expect(mockTextureInstance.fill).toHaveBeenCalledWith('#5d4037');
      expect(mockTextureInstance.stroke).toHaveBeenCalledWith('#3e2723');
      expect(mockTextureInstance.strokeWidth).toHaveBeenCalledWith(0.5);
    });

    it('カスタムIDで山岳テクスチャを作成する', () => {
      const textureFunction = createMountainTexture({
        id: 'custom-mountain'
      });
      
      expect(mockTextureInstance.id).toHaveBeenCalledWith('custom-mountain');
    });
  });

  describe('TexturePresets', () => {
    it('lightOceanプリセットが正しく動作する', () => {
      const textureFunction = TexturePresets.lightOcean();
      
      expect(mockTexture.lines).toHaveBeenCalled();
      expect(mockTextureInstance.id).toHaveBeenCalledWith('lightOcean');
      expect(mockTextureInstance.strokeWidth).toHaveBeenCalledWith(0.5);
    });

    it('standardOceanプリセットが正しく動作する', () => {
      const textureFunction = TexturePresets.standardOcean();
      
      expect(mockTexture.lines).toHaveBeenCalled();
      expect(mockTextureInstance.id).toHaveBeenCalledWith('standardOcean');
      expect(mockTextureInstance.strokeWidth).toHaveBeenCalledWith(0.8);
    });

    it('heavyOceanプリセットが正しく動作する', () => {
      const textureFunction = TexturePresets.heavyOcean();
      
      expect(mockTexture.lines).toHaveBeenCalled();
      expect(mockTextureInstance.id).toHaveBeenCalledWith('heavyOcean');
      expect(mockTextureInstance.strokeWidth).toHaveBeenCalledWith(1.2);
    });

    it('sparseForestプリセットが正しく動作する', () => {
      const textureFunction = TexturePresets.sparseForest();
      
      expect(mockTexture.circles).toHaveBeenCalled();
      expect(mockTextureInstance.id).toHaveBeenCalledWith('sparseForest');
      expect(mockTextureInstance.radius).toHaveBeenCalledWith(1);
    });

    it('standardForestプリセットが正しく動作する', () => {
      const textureFunction = TexturePresets.standardForest();
      
      expect(mockTexture.circles).toHaveBeenCalled();
      expect(mockTextureInstance.id).toHaveBeenCalledWith('standardForest');
      expect(mockTextureInstance.radius).toHaveBeenCalledWith(1.5);
    });

    it('denseForestプリセットが正しく動作する', () => {
      const textureFunction = TexturePresets.denseForest();
      
      expect(mockTexture.circles).toHaveBeenCalled();
      expect(mockTextureInstance.id).toHaveBeenCalledWith('denseForest');
      expect(mockTextureInstance.radius).toHaveBeenCalledWith(2);
    });

    it('desertプリセットが正しく動作する', () => {
      const textureFunction = TexturePresets.desert();
      
      expect(mockTexture.paths).toHaveBeenCalled();
      expect(mockTextureInstance.id).toHaveBeenCalledWith('desert');
    });

    it('mountainプリセットが正しく動作する', () => {
      const textureFunction = TexturePresets.mountain();
      
      expect(mockTexture.paths).toHaveBeenCalled();
      expect(mockTextureInstance.id).toHaveBeenCalledWith('mountain');
    });

    it('simpleDotsプリセットが正しく動作する', () => {
      const textureFunction = TexturePresets.simpleDots();
      
      expect(mockTexture.circles).toHaveBeenCalled();
      expect(mockTextureInstance.id).toHaveBeenCalledWith('simpleDots');
      expect(mockTextureInstance.background).toHaveBeenCalledWith('#ffffff');
      expect(mockTextureInstance.fill).toHaveBeenCalledWith('#000000');
      expect(mockTextureInstance.size).toHaveBeenCalledWith(4);
    });

    it('simpleLinesプリセットが正しく動作する', () => {
      const textureFunction = TexturePresets.simpleLines();
      
      expect(mockTexture.lines).toHaveBeenCalled();
      expect(mockTextureInstance.id).toHaveBeenCalledWith('simpleLines');
      expect(mockTextureInstance.background).toHaveBeenCalledWith('#ffffff');
      expect(mockTextureInstance.stroke).toHaveBeenCalledWith('#000000');
      expect(mockTextureInstance.orientation).toHaveBeenCalledWith('diagonal');
    });
  });
});