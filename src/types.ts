import { GeoProjection } from 'd3-geo';
import { Selection } from 'd3-selection';

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
  /** 投影法（D3投影法オブジェクト） */
  projection: GeoProjection;
}

/**
 * レイヤーのスタイル設定
 */
export interface LayerStyle {
  /** 塗りつぶし色 */
  fill?: string | ((feature: GeoJSON.Feature) => string);
  /** 境界線の色 */
  stroke?: string | ((feature: GeoJSON.Feature) => string);
  /** 境界線の幅 */
  strokeWidth?: number | ((feature: GeoJSON.Feature) => number);
  /** 透明度（0-1） */
  opacity?: number | ((feature: GeoJSON.Feature) => number);
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
 * 基底レイヤーインターフェース
 */
export interface ILayer {
  /** レイヤーの一意識別子 */
  readonly id: string;
  /** レイヤーの表示状態 */
  visible: boolean;
  /** レイヤーの描画順序 */
  zIndex: number;
  
  /** レイヤーを描画する */
  render(container: Selection<SVGGElement, unknown, HTMLElement, any>): void;
  /** レイヤーを更新する */
  update(): void;
  /** レイヤーを削除する */
  destroy(): void;
  /** スタイルを設定する */
  setStyle(style: LayerStyle): void;
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
  /** レイヤーの表示状態 */
  visible?: boolean;
  /** レイヤーの描画順序 */
  zIndex?: number;
}


/**
 * レンダラーのオプション
 */
export interface RendererOptions {
  /** SVGコンテナ */
  svg: Selection<SVGSVGElement, unknown, HTMLElement, any>;
  /** 地図投影法 */
  projection: GeoProjection;
}