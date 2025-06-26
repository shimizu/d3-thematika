/**
 * D3 Thematika ライブラリ
 * 
 * このライブラリはD3.jsを使用してSVGベースの主題図を作成するためのツールを提供します。
 * 複数のレイヤーを管理し、様々な投影法をサポートしています。
 * リファクタリングによりモジュール化され、拡張性と保守性が向上しました。
 * 
 * @example
 * ```typescript
 * import { Thematika } from 'd3-thematika';
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
 *   style: { fill: '#f0f0f0', stroke: '#333' }
 * });
 * map.addLayer('countries', layer);
 * ```
 */



// メインクラス
export { Map } from './thematika';

// 型定義
export type { 
  ThematikaOptions, 
  LayerStyle, 
  ILayer,
  LineConnectionData,
  ILineConnectionLayer,
  ArcControlPointType,
  ArcOffsetType
} from './types';
export type { ImageLayerOptions } from './layers/image-layer';
export type { LegendLayerOptions, LegendPosition, LegendData, SupportedScale, LegendSymbolType, SymbolSize, LegendBackgroundStyle } from './layers/legend-layer';
export type { PointCircleLayerOptions } from './layers/point-circle-layer';
export type { LineConnectionLayerOptions } from './layers/line-connection-layer';

// コア機能
export { LayerManager } from './core/layer-manager';

// レイヤークラス
export { BaseLayer } from './layers/base-layer';
export { GeojsonLayer } from './layers/geojson-layer';
export { OutlineLayer } from './layers/outline-layer';
export { GraticuleLayer } from './layers/graticule-layer';
export { ImageLayer } from './layers/image-layer';
export { LegendLayer } from './layers/legend-layer';
export { PointCircleLayer } from './layers/point-circle-layer';
export { LineConnectionLayer } from './layers/line-connection-layer';

// ユーティリティ
export * from './utils/effect-utils';
export * from './utils/texture-utils';
export * from './utils/test-utils';
export * from './utils/gis-utils';