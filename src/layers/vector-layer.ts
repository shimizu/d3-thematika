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
      .style('fill', this.style.fill!)
      .style('stroke', this.style.stroke!)
      .style('stroke-width', this.style.strokeWidth!)
      .style('opacity', this.style.opacity!)
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
      .style('fill', style.fill || this.style.fill!)
      .style('stroke', style.stroke || this.style.stroke!)
      .style('stroke-width', style.strokeWidth || this.style.strokeWidth!)
      .style('opacity', style.opacity || this.style.opacity!);
  }

  /**
   * GeoJSONデータを取得します
   * @returns 現在のGeoJSONデータ
   */
  getData(): GeoJSON.FeatureCollection {
    return this.data;
  }
}