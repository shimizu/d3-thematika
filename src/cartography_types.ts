import { GeoProjection } from 'd3-geo';

/**
 * Cartographyインスタンスの初期化オプション
 */
export interface CartographyOptions {
  /** 地図を描画するDOM要素のCSSセレクタ */
  container: string;
  /** 地図の幅（ピクセル） */
  width: number;
  /** 地図の高さ（ピクセル） */
  height: number;
  /** 投影法（文字列または投影法オブジェクト） */
  projection: string | GeoProjection;
}

/**
 * レイヤーのスタイル設定
 */
export interface LayerStyle {
  /** 塗りつぶし色 */
  fill?: string;
  /** 境界線の色 */
  stroke?: string;
  /** 境界線の幅 */
  strokeWidth?: number;
  /** 透明度（0-1） */
  opacity?: number;
  /** 追加のCSSクラス名 */
  className?: string;
}

/**
 * レイヤー追加時のオプション
 */
export interface LayerOptions {
  /** 地理データ（GeoJSONフィーチャーコレクションまたはフィーチャー配列） */
  data: GeoJSON.FeatureCollection | GeoJSON.Feature[];
  /** レイヤーのスタイル設定（オプション） */
  style?: LayerStyle;
}

/**
 * 内部で管理されるレイヤーオブジェクト
 */
export interface CartographyLayer {
  /** レイヤーの一意識別子 */
  id: string;
  /** 正規化されたGeoJSONデータ */
  data: GeoJSON.FeatureCollection;
  /** レイヤーのスタイル設定 */
  style: LayerStyle;
  /** レイヤーに対応するSVGグループ要素 */
  element?: SVGGElement;
}

/**
 * サポートされている投影法の種類
 */
export type ProjectionName = 'naturalEarth1' | 'mercator' | 'orthographic' | 'equirectangular';