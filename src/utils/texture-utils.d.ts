import { Selection } from 'd3-selection';
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
export declare function createDotsTexture(options: DotsTextureOptions): (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
/**
 * 線テクスチャを生成します
 * @param options - 線テクスチャのオプション
 * @returns D3セレクションで使用可能なコールバック関数
 */
export declare function createLinesTexture(options: LinesTextureOptions): (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
/**
 * パステクスチャを生成します
 * @param options - パステクスチャのオプション
 * @returns D3セレクションで使用可能なコールバック関数
 */
export declare function createPathsTexture(options: PathsTextureOptions): (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
/**
 * 海の表現用テクスチャを生成します
 * @param options - 海テクスチャのオプション
 * @returns D3セレクションで使用可能なコールバック関数
 */
export declare function createOceanTexture(options?: {
    id: string;
    intensity?: 'light' | 'medium' | 'heavy';
}): (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
/**
 * 森林表現用テクスチャを生成します
 * @param options - 森林テクスチャのオプション
 * @returns D3セレクションで使用可能なコールバック関数
 */
export declare function createForestTexture(options?: {
    id: string;
    density?: 'sparse' | 'medium' | 'dense';
}): (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
/**
 * 砂漠表現用テクスチャを生成します
 * @param options - 砂漠テクスチャのオプション
 * @returns D3セレクションで使用可能なコールバック関数
 */
export declare function createDesertTexture(options?: {
    id: string;
}): (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
/**
 * 山岳表現用テクスチャを生成します
 * @param options - 山岳テクスチャのオプション
 * @returns D3セレクションで使用可能なコールバック関数
 */
export declare function createMountainTexture(options?: {
    id: string;
}): (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
/**
 * よく使用されるテクスチャのプリセット
 */
export declare const TexturePresets: {
    /**
     * 軽い海テクスチャ
     */
    lightOcean: () => (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
    /**
     * 標準的な海テクスチャ
     */
    standardOcean: () => (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
    /**
     * 濃い海テクスチャ
     */
    heavyOcean: () => (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
    /**
     * 疎らな森テクスチャ
     */
    sparseForest: () => (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
    /**
     * 標準的な森テクスチャ
     */
    standardForest: () => (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
    /**
     * 密な森テクスチャ
     */
    denseForest: () => (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
    /**
     * 砂漠テクスチャ
     */
    desert: () => (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
    /**
     * 山岳テクスチャ
     */
    mountain: () => (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
    /**
     * シンプルなドットテクスチャ
     */
    simpleDots: () => (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
    /**
     * シンプルな線テクスチャ
     */
    simpleLines: () => (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
};
/**
 * texture.jsの全機能を再エクスポート
 */
export { textures };
