import { Selection, select } from 'd3-selection';
import { geoPath, GeoPath, GeoProjection } from 'd3-geo';
import { BaseLayer } from './base-layer';
import { LayerStyle } from '../types';

/**
 * GeojsonLayerの初期化オプション
 */
export interface GeojsonLayerOptions {
  /** GeoJSONデータ */
  data: GeoJSON.FeatureCollection | GeoJSON.Feature[];
  /** レイヤーのスタイル設定 */
  style?: LayerStyle;
}

/**
 * GeoJSONデータを描画するレイヤークラス
 */
export class GeojsonLayer extends BaseLayer {
  /** GeoJSONデータ */
  private data: GeoJSON.FeatureCollection;
  /** パス生成器 */
  private path?: GeoPath;
  /** レイヤーグループ */
  private layerGroup?: Selection<SVGGElement, unknown, HTMLElement, any>;

  /**
   * GeoJSONレイヤーを初期化します
   * @param options - レイヤーの設定オプション
   */
  constructor(options: GeojsonLayerOptions) {
    // 一意のIDを自動生成
    super(`geojson-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, options.style);
    
    // データの正規化
    this.data = Array.isArray(options.data)
      ? { type: 'FeatureCollection', features: options.data }
      : options.data as GeoJSON.FeatureCollection;
  }

  /**
   * 投影法を設定します
   * @param projection - 地図投影法
   */
  setProjection(projection: GeoProjection): void {
    this.path = geoPath(projection);
    if (this.layerGroup) {
      this.update();
    }
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
    if (!this.layerGroup || !this.path) return;

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
      .attr('fill', (d: GeoJSON.Feature, i: number) => {
        return typeof this.style.fill === 'function' ? this.style.fill(d, i) : (this.style.fill || null);
      })
      .attr('stroke', (d: GeoJSON.Feature, i: number) => {
        return typeof this.style.stroke === 'function' ? this.style.stroke(d, i) : (this.style.stroke || null);
      })
      .attr('stroke-width', (d: GeoJSON.Feature, i: number) => {
        return typeof this.style.strokeWidth === 'function' ? this.style.strokeWidth(d, i) : (this.style.strokeWidth || null);
      })
      .attr('stroke-dasharray', (d: GeoJSON.Feature, i: number) => {
        return typeof this.style.strokeDasharray === 'function' ? this.style.strokeDasharray(d, i) : (this.style.strokeDasharray || null);
      })
      .attr('opacity', (d: GeoJSON.Feature, i: number) => {
        return typeof this.style.opacity === 'function' ? this.style.opacity(d, i) : (this.style.opacity || null);
      })
      .attr('filter', (d: GeoJSON.Feature, i: number) => {
        return typeof this.style.filter === 'function' ? this.style.filter(d, i) : (this.style.filter || null);
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
      .attr('fill', (d: any, i: number) => {
        const feature = d as GeoJSON.Feature;
        const fillValue = style.fill || this.style.fill;
        return typeof fillValue === 'function' ? fillValue(feature, i) : (fillValue || null);
      })
      .attr('stroke', (d: any, i: number) => {
        const feature = d as GeoJSON.Feature;
        const strokeValue = style.stroke || this.style.stroke;
        return typeof strokeValue === 'function' ? strokeValue(feature, i) : (strokeValue || null);
      })
      .attr('stroke-width', (d: any, i: number) => {
        const feature = d as GeoJSON.Feature;
        const strokeWidthValue = style.strokeWidth || this.style.strokeWidth;
        return typeof strokeWidthValue === 'function' ? strokeWidthValue(feature, i) : (strokeWidthValue || null);
      })
      .attr('stroke-dasharray', (d: any, i: number) => {
        const feature = d as GeoJSON.Feature;
        const strokeDasharrayValue = style.strokeDasharray || this.style.strokeDasharray;
        return typeof strokeDasharrayValue === 'function' ? strokeDasharrayValue(feature, i) : (strokeDasharrayValue || null);
      })
      .attr('opacity', (d: any, i: number) => {
        const feature = d as GeoJSON.Feature;
        const opacityValue = style.opacity || this.style.opacity;
        return typeof opacityValue === 'function' ? opacityValue(feature, i) : (opacityValue || null);
      })
      .attr('filter', (d: any, i: number) => {
        const feature = d as GeoJSON.Feature;
        const filterValue = style.filter || this.style.filter;
        return typeof filterValue === 'function' ? filterValue(feature, i) : (filterValue || null);
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