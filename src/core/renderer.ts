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
      .style('fill', (d: GeoJSON.Feature) => {
        return typeof layer.style.fill === 'function' ? layer.style.fill(d) : (layer.style.fill || null);
      })
      .style('stroke', (d: GeoJSON.Feature) => {
        return typeof layer.style.stroke === 'function' ? layer.style.stroke(d) : (layer.style.stroke || null);
      })
      .style('stroke-width', (d: GeoJSON.Feature) => {
        return typeof layer.style.strokeWidth === 'function' ? layer.style.strokeWidth(d) : (layer.style.strokeWidth || null);
      })
      .style('opacity', (d: GeoJSON.Feature) => {
        return typeof layer.style.opacity === 'function' ? layer.style.opacity(d) : (layer.style.opacity || null);
      });

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
      .style('fill', (d: any) => {
        const feature = d as GeoJSON.Feature;
        return typeof layer.style.fill === 'function' ? layer.style.fill(feature) : (layer.style.fill || null);
      })
      .style('stroke', (d: any) => {
        const feature = d as GeoJSON.Feature;
        return typeof layer.style.stroke === 'function' ? layer.style.stroke(feature) : (layer.style.stroke || null);
      })
      .style('stroke-width', (d: any) => {
        const feature = d as GeoJSON.Feature;
        return typeof layer.style.strokeWidth === 'function' ? layer.style.strokeWidth(feature) : (layer.style.strokeWidth || null);
      })
      .style('opacity', (d: any) => {
        const feature = d as GeoJSON.Feature;
        return typeof layer.style.opacity === 'function' ? layer.style.opacity(feature) : (layer.style.opacity || null);
      });
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