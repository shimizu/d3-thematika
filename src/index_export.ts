/**
 * D3 Cartography ライブラリ
 * 
 * このライブラリはD3.jsを使用してSVGベースの地図を作成するためのツールを提供します。
 * 複数のレイヤーを管理し、様々な投影法をサポートしています。
 * 
 * @example
 * ```typescript
 * import { Cartography } from 'd3-cartography';
 * 
 * const map = new Cartography({
 *   container: '#map',
 *   width: 800,
 *   height: 600,
 *   projection: 'naturalEarth1'
 * });
 * 
 * map.addLayer('countries', {
 *   data: geoJsonData,
 *   style: { fill: '#f0f0f0', stroke: '#333' }
 * });
 * ```
 */

/** メインのCartographyクラス */
export { Cartography } from './cartography_main';

/** 型定義のエクスポート */
export type { 
  CartographyOptions, 
  LayerOptions, 
  LayerStyle, 
  CartographyLayer,
  ProjectionName 
} from './cartography_types';

/** ユーティリティ関数 */
export { createProjection } from './projection_utils';