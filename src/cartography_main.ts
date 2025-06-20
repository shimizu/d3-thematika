import { select, Selection } from 'd3-selection';
import { geoPath, GeoPath, GeoProjection } from 'd3-geo';
import { CartographyOptions, LayerOptions, CartographyLayer, LayerStyle } from './cartography_types';
import { createProjection } from './projection_utils';

export class Cartography {
  private container: Selection<HTMLElement, unknown, HTMLElement, any>;
  private svg: Selection<SVGSVGElement, unknown, HTMLElement, any>;
  private projection: GeoProjection;
  private path: GeoPath;
  private layers: Map<string, CartographyLayer> = new Map();
  private width: number;
  private height: number;

  constructor(options: CartographyOptions) {
    this.width = options.width;
    this.height = options.height;

    // コンテナを選択
    this.container = select(options.container);
    if (this.container.empty()) {
      throw new Error(`Container not found: ${options.container}`);
    }

    // SVG要素を作成
    this.svg = this.container
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height)
      .attr('class', 'cartography-map');

    // 投影法を設定
    this.projection = createProjection(options.projection, this.width, this.height);
    this.path = geoPath(this.projection);
  }

  /**
   * レイヤーを追加
   */
  addLayer(id: string, options: LayerOptions): void {
    // データの正規化
    const data: GeoJSON.FeatureCollection = Array.isArray(options.data)
      ? { type: 'FeatureCollection', features: options.data }
      : options.data as GeoJSON.FeatureCollection;

    // デフォルトスタイル
    const defaultStyle: LayerStyle = {
      fill: '#cccccc',
      stroke: '#333333',
      strokeWidth: 0.5,
      opacity: 1
    };

    const style = { ...defaultStyle, ...options.style };

    // レイヤーオブジェクトを作成
    const layer: CartographyLayer = {
      id,
      data,
      style,
    };

    this.layers.set(id, layer);
    this.renderLayer(layer);
  }

  /**
   * レイヤーを描画
   */
  private renderLayer(layer: CartographyLayer): void {
    // レイヤーグループを作成
    const layerGroup = this.svg
      .append('g')
      .attr('class', `cartography-layer cartography-layer--${layer.id}`);

    // フィーチャーを描画
    layerGroup
      .selectAll('path')
      .data(layer.data.features)
      .enter()
      .append('path')
      .attr('d', this.path)
      .attr('class', d => `cartography-feature ${layer.style.className || ''}`)
      .style('fill', layer.style.fill!)
      .style('stroke', layer.style.stroke!)
      .style('stroke-width', layer.style.strokeWidth!)
      .style('opacity', layer.style.opacity!);

    layer.element = layerGroup.node()!;
  }

  /**
   * レイヤーを削除
   */
  removeLayer(id: string): void {
    const layer = this.layers.get(id);
    if (layer && layer.element) {
      layer.element.remove();
      this.layers.delete(id);
    }
  }

  /**
   * 投影法を変更
   */
  setProjection(projection: string | GeoProjection): void {
    this.projection = createProjection(projection, this.width, this.height);
    this.path = geoPath(this.projection);
    this.rerender();
  }

  /**
   * 全レイヤーを再描画
   */
  private rerender(): void {
    this.svg.selectAll('.cartography-layer').remove();
    this.layers.forEach(layer => {
      layer.element = undefined;
      this.renderLayer(layer);
    });
  }

  /**
   * SVG要素を取得
   */
  getSVG(): SVGSVGElement {
    return this.svg.node()!;
  }

  /**
   * 投影法を取得
   */
  getProjection(): GeoProjection {
    return this.projection;
  }
}