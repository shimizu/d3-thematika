import { Selection } from 'd3-selection';
import { GeoProjection } from 'd3-geo';
/**
 * SVGエフェクト生成ユーティリティ
 * - GaussianBlur / DropShadow / Bloom / ColorMatrix / Glow / EdgeDetect / InnerShadow / Outline / Noise
 * - GeoJSONからのclipPath生成
 * - フィルタープリセット
 *
 * NOTE:
 * - すべて <defs> 直下に <filter> / <clipPath> を追加します（不要な <defs><defs> ネストは排除）
 * - 各 createXxx(...) は D3 の <defs> セレクションを受け取る関数（コールバック）を返します
 * - 返り値の関数には .url(): string を持たせ、CSS filter: url(#id) にそのまま使えるようにします
 */
/** ガウシアンブラーフィルターのオプション */
export interface GaussianBlurOptions {
    id: string;
    stdDeviation: number | string;
    x?: string;
    y?: string;
    width?: string;
    height?: string;
}
/** ドロップシャドウフィルターのオプション */
export interface DropShadowOptions {
    id: string;
    dx: number;
    dy: number;
    stdDeviation: number;
    floodColor?: string;
    floodOpacity?: number;
    x?: string;
    y?: string;
    width?: string;
    height?: string;
}
/** ブルームエフェクトフィルターのオプション */
export interface BloomOptions {
    id: string;
    intensity: number;
    threshold?: number;
    color?: string;
    x?: string;
    y?: string;
    width?: string;
    height?: string;
}
/** 色行列（彩度/色相/モノクロ等） */
export interface ColorMatrixOptions {
    id: string;
    type: 'saturate' | 'hueRotate' | 'luminanceToAlpha' | 'matrix';
    values?: string;
    x?: string;
    y?: string;
    width?: string;
    height?: string;
}
/** 外側発光（Glow） */
export interface GlowOptions {
    id: string;
    stdDeviation: number;
    color?: string;
    opacity?: number;
    x?: string;
    y?: string;
    width?: string;
    height?: string;
}
/** 輪郭抽出（Edge Detection） */
export interface EdgeDetectOptions {
    id: string;
    x?: string;
    y?: string;
    width?: string;
    height?: string;
}
/** シャープン（Sharpen） */
export interface SharpenOptions {
    id: string;
    amount?: number;
    x?: string;
    y?: string;
    width?: string;
    height?: string;
}
/** エンボス（Emboss） */
export interface EmbossOptions {
    id: string;
    strength?: number;
    angle?: 'topLeft' | 'top' | 'topRight' | 'left' | 'right' | 'bottomLeft' | 'bottom' | 'bottomRight';
    x?: string;
    y?: string;
    width?: string;
    height?: string;
}
/** 内側シャドウ（Inner Shadow） */
export interface InnerShadowOptions {
    id: string;
    dx: number;
    dy: number;
    stdDeviation: number;
    color?: string;
    opacity?: number;
    x?: string;
    y?: string;
    width?: string;
    height?: string;
}
/** アウトライン（モルフォロジー） */
export interface OutlineOptions {
    id: string;
    radius: number;
    color?: string;
    opacity?: number;
    x?: string;
    y?: string;
    width?: string;
    height?: string;
}
/** フィルムグレイン/ノイズ */
export interface NoiseOptions {
    id: string;
    baseFrequency?: number;
    numOctaves?: number;
    opacity?: number;
    x?: string;
    y?: string;
    width?: string;
    height?: string;
}
/** GeoJSON クリップパス */
export interface ClipPolygonOptions {
    id: string;
    polygon: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> | GeoJSON.FeatureCollection;
    projection: GeoProjection;
}
/** フィルターの参照URL（CSS filter 用） */
export declare function getFilterUrl(filterId: string): string;
/** 複数フィルターの連鎖適用（filter プロパティ値を生成） */
export declare function chainFilters(filterIds: string[]): string;
/** 任意のフィルターXMLを挿入（高度なカスタム用） */
export declare function createCustomFilter(id: string, filterContent: string): (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
/** GaussianBlur */
export declare function createGaussianBlur(options: GaussianBlurOptions): (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
/** DropShadow（feDropShadow版。色/不透明を指定可） */
export declare function createDropShadow(options: DropShadowOptions): (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
/** Bloom（閾値で明部のみをぼかして合成。着色も可） */
export declare function createBloom(options: BloomOptions): (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
/** ColorMatrix（彩度/色相/モノクロ等） */
export declare function createColorMatrix(options: ColorMatrixOptions): (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
/** Glow（外側発光：アルファをぼかして着色→合成） */
export declare function createGlow(options: GlowOptions): (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
/** EdgeDetect（輪郭抽出：3x3 Laplacian） */
export declare function createEdgeDetect(options: EdgeDetectOptions): (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
/** Sharpen（シャープン：3x3アンシャープマスクカーネル） */
export declare function createSharpen(options: SharpenOptions): (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
/** Emboss（エンボス：方向付き3x3カーネル＋グレー化合成） */
export declare function createEmboss(options: EmbossOptions): (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
/** InnerShadow（内側影：アルファをオフセット＆ブラー→反転合成） */
export declare function createInnerShadow(options: InnerShadowOptions): (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
/** Outline（モルフォロジー膨張で外枠→着色合成） */
export declare function createOutline(options: OutlineOptions): (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
/** Noise / Film Grain（タービュランス＋スクリーン合成） */
export declare function createNoise(options: NoiseOptions): (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
export declare function createClipPolygon(options: ClipPolygonOptions): (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
export declare const FilterPresets: {
    lightBlur: () => (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
    strongBlur: () => (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
    standardDropShadow: () => (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
    softDropShadow: () => (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
    standardBloom: () => (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
    strongBloom: () => (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
    grayscale: () => (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
    hueRotate60: () => (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
    sepia: () => (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
    blueGlow: () => (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
    neonMagenta: () => (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
    edgeDetect: () => (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
    softInnerShadow: () => (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
    outlineThin: () => (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
    outlineThick: () => (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
    filmGrain: () => (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
    warmBloom: () => (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
    sharpen: () => (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
    strongSharpen: () => (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
    emboss: () => (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
    softEmboss: () => (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
};
