/**
 * D3 Cartography ライブラリ
 * 
 * このライブラリはD3.jsを使用してSVGベースの地図を作成するためのツールを提供します。
 * 複数のレイヤーを管理し、様々な投影法をサポートしています。
 * リファクタリングによりモジュール化され、拡張性と保守性が向上しました。
 * 
 * @example
 * ```typescript
 * import { Cartography } from 'd3-cartography';
 * 
 * const map = new Cartography({
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
export { Cartography } from './cartography';

// 型定義
export type { 
  CartographyOptions, 
  LayerStyle, 
  ILayer
} from './types';

// コア機能
export { LayerManager } from './core/layer-manager';

// レイヤークラス
export { BaseLayer } from './layers/base-layer';
export { GeojsonLayer } from './layers/geojson-layer';

// ユーティリティ
export * from './utils/geo-utils';
export * from './utils/style-utils';
export * from './utils/tests';