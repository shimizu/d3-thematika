import { LayerStyle } from '../types';

/**
 * スタイル処理に関するユーティリティ関数
 */

/**
 * デフォルトのレイヤースタイル
 */
export const DEFAULT_LAYER_STYLE: Required<LayerStyle> = {
  fill: '#cccccc',
  stroke: '#333333',
  strokeWidth: 0.5,
  opacity: 1,
  className: ''
};

/**
 * 2つのスタイルオブジェクトをマージします
 * @param baseStyle - ベーススタイル
 * @param overrideStyle - 上書きスタイル
 * @returns マージされたスタイル
 */
export function mergeStyles(baseStyle: LayerStyle, overrideStyle: LayerStyle = {}): LayerStyle {
  return { ...baseStyle, ...overrideStyle };
}

/**
 * スタイルに完全なデフォルト値を適用します
 * @param style - 元のスタイル
 * @returns 完全なスタイル
 */
export function normalizeStyle(style: LayerStyle = {}): Required<LayerStyle> {
  return mergeStyles(DEFAULT_LAYER_STYLE, style) as Required<LayerStyle>;
}

/**
 * 色の有効性を検証します
 * @param color - 検証する色
 * @returns 有効かどうか
 */
export function isValidColor(color: string): boolean {
  const style = new Option().style;
  style.color = color;
  return style.color !== '';
}

/**
 * HEX色をRGBAに変換します
 * @param hex - HEX色文字列
 * @param alpha - 透明度（0-1）
 * @returns RGBA色文字列
 */
export function hexToRgba(hex: string, alpha: number = 1): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * RGB色をHEXに変換します
 * @param r - 赤成分（0-255）
 * @param g - 緑成分（0-255）
 * @param b - 青成分（0-255）
 * @returns HEX色文字列
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.round(Math.max(0, Math.min(255, n))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * 色を明るくします
 * @param color - 元の色（HEX形式）
 * @param amount - 明るくする量（0-1）
 * @returns 明るくされた色
 */
export function lightenColor(color: string, amount: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
  if (!result) {
    return color;
  }
  
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  
  const newR = Math.round(r + (255 - r) * amount);
  const newG = Math.round(g + (255 - g) * amount);
  const newB = Math.round(b + (255 - b) * amount);
  
  return rgbToHex(newR, newG, newB);
}

/**
 * 色を暗くします
 * @param color - 元の色（HEX形式）
 * @param amount - 暗くする量（0-1）
 * @returns 暗くされた色
 */
export function darkenColor(color: string, amount: number): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
  if (!result) {
    return color;
  }
  
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  
  const newR = Math.round(r * (1 - amount));
  const newG = Math.round(g * (1 - amount));
  const newB = Math.round(b * (1 - amount));
  
  return rgbToHex(newR, newG, newB);
}

/**
 * 値に基づいてカラーマップから色を取得します
 * @param value - 値（0-1の範囲に正規化）
 * @param colorStops - カラーストップの配列
 * @returns 補間された色
 */
export function getColorFromValue(
  value: number, 
  colorStops: Array<{ stop: number; color: string }>
): string {
  value = Math.max(0, Math.min(1, value));
  
  // ソート済みでない場合はソート
  const sortedStops = [...colorStops].sort((a, b) => a.stop - b.stop);
  
  // 範囲外の場合
  if (value <= sortedStops[0].stop) return sortedStops[0].color;
  if (value >= sortedStops[sortedStops.length - 1].stop) {
    return sortedStops[sortedStops.length - 1].color;
  }
  
  // 補間する2つのストップを見つける
  for (let i = 0; i < sortedStops.length - 1; i++) {
    const currentStop = sortedStops[i];
    const nextStop = sortedStops[i + 1];
    
    if (value >= currentStop.stop && value <= nextStop.stop) {
      const ratio = (value - currentStop.stop) / (nextStop.stop - currentStop.stop);
      return interpolateColors(currentStop.color, nextStop.color, ratio);
    }
  }
  
  return sortedStops[0].color;
}

/**
 * 2つの色の間を補間します
 * @param color1 - 開始色（HEX形式）
 * @param color2 - 終了色（HEX形式）
 * @param ratio - 補間比率（0-1）
 * @returns 補間された色
 */
export function interpolateColors(color1: string, color2: string, ratio: number): string {
  const result1 = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color1);
  const result2 = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color2);
  
  if (!result1 || !result2) {
    return color1;
  }
  
  const r1 = parseInt(result1[1], 16);
  const g1 = parseInt(result1[2], 16);
  const b1 = parseInt(result1[3], 16);
  
  const r2 = parseInt(result2[1], 16);
  const g2 = parseInt(result2[2], 16);
  const b2 = parseInt(result2[3], 16);
  
  const r = Math.round(r1 + (r2 - r1) * ratio);
  const g = Math.round(g1 + (g2 - g1) * ratio);
  const b = Math.round(b1 + (b2 - b1) * ratio);
  
  return rgbToHex(r, g, b);
}