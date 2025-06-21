import { Selection, select } from 'd3-selection';
import { geoPath, GeoPath, GeoProjection } from 'd3-geo';
import { BaseLayer } from './base-layer';
import { LayerStyle, IGeojsonLayer } from '../types';

/**
 * GeojsonLayerの初期化オプション
 */
export interface GeojsonLayerOptions {
  /** GeoJSONデータ */
  data: GeoJSON.FeatureCollection | GeoJSON.Feature[];
  /** レイヤーのスタイル設定 */
  style?: LayerStyle;
  /** レイヤーの属性設定（styleのエイリアス） */
  attr?: LayerStyle;
}

/**
 * GeoJSONデータを描画するレイヤークラス
 */
export class GeojsonLayer extends BaseLayer implements IGeojsonLayer {
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
    // style または attr のどちらかを使用（attr が優先）
    super(`geojson-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, options.attr || options.style);
    
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

    // パス要素を作成
    const paths = this.layerGroup
      .append('g')
      .attr('class', 'cartography-geojson-layer')
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
      .style('cursor', 'pointer');

    // スタイル属性を適用（共通メソッドを使用）
    this.applyStylesToElements(paths, this.layerGroup);
  }


  /**
   * GeoJSONデータを取得します
   * @returns 現在のGeoJSONデータ
   */
  getData(): GeoJSON.FeatureCollection {
    return this.data;
  }
}