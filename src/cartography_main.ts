import { select, Selection } from 'd3-selection';
import { geoPath, GeoPath, GeoProjection } from 'd3-geo';
import { CartographyOptions, LayerOptions, CartographyLayer, LayerStyle } from './cartography_types';
import { createProjection } from './projection_utils';

/**
 * 地図描画を行うメインクラス
 * D3.jsを使用してSVGベースの地図を作成し、複数のレイヤーを管理します
 */
export class Cartography {
  /** DOM要素を選択するためのD3セレクション */
  private container: Selection<HTMLElement, unknown, HTMLElement, any>;
  /** SVG要素のD3セレクション */
  private svg: Selection<SVGSVGElement, unknown, HTMLElement, any>;
  /** 地図投影法 */
  private projection: GeoProjection;
  /** 地理データをSVGパスに変換するためのパス生成器 */
  private path: GeoPath;
  /** レイヤーを管理するマップ */
  private layers: Map<string, CartographyLayer> = new Map();
  /** 地図の幅 */
  private width: number;
  /** 地図の高さ */
  private height: number;

  /**
   * Cartographyインスタンスを作成します
   * @param options - 地図の設定オプション
   */
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
   * 地図にレイヤーを追加します
   * @param id - レイヤーの一意識別子
   * @param options - レイヤーの設定オプション（データとスタイル）
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
   * レイヤーをSVGに描画します
   * @param layer - 描画するレイヤーオブジェクト
   * @private
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
   * 指定されたIDのレイヤーを削除します
   * @param id - 削除するレイヤーのID
   */
  removeLayer(id: string): void {
    const layer = this.layers.get(id);
    if (layer && layer.element) {
      layer.element.remove();
      this.layers.delete(id);
    }
  }

  /**
   * 地図の投影法を変更します
   * @param projection - 新しい投影法（文字列または投影法オブジェクト）
   */
  setProjection(projection: string | GeoProjection): void {
    this.projection = createProjection(projection, this.width, this.height);
    this.path = geoPath(this.projection);
    this.rerender();
  }

  /**
   * 全レイヤーを再描画します
   * 投影法の変更時などに呼び出されます
   * @private
   */
  private rerender(): void {
    this.svg.selectAll('.cartography-layer').remove();
    this.layers.forEach(layer => {
      layer.element = undefined;
      this.renderLayer(layer);
    });
  }

  /**
   * 地図のSVG要素を取得します
   * @returns 地図が描画されているSVG要素
   */
  getSVG(): SVGSVGElement {
    return this.svg.node()!;
  }

  /**
   * 現在の投影法を取得します
   * @returns 現在使用されている投影法オブジェクト
   */
  getProjection(): GeoProjection {
    return this.projection;
  }
}