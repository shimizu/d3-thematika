import { Selection } from 'd3-selection';
import { geoPath, GeoPath, GeoProjection } from 'd3-geo';
import { BaseLayer } from './base-layer';
import { LayerStyle } from '../types';

/**
 * ベクターデータ（GeoJSON）を描画するレイヤークラス
 */
export class VectorLayer extends BaseLayer {
  /** GeoJSONデータ */
  private data: GeoJSON.FeatureCollection;
  /** パス生成器 */
  private path: GeoPath;
  /** レイヤーグループ */
  private layerGroup?: Selection<SVGGElement, unknown, HTMLElement, any>;

  /**
   * ベクターレイヤーを初期化します
   * @param id - レイヤーの一意識別子
   * @param data - GeoJSONデータ
   * @param projection - 地図投影法
   * @param style - レイヤーのスタイル設定
   */
  constructor(
    id: string,
    data: GeoJSON.FeatureCollection | GeoJSON.Feature[],
    projection: GeoProjection,
    style: LayerStyle = {}
  ) {
    super(id, style);
    
    // データの正規化
    this.data = Array.isArray(data)
      ? { type: 'FeatureCollection', features: data }
      : data as GeoJSON.FeatureCollection;
      
    this.path = geoPath(projection);
  }

  /**
   * レイヤーを描画します
   * @param container - 描画先のSVGコンテナ
   */
  render(container: Selection<SVGGElement, unknown, HTMLElement, any>): void {
    this.layerGroup = this.createLayerGroup(container);
    this.renderFeatures();
  }

  /**
   * レイヤーを更新します
   */
  update(): void {
    if (this.layerGroup) {
      this.layerGroup.selectAll('path').remove();
      this.renderFeatures();
    }
  }

  /**
   * 投影法を更新します
   * @param projection - 新しい投影法
   */
  updateProjection(projection: GeoProjection): void {
    this.path = geoPath(projection);
    this.update();
  }

  /**
   * データを更新します
   * @param data - 新しいGeoJSONデータ
   */
  updateData(data: GeoJSON.FeatureCollection | GeoJSON.Feature[]): void {
    this.data = Array.isArray(data)
      ? { type: 'FeatureCollection', features: data }
      : data as GeoJSON.FeatureCollection;
    this.update();
  }

  /**
   * フィーチャーにイベントリスナーを追加します
   * @param eventType - イベントタイプ
   * @param handler - イベントハンドラー
   */
  on(eventType: string, handler: (event: Event, data: GeoJSON.Feature) => void): void {
    if (this.layerGroup) {
      this.layerGroup.selectAll('path')
        .on(eventType, function(event, d) {
          handler(event, d as GeoJSON.Feature);
        });
    }
  }

  /**
   * フィーチャーを描画します
   * @private
   */
  private renderFeatures(): void {
    if (!this.layerGroup) return;

    this.layerGroup
      .selectAll('path')
      .data(this.data.features)
      .enter()
      .append('path')
      .attr('d', this.path)
      .attr('class', d => {
        const baseClass = 'cartography-feature';
        const customClass = this.style.className || '';
        const featureClass = (d.properties?.class as string) || '';
        return [baseClass, customClass, featureClass].filter(Boolean).join(' ');
      })
      .style('fill', (d: GeoJSON.Feature) => {
        return typeof this.style.fill === 'function' ? this.style.fill(d) : (this.style.fill || null);
      })
      .style('stroke', (d: GeoJSON.Feature) => {
        return typeof this.style.stroke === 'function' ? this.style.stroke(d) : (this.style.stroke || null);
      })
      .style('stroke-width', (d: GeoJSON.Feature) => {
        return typeof this.style.strokeWidth === 'function' ? this.style.strokeWidth(d) : (this.style.strokeWidth || null);
      })
      .style('opacity', (d: GeoJSON.Feature) => {
        return typeof this.style.opacity === 'function' ? this.style.opacity(d) : (this.style.opacity || null);
      })
      .style('cursor', 'pointer');
  }

  /**
   * 特定のフィーチャーのスタイルを更新します
   * @param filter - フィーチャーを特定するフィルター関数
   * @param style - 適用するスタイル
   */
  updateFeatureStyle(
    filter: (feature: GeoJSON.Feature) => boolean, 
    style: Partial<LayerStyle>
  ): void {
    if (!this.layerGroup) return;

    this.layerGroup.selectAll('path')
      .filter((d: any) => filter(d as GeoJSON.Feature))
      .style('fill', (d: any) => {
        const feature = d as GeoJSON.Feature;
        const fillValue = style.fill || this.style.fill;
        return typeof fillValue === 'function' ? fillValue(feature) : (fillValue || null);
      })
      .style('stroke', (d: any) => {
        const feature = d as GeoJSON.Feature;
        const strokeValue = style.stroke || this.style.stroke;
        return typeof strokeValue === 'function' ? strokeValue(feature) : (strokeValue || null);
      })
      .style('stroke-width', (d: any) => {
        const feature = d as GeoJSON.Feature;
        const strokeWidthValue = style.strokeWidth || this.style.strokeWidth;
        return typeof strokeWidthValue === 'function' ? strokeWidthValue(feature) : (strokeWidthValue || null);
      })
      .style('opacity', (d: any) => {
        const feature = d as GeoJSON.Feature;
        const opacityValue = style.opacity || this.style.opacity;
        return typeof opacityValue === 'function' ? opacityValue(feature) : (opacityValue || null);
      });
  }

  /**
   * GeoJSONデータを取得します
   * @returns 現在のGeoJSONデータ
   */
  getData(): GeoJSON.FeatureCollection {
    return this.data;
  }
}