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
 *   projection: 'naturalEarth1'
 * });
 * 
 * map.addLayer('countries', {
 *   data: geoJsonData,
 *   style: { fill: '#f0f0f0', stroke: '#333' }
 * });
 * ```
 */

// メインクラス
export { Cartography } from './cartography';

// 型定義
export type { 
  CartographyOptions, 
  LayerOptions, 
  LayerStyle, 
  CartographyLayer,
  ProjectionName,
  ILayer,
  RendererOptions
} from './types';

// コア機能
export { createProjection } from './core/projection';
export { Renderer } from './core/renderer';
export { LayerManager } from './core/layer-manager';

// レイヤークラス
export { BaseLayer } from './layers/base-layer';
export { VectorLayer } from './layers/vector-layer';

// ユーティリティ
export * from './utils/geo-utils';
export * from './utils/style-utils';