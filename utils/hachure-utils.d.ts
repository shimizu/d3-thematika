/**
 * ハッチング＆等高線生成ユーティリティ
 *
 * 地形表現のための等高線とハッチング線を生成する機能を提供
 */
import { Selection } from 'd3-selection';
/**
 * 等高線生成オプション
 */
export interface ContourOptions {
    /** 等高線の間隔（データ単位） */
    interval: number;
    /** データの境界 [[xmin, ymin], [xmax, ymax]] */
    bounds: [[number, number], [number, number]];
    /** スムージングを適用するか */
    smooth?: boolean;
    /** 最小値（指定しない場合は自動計算） */
    minValue?: number;
    /** 最大値（指定しない場合は自動計算） */
    maxValue?: number;
}
/**
 * ハッチング生成オプション
 */
export interface HachureOptions {
    /** ハッチング線の間隔（ピクセル単位） */
    spacing: number;
    /** ハッチング線の長さ（ピクセル単位） */
    length: number;
    /** ハッチング線の角度（度、デフォルト: 垂直） */
    angle?: number;
    /** 密度（0-1、デフォルト: 1） */
    density?: number;
    /** ランダム性（0-1、デフォルト: 0） */
    randomness?: number;
}
/**
 * SVGハッチングパターンオプション
 */
export interface HatchPatternOptions {
    /** 線の間隔 */
    spacing?: number;
    /** 線の太さ */
    strokeWidth?: number;
    /** 線の色 */
    stroke?: string;
    /** 角度（度） */
    angle?: number;
    /** 背景色 */
    background?: string;
}
/**
 * 2次元配列データから等高線を生成
 *
 * @param data - 2次元配列の数値データ（標高値など）
 * @param options - 等高線生成オプション
 * @returns GeoJSON FeatureCollection (MultiLineString)
 */
export declare function generateContours(data: number[][], options: ContourOptions): GeoJSON.FeatureCollection<GeoJSON.MultiLineString>;
/**
 * 等高線からハッチング線を生成
 *
 * @param contours - 等高線のGeoJSON
 * @param options - ハッチング生成オプション
 * @returns ハッチング線のGeoJSON FeatureCollection
 */
export declare function generateHachures(contours: GeoJSON.FeatureCollection<GeoJSON.MultiLineString | GeoJSON.LineString>, options: HachureOptions): Promise<GeoJSON.FeatureCollection<GeoJSON.LineString>>;
/**
 * SVGパターンとしてハッチングを作成
 *
 * @param svg - D3のSVG Selection
 * @param id - パターンのID
 * @param options - ハッチングパターンオプション
 * @returns パターンのURL参照文字列
 */
export declare function createHatchPattern(svg: Selection<SVGSVGElement, unknown, HTMLElement, any>, id: string, options?: HatchPatternOptions): string;
/**
 * 複数の角度でクロスハッチングパターンを作成
 *
 * @param svg - D3のSVG Selection
 * @param id - パターンのID
 * @param angles - 角度の配列
 * @param options - ハッチングパターンオプション
 * @returns パターンのURL参照文字列
 */
export declare function createCrossHatchPattern(svg: Selection<SVGSVGElement, unknown, HTMLElement, any>, id: string, angles: number[], options?: Omit<HatchPatternOptions, 'angle'>): string;
/**
 * 密度ベースのハッチングパターンを作成
 * 値に応じてハッチングの密度を変える
 *
 * @param svg - D3のSVG Selection
 * @param id - パターンのID
 * @param density - 密度（0-1）
 * @param options - ハッチングパターンオプション
 * @returns パターンのURL参照文字列
 */
export declare function createDensityHatchPattern(svg: Selection<SVGSVGElement, unknown, HTMLElement, any>, id: string, density: number, options?: HatchPatternOptions): string;
