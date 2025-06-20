import { geoPath, GeoPath } from 'd3-geo';
import { Selection } from 'd3-selection';
import { RendererOptions, CartographyLayer } from '../types';

/**
 * SVGレンダリングを担当するクラス
 * 地理データをSVGパスに変換し、レイヤーを描画します
 */
export class Renderer {
  /** パス生成器 */
  private path: GeoPath;
  /** SVGコンテナ */
  private svg: Selection<SVGSVGElement, unknown, HTMLElement, any>;

  /**
   * レンダラーを初期化します
   * @param options - レンダラーのオプション
   */
  constructor(options: RendererOptions) {
    this.svg = options.svg;
    this.path = geoPath(options.projection);
  }

  /**
   * パス生成器を更新します
   * @param options - 新しいレンダラーオプション
   */
  updateProjection(options: RendererOptions): void {
    this.path = geoPath(options.projection);
  }

  /**
   * レイヤーをSVGに描画します
   * @param layer - 描画するレイヤーオブジェクト
   */
  renderLayer(layer: CartographyLayer): void {
    // レイヤーグループを作成
    const layerGroup = this.svg
      .append('g')
      .attr('class', `cartography-layer cartography-layer--${layer.id}`)
      .style('display', layer.visible === false ? 'none' : '');

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
   * レイヤーのスタイルを更新します
   * @param layer - 更新するレイヤー
   */
  updateLayerStyle(layer: CartographyLayer): void {
    if (!layer.element) return;

    const layerGroup = this.svg.select(`.cartography-layer--${layer.id}`);
    
    layerGroup
      .selectAll('path')
      .style('fill', layer.style.fill!)
      .style('stroke', layer.style.stroke!)
      .style('stroke-width', layer.style.strokeWidth!)
      .style('opacity', layer.style.opacity!);
  }

  /**
   * レイヤーの表示/非表示を切り替えます
   * @param layer - 切り替えるレイヤー
   */
  toggleLayerVisibility(layer: CartographyLayer): void {
    if (!layer.element) return;

    const layerGroup = this.svg.select(`.cartography-layer--${layer.id}`);
    layerGroup.style('display', layer.visible === false ? 'none' : '');
  }

  /**
   * 全レイヤーを再描画します
   */
  clearAllLayers(): void {
    this.svg.selectAll('.cartography-layer').remove();
  }

  /**
   * 指定されたレイヤーを削除します
   * @param layerId - 削除するレイヤーのID
   */
  removeLayer(layerId: string): void {
    this.svg.select(`.cartography-layer--${layerId}`).remove();
  }
}