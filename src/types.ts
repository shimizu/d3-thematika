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
 * レイヤーのSVG属性設定（d3命名規則に合わせてattrを使用）
 */
export interface LayerAttr {
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
 * レイヤーのCSS style属性設定（d3命名規則に合わせてstyleを使用）
 */
export interface LayerStyle {
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

/**
 * PointSpikeLayerの初期化オプション
 */
export interface PointSpikeLayerOptions {
  /** GeoJSONデータ */
  data: GeoJSON.FeatureCollection | GeoJSON.Feature[];
  /** レイヤーの属性設定 */
  attr?: LayerAttr;
  /** レイヤーのCSS style属性設定 */
  style?: LayerStyle;
  /** スパイクの長さ（固定値または関数） */
  length?: number | ((feature: GeoJSON.Feature, index: number) => number);
  /** スパイクの方向 */
  direction?: 'up' | 'down' | 'left' | 'right';
}

/**
 * タイル座標の型定義
 */
export interface TileCoordinate {
  /** タイルのX座標 */
  x: number;
  /** タイルのY座標 */
  y: number;
  /** ズームレベル */
  z: number;
}

/**
 * タイルの地理的境界の型定義
 */
export interface TileBounds {
  /** 西端の経度 */
  west: number;
  /** 南端の緯度 */
  south: number;
  /** 東端の経度 */
  east: number;
  /** 北端の緯度 */
  north: number;
  /** bounds配列形式 [west, south, east, north] */
  bounds: [number, number, number, number];
}

/**
 * タイルURL情報の型定義
 */
export interface TileUrlInfo {
  /** タイル座標 */
  coordinate: TileCoordinate;
  /** タイルのURL */
  url: string;
  /** タイルの地理的境界 */
  bounds: TileBounds;
}

/**
 * タイル生成オプションの型定義
 */
export interface TileGenerationOptions {
  /** URLテンプレート（例: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'） */
  urlTemplate: string;
  /** 最小ズームレベル（デフォルト: 0） */
  minZoom?: number;
  /** 最大ズームレベル（デフォルト: 18） */
  maxZoom?: number;
  /** タイルサイズ（ピクセル、デフォルト: 256） */
  tileSize?: number;
  /** 境界をタイル境界にクランプするかどうか（デフォルト: true） */
  clampToBounds?: boolean;
}


