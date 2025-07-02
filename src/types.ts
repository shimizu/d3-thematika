import { GeoProjection } from 'd3-geo';
import { Selection } from 'd3-selection';

/**
 * Thematikaインスタンスの初期化オプション
 */
export interface ThematikaOptions {
  /** 主題図を描画するDOM要素のCSSセレクタ */
  container: string;
  /** 主題図の幅（ピクセル） */
  width: number;
  /** 主題図の高さ（ピクセル） */
  height: number;
  /** 投影法（D3投影法オブジェクト） */
  projection: GeoProjection;
  /** SVG定義（テクスチャやパターン、フィルターなど）- コールバック関数の配列 */
  defs?: any[];
  /** 背景色 **/
  backgroundColor?: string;

}


/**
 * レイヤーのSVG属性設定
 */
export interface LayerAttributes {
  /** 塗りつぶし色 */
  fill?: string | ((feature: GeoJSON.Feature, index?: number) => string);
  /** 塗りつぶしの透明度（0-1） */
  fillOpacity?: number | ((feature: GeoJSON.Feature, index?: number) => number);
  /** 境界線の色 */
  stroke?: string | ((feature: GeoJSON.Feature, index?: number) => string);
  /** 境界線の幅 */
  strokeWidth?: number | ((feature: GeoJSON.Feature, index?: number) => number);
  /** 境界線の破線パターン */
  strokeDasharray?: string | ((feature: GeoJSON.Feature, index?: number) => string);
  /** 透明度（0-1） */
  opacity?: number | ((feature: GeoJSON.Feature, index?: number) => number);
  /** SVGフィルター */
  filter?: string | ((feature: GeoJSON.Feature, index?: number) => string);
  /** クリップパス */
  clipPath?: string | ((feature: GeoJSON.Feature, index?: number) => string);
  /** 追加のCSSクラス名 */
  className?: string;
}

/**
 * レイヤーのCSS style属性設定（将来的な拡張用）
 */
export interface LayerCssStyles {
  [property: string]: string | number | ((feature: GeoJSON.Feature, index?: number) => string | number);
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
  /** レイヤーを削除する */
  destroy(): void;
  /** 表示状態を設定する */
  setVisible(visible: boolean): void;
  /** 描画順序を設定する */
  setZIndex(zIndex: number): void;
  /** レイヤーが描画されているかを確認する */
  isRendered(): boolean;
  /** レイヤーのD3セレクションを取得する */
  getLayerGroup(): Selection<SVGGElement, unknown, HTMLElement, any> | null;
}

/**
 * GeoJSONレイヤーインターフェース
 */
export interface IGeojsonLayer extends ILayer {
  /** 投影法を設定する */
  setProjection(projection: GeoProjection): void;
}


/**
 * アーク制御点の位置タイプ
 */
export type ArcControlPointType = 'center' | 'weighted' | [number, number];

/**
 * アークオフセットの方向タイプ
 */
export type ArcOffsetType = 'perpendicular' | 'north' | 'south' | 'east' | 'west' | [number, number];

/**
 * LineConnectionLayerのインターフェース
 */
export interface ILineConnectionLayer extends ILayer {
  /** 投影法を設定する */
  setProjection(projection: GeoProjection): void;
}


