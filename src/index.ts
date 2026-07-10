/**
 * D3 Thematika ライブラリ
 * 
 * このライブラリはD3.jsを使用してSVGベースの主題図を作成するためのツールを提供します。
 * 複数のレイヤーを管理し、様々な投影法をサポートしています。
 * リファクタリングによりモジュール化され、拡張性と保守性が向上しました。
 * 
 * @example
 * ```typescript
 * import { Map, GeojsonLayer } from 'd3-thematika';
 * import * as d3 from 'd3';
 * 
 * const map = new Map({
 *   container: '#map',
 *   width: 800,
 *   height: 600,
 *   projection: d3.geoMercator()
 * });
 * 
 * const layer = new GeojsonLayer({
 *   data: geoJsonData,
 *   attr: { fill: '#f0f0f0', stroke: '#333' }
 * });
 * map.addLayer('countries', layer);
 * ```
 */



// メインクラス
export { Map } from './thematika';

// 型定義
export type { 
  ThematikaOptions, 
  LayerAttr, 
  LayerStyle,
  ILayer,
  ILineConnectionLayer,
  ILineTaperedLayer,
  ArcControlPointType,
  ArcOffsetType,
  TileCoordinate,
  TileBounds,
  TileUrlInfo,
  TileGenerationOptions
} from './types';
export type { ImageLayerOptions } from './layers/raster/image-layer';
export type { LegendLayerOptions, LegendPosition, LegendData, SupportedScale, LegendSymbolType, SymbolSize, LegendBackgroundStyle } from './layers/utils/legend-layer';
export type { PointCircleLayerOptions } from './layers/point/point-circle-layer';
export type { PointSymbolLayerOptions } from './layers/point/point-symbol-layer';
export type { PointSpikeLayerOptions } from './types';
export type { LineConnectionLayerOptions } from './layers/line/line-connection-layer';
export type { LineEdgeBundlingLayerOptions } from './layers/line/line-edgebundling-layer';
export type { LineTaperedLayerOptions } from './layers/line/line-tapered-layer';
export type { TextLayerOptions } from './layers/text/text-layer';

// コア機能
export { LayerManager } from './core/layer-manager';

// レイヤークラス
export { BaseLayer } from './layers/core/base-layer';
export { GeojsonLayer } from './layers/geo/geojson-layer';
export { OutlineLayer } from './layers/geo/outline-layer';
export { GraticuleLayer } from './layers/geo/graticule-layer';
export { ImageLayer } from './layers/raster/image-layer';
export { LegendLayer } from './layers/utils/legend-layer';
export { PointCircleLayer } from './layers/point/point-circle-layer';
export { PointSymbolLayer } from './layers/point/point-symbol-layer';
export { PointSpikeLayer } from './layers/point/point-spike-layer';
export { LineConnectionLayer } from './layers/line/line-connection-layer';
export { LineTaperedLayer } from './layers/line/line-tapered-layer';
export { LineEdgeBundlingLayer } from './layers/line/line-edgebundling-layer';
export { TextLayer } from './layers/text/text-layer';

// ユーティリティ
export * from './utils/classification';
export * from './utils/effect-utils';
export * from './utils/texture-utils';
export * from './utils/test-utils';
export * from './utils/gis-utils';
export * from './utils/tile-utils';
export * from './utils/color-palette';