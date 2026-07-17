/**
 * カラーパレットユーティリティ
 * 科学的に検証済みのカラーパレットと色覚アクセシビリティ機能を提供
 */
import { PaletteType, ColorBlindnessType, ColorPalette, PaletteRecommendation } from '../types';
/**
 * ColorBrewer パレット
 * Cynthia A. Brewerによる科学的に検証されたカラーパレット
 */
export declare const ColorBrewerPalettes: Record<string, ColorPalette>;
/**
 * Viridis パレット
 * 知覚的に均一で色覚障害に配慮したパレット
 */
export declare const ViridisPalettes: Record<string, ColorPalette>;
/**
 * CARTO パレット
 * カルトグラフィーに特化したパレット
 */
export declare const CARTOPalettes: Record<string, ColorPalette>;
/**
 * Tailwind CSS パレット
 * モダンで洗練されたWebデザイン用カラーパレット
 */
export declare const TailwindPalettes: Record<string, ColorPalette>;
/**
 * 全パレットを統合
 */
export declare const AllPalettes: Record<string, ColorPalette>;
/**
 * 色覚障害シミュレーション
 */
export declare function simulateColorBlindness(color: string, type: ColorBlindnessType): string;
/**
 * アクセシビリティチェック
 */
export declare function checkColorBlindnessSafety(palette: string[]): boolean;
/**
 * パレット推奨システム
 */
export declare function recommendPalette(type: PaletteType, numClasses: number, requireColorBlindSafe?: boolean): PaletteRecommendation[];
/**
 * 指定した数のクラスに最適化されたパレットを生成
 */
export declare function generateOptimizedPalette(basePalette: ColorPalette, numClasses: number): string[];
