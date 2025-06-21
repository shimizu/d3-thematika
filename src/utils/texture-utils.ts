import { Selection } from 'd3-selection';
// @ts-ignore
import textures from '../vendor/textures.esm.js';

/**
 * テクスチャ生成に関するユーティリティ関数
 * texture.jsの機能をラップして、effect-utils.tsと統一されたインターフェイスを提供
 */

/**
 * ドットテクスチャのオプション
 */
export interface DotsTextureOptions {
  /** テクスチャID */
  id: string;
  /** ドットのサイズ */
  size?: number;
  /** 背景色 */
  background?: string;
  /** ドットの色 */
  fill?: string;
  /** ドットの半径 */
  radius?: number;
}

/**
 * 線テクスチャのオプション
 */
export interface LinesTextureOptions {
  /** テクスチャID */
  id: string;
  /** テクスチャのサイズ */
  size?: number;
  /** 背景色 */
  background?: string;
  /** 線の色 */
  stroke?: string;
  /** 線の太さ */
  strokeWidth?: number;
  /** 線の方向 */
  orientation?: string[];
}

/**
 * パステクスチャのオプション
 */
export interface PathsTextureOptions {
  /** テクスチャID */
  id: string;
  /** パスのd属性 */
  d?: string;
  /** テクスチャのサイズ */
  size?: number;
  /** 背景色 */
  background?: string;
  /** パスの塗り色 */
  fill?: string;
  /** パスの線の色 */
  stroke?: string;
  /** パスの線の太さ */
  strokeWidth?: number;
}

/**
 * ドットテクスチャを生成します
 * @param options - ドットテクスチャのオプション
 * @returns D3セレクションで使用可能なコールバック関数
 */
export function createDotsTexture(options: DotsTextureOptions) {
  const texture = textures.circles()
    .radius(options.radius || 1)
    .fill(options.fill || '#000')
    .background(options.background || '#ffffff')
    .size(options.size || 4)
    .id(options.id);

  const textureFunction = (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => {
    defs.call(texture);
  };
  
  // texture.jsの.url()メソッドを委譲
  (textureFunction as any).url = () => texture.url();
  
  return textureFunction;
}

/**
 * 線テクスチャを生成します
 * @param options - 線テクスチャのオプション
 * @returns D3セレクションで使用可能なコールバック関数
 */
export function createLinesTexture(options: LinesTextureOptions) {
  const texture = textures.lines()
    .orientation(...(options.orientation || ['diagonal']))
    .stroke(options.stroke || '#000')
    .strokeWidth(options.strokeWidth || 1)
    .background(options.background || '#ffffff')
    .size(options.size || 4)
    .id(options.id);

  const textureFunction = (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => {
    defs.call(texture);
  };
  
  // texture.jsの.url()メソッドを委譲
  (textureFunction as any).url = () => texture.url();
  
  return textureFunction;
}

/**
 * パステクスチャを生成します
 * @param options - パステクスチャのオプション
 * @returns D3セレクションで使用可能なコールバック関数
 */
export function createPathsTexture(options: PathsTextureOptions) {
  const texture = textures.paths()
    .d(options.d || 'M 0,0 l 10,10 M 10,0 l -10,10')
    .size(options.size || 10)
    .background(options.background || '#ffffff')
    .fill(options.fill || 'none')
    .stroke(options.stroke || '#000')
    .strokeWidth(options.strokeWidth || 1)
    .id(options.id);

  const textureFunction = (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => {
    defs.call(texture);
  };
  
  // texture.jsの.url()メソッドを委譲
  (textureFunction as any).url = () => texture.url();
  
  return textureFunction;
}

/**
 * 海の表現用テクスチャを生成します
 * @param options - 海テクスチャのオプション
 * @returns D3セレクションで使用可能なコールバック関数
 */
export function createOceanTexture(options: {
  id: string;
  intensity?: 'light' | 'medium' | 'heavy';
} = { id: 'ocean' }) {
  const { intensity = 'medium' } = options;
  
  const settings = {
    light: { size: 6, strokeWidth: 0.5, background: '#e3f2fd' },
    medium: { size: 4, strokeWidth: 0.8, background: '#bbdefb' },
    heavy: { size: 3, strokeWidth: 1.2, background: '#90caf9' }
  };

  const config = settings[intensity];
  
  return createLinesTexture({
    id: options.id,
    orientation: ['horizontal'],
    stroke: '#1976d2',
    strokeWidth: config.strokeWidth,
    background: config.background,
    size: config.size
  });
}

/**
 * 森林表現用テクスチャを生成します
 * @param options - 森林テクスチャのオプション
 * @returns D3セレクションで使用可能なコールバック関数
 */
export function createForestTexture(options: {
  id: string;
  density?: 'sparse' | 'medium' | 'dense';
} = { id: 'forest' }) {
  const { density = 'medium' } = options;
  
  const settings = {
    sparse: { size: 8, radius: 1, background: '#e8f5e8' },
    medium: { size: 6, radius: 1.5, background: '#c8e6c9' },
    dense: { size: 4, radius: 2, background: '#a5d6a7' }
  };

  const config = settings[density];
  
  return createDotsTexture({
    id: options.id,
    radius: config.radius,
    fill: '#2e7d32',
    background: config.background,
    size: config.size
  });
}

/**
 * 砂漠表現用テクスチャを生成します
 * @param options - 砂漠テクスチャのオプション
 * @returns D3セレクションで使用可能なコールバック関数
 */
export function createDesertTexture(options: {
  id: string;
} = { id: 'desert' }) {
  return createPathsTexture({
    id: options.id,
    d: 'M 0,5 Q 5,0 10,5 Q 15,10 20,5',
    size: 20,
    background: '#fff8e1',
    fill: 'none',
    stroke: '#ff8f00',
    strokeWidth: 0.8
  });
}

/**
 * 山岳表現用テクスチャを生成します
 * @param options - 山岳テクスチャのオプション
 * @returns D3セレクションで使用可能なコールバック関数
 */
export function createMountainTexture(options: {
  id: string;
} = { id: 'mountain' }) {
  return createPathsTexture({
    id: options.id,
    d: 'M 0,10 L 5,0 L 10,10 Z',
    size: 10,
    background: '#efebe9',
    fill: '#5d4037',
    stroke: '#3e2723',
    strokeWidth: 0.5
  });
}

/**
 * よく使用されるテクスチャのプリセット
 */
export const TexturePresets = {
  /**
   * 軽い海テクスチャ
   */
  lightOcean: () => createOceanTexture({
    id: 'lightOcean',
    intensity: 'light'
  }),
  
  /**
   * 標準的な海テクスチャ
   */
  standardOcean: () => createOceanTexture({
    id: 'standardOcean',
    intensity: 'medium'
  }),
  
  /**
   * 濃い海テクスチャ
   */
  heavyOcean: () => createOceanTexture({
    id: 'heavyOcean',
    intensity: 'heavy'
  }),
  
  /**
   * 疎らな森テクスチャ
   */
  sparseForest: () => createForestTexture({
    id: 'sparseForest',
    density: 'sparse'
  }),
  
  /**
   * 標準的な森テクスチャ
   */
  standardForest: () => createForestTexture({
    id: 'standardForest',
    density: 'medium'
  }),
  
  /**
   * 密な森テクスチャ
   */
  denseForest: () => createForestTexture({
    id: 'denseForest',
    density: 'dense'
  }),
  
  /**
   * 砂漠テクスチャ
   */
  desert: () => createDesertTexture({
    id: 'desert'
  }),
  
  /**
   * 山岳テクスチャ
   */
  mountain: () => createMountainTexture({
    id: 'mountain'
  }),
  
  /**
   * シンプルなドットテクスチャ
   */
  simpleDots: () => createDotsTexture({
    id: 'simpleDots',
    background: '#ffffff',
    fill: '#000000',
    size: 4
  }),
  
  /**
   * シンプルな線テクスチャ
   */
  simpleLines: () => createLinesTexture({
    id: 'simpleLines',
    background: '#ffffff',
    stroke: '#000000',
    orientation: ['diagonal']
  })
};

/**
 * texture.jsの全機能を再エクスポート
 */
export { textures };