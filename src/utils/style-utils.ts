import { LayerStyle } from '../types';

/**
 * スタイル処理に関するユーティリティ関数
 */

/**
 * デフォルトのレイヤースタイル
 */
export const DEFAULT_LAYER_STYLE: LayerStyle = {
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
export function normalizeStyle(style: LayerStyle = {}): LayerStyle {
  return mergeStyles(DEFAULT_LAYER_STYLE, style);
}

/**
 * 色の有効性を検証します
 * @param color - 検証する色
 * @returns 有効かどうか
 */
export function isValidColor(color: string): boolean {
  if (!color || typeof color !== 'string') {
    return false;
  }
  
  // 基本的な色名の検証
  const namedColors = [
    'red', 'green', 'blue', 'yellow', 'orange', 'purple', 'pink', 'brown',
    'black', 'white', 'gray', 'grey', 'cyan', 'magenta', 'lime', 'maroon',
    'navy', 'olive', 'silver', 'teal', 'aqua', 'fuchsia'
  ];
  
  if (namedColors.includes(color.toLowerCase())) {
    return true;
  }
  
  // HEX色の検証
  if (/^#?([a-f\d]{3}|[a-f\d]{6})$/i.test(color)) {
    return true;
  }
  
  // RGB/RGBA色の検証
  const rgbMatch = color.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(,\s*([\d.]+)\s*)?\)$/i);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]);
    const g = parseInt(rgbMatch[2]);
    const b = parseInt(rgbMatch[3]);
    const a = rgbMatch[5] ? parseFloat(rgbMatch[5]) : 1;
    
    // RGB値は0-255、透明度は0-1の範囲内であることを確認
    if (r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255 && a >= 0 && a <= 1) {
      return true;
    }
  }
  
  // HSL/HSLA色の検証
  if (/^hsla?\(\s*\d+\s*,\s*\d+%\s*,\s*\d+%\s*(,\s*[\d.]+\s*)?\)$/i.test(color)) {
    return true;
  }
  
  return false;
}

/**
 * HEX色をRGBAに変換します
 * @param hex - HEX色文字列
 * @param alpha - 透明度（0-1）
 * @returns RGBA色文字列
 */
export function hexToRgba(hex: string, alpha: number = 1): string {
  // #を除去
  const cleanHex = hex.replace('#', '');
  
  let r: number, g: number, b: number;
  
  if (cleanHex.length === 3) {
    // 3桁HEX (#fff -> #ffffff)
    r = parseInt(cleanHex[0] + cleanHex[0], 16);
    g = parseInt(cleanHex[1] + cleanHex[1], 16);
    b = parseInt(cleanHex[2] + cleanHex[2], 16);
  } else if (cleanHex.length === 6) {
    // 6桁HEX
    r = parseInt(cleanHex.substr(0, 2), 16);
    g = parseInt(cleanHex.substr(2, 2), 16);
    b = parseInt(cleanHex.substr(4, 2), 16);
  } else {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  
  // NaNチェック
  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  
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