import { Selection } from 'd3-selection';
import { GeoProjection } from 'd3-geo';
/**
 * SVGエフェクト生成に関するユーティリティ関数
 * ガウシアンブラー、ドロップシャドウ、ブルームなどのSVGフィルターを生成します
 */
/**
 * ガウシアンブラーフィルターのオプション
 */
export interface GaussianBlurOptions {
    /** フィルターID */
    id: string;
    /** ブラーの標準偏差（数値または 'x y' 形式） */
    stdDeviation: number | string;
    /** フィルター適用範囲のX座標オフセット（パーセント） */
    x?: string;
    /** フィルター適用範囲のY座標オフセット（パーセント） */
    y?: string;
    /** フィルター適用範囲の幅（パーセント） */
    width?: string;
    /** フィルター適用範囲の高さ（パーセント） */
    height?: string;
}
/**
 * ドロップシャドウフィルターのオプション
 */
export interface DropShadowOptions {
    /** フィルターID */
    id: string;
    /** X方向のオフセット */
    dx: number;
    /** Y方向のオフセット */
    dy: number;
    /** ブラーの標準偏差 */
    stdDeviation: number;
    /** 影の色 */
    floodColor?: string;
    /** 影の透明度 */
    floodOpacity?: number;
}
/**
 * ブルームエフェクトフィルターのオプション
 */
export interface BloomOptions {
    /** フィルターID */
    id: string;
    /** ブラーの強度 */
    intensity: number;
    /** ブルーム効果の明度閾値 */
    threshold?: number;
    /** ブルーム効果の色 */
    color?: string;
}
/**
 * クリップポリゴンのオプション
 */
export interface ClipPolygonOptions {
    /** クリップパスID */
    id: string;
    /** クリップに使用するGeoJSONポリゴン */
    polygon: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> | GeoJSON.FeatureCollection;
    /** 投影法 */
    projection: GeoProjection;
}
/**
 * ガウシアンブラーフィルターを生成します
 * @param options - ガウシアンブラーのオプション
 * @returns D3セレクションで使用可能なコールバック関数
 */
export declare function createGaussianBlur(options: GaussianBlurOptions): (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
/**
 * ドロップシャドウフィルターを生成します
 * @param options - ドロップシャドウのオプション
 * @returns D3セレクションで使用可能なコールバック関数
 */
export declare function createDropShadow(options: DropShadowOptions): (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
/**
 * ブルームエフェクトフィルターを生成します
 * @param options - ブルームエフェクトのオプション
 * @returns D3セレクションで使用可能なコールバック関数
 */
export declare function createBloom(options: BloomOptions): (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
/**
 * GeoJSONポリゴンからクリップパスを生成します
 * @param options - クリップポリゴンのオプション
 * @returns D3セレクションで使用可能なコールバック関数
 */
export declare function createClipPolygon(options: ClipPolygonOptions): (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
/**
 * よく使用されるフィルターのプリセット
 */
export declare const FilterPresets: {
    /**
     * 軽いブラー効果
     */
    lightBlur: () => (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
    /**
     * 強いブラー効果
     */
    strongBlur: () => (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
    /**
     * 標準的なドロップシャドウ
     */
    standardDropShadow: () => (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
    /**
     * ソフトなドロップシャドウ
     */
    softDropShadow: () => (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
    /**
     * 標準的なブルーム効果
     */
    standardBloom: () => (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
    /**
     * 強いブルーム効果
     */
    strongBloom: () => (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
};
/**
 * カスタムSVGフィルターを文字列から生成します
 * @param id - フィルターID
 * @param filterContent - SVGフィルターの内容（XML文字列）
 * @returns D3セレクションで使用可能なコールバック関数
 */
export declare function createCustomFilter(id: string, filterContent: string): (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
/**
 * フィルターの参照URLを生成します
 * @param filterId - フィルターID
 * @returns CSS filter プロパティで使用可能なURL文字列
 */
export declare function getFilterUrl(filterId: string): string;
/**
 * 複数のフィルターを連鎖適用するためのヘルパー関数
 * @param filterIds - 適用するフィルターIDの配列
 * @returns CSS filter プロパティで使用可能な文字列
 */
export declare function chainFilters(filterIds: string[]): string;
