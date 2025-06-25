import { Selection } from 'd3-selection';
import { GeoProjection } from 'd3-geo';
import { BaseLayer } from './base-layer';
import { LayerStyle } from '../types';
import { getCentroid } from '../utils/gis-utils';

/**
 * PointCircleLayerの初期化オプション
 */
export interface PointCircleLayerOptions {
  /** GeoJSONデータ */
  data: GeoJSON.FeatureCollection | GeoJSON.Feature[];
  /** レイヤーのスタイル設定 */
  style?: LayerStyle;
  /** レイヤーの属性設定（styleのエイリアス） */
  attr?: LayerStyle;
  /** サークルの半径（固定値または関数） */
  r?: number | ((feature: GeoJSON.Feature, index: number) => number);
}

/**
 * GeoJSONデータをサークル要素として描画するレイヤークラス
 * ポイントならそのまま、ポリゴンやラインなら中心点にサークルを配置
 */
export class PointCircleLayer extends BaseLayer {
  /** GeoJSONデータ */
  private data: GeoJSON.FeatureCollection;
  /** 投影法 */
  private projection?: GeoProjection;
  /** レイヤーグループ */
  private layerGroup?: Selection<SVGGElement, unknown, HTMLElement, any>;
  /** サークルの半径設定 */
  private radiusFunction: (feature: GeoJSON.Feature, index: number) => number;

  /**
   * PointCircleLayerを初期化します
   * @param options - レイヤーの設定オプション
   */
  constructor(options: PointCircleLayerOptions) {
    // 一意のIDを自動生成
    super(`point-circle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, options.attr || options.style);
    
    // データの正規化
    this.data = Array.isArray(options.data)
      ? { type: 'FeatureCollection', features: options.data }
      : options.data as GeoJSON.FeatureCollection;
    
    // 半径設定の処理
    if (typeof options.r === 'function') {
      this.radiusFunction = options.r;
    } else {
      const radius = options.r || 5; // デフォルト半径は5
      this.radiusFunction = () => radius;
    }
  }

  /**
   * レイヤーを描画します
   * @param container - 描画先のSVGコンテナ
   */
  render(container: Selection<SVGGElement, unknown, HTMLElement, any>): void {
    this.layerGroup = this.createLayerGroup(container);
    this.renderCircles();
  }



  /**
   * フィーチャーにイベントリスナーを追加します
   * @param eventType - イベントタイプ
   * @param handler - イベントハンドラー
   */
  on(eventType: string, handler: (event: Event, data: GeoJSON.Feature) => void): void {
    if (this.layerGroup) {
      this.layerGroup.selectAll('circle')
        .on(eventType, function(event, d) {
          handler(event, d as GeoJSON.Feature);
        });
    }
  }

  /**
   * サークルを描画します
   * @private
   */
  private renderCircles(): void {
    if (!this.layerGroup || !this.projection) return;

    // 各フィーチャーの座標を取得
    const circleData = this.data.features.map((feature, index) => {
      let coordinates: [number, number];

      if (feature.geometry.type === 'Point') {
        // ポイントの場合はそのまま使用
        coordinates = feature.geometry.coordinates as [number, number];
      } else {
        // ポリゴンやラインの場合は中心点を計算
        const centroid = getCentroid(feature);
        coordinates = [centroid.x, centroid.y];
      }

      // 投影法で座標変換
      const projectedCoords = this.projection!(coordinates);
      
      return {
        feature,
        index,
        x: projectedCoords ? projectedCoords[0] : 0,
        y: projectedCoords ? projectedCoords[1] : 0,
        r: this.radiusFunction(feature, index)
      };
    }).filter(d => d.x !== null && d.y !== null); // 投影できない座標を除外

    // サークル要素を作成
    const circles = this.layerGroup
      .append('g')
      .attr('class', 'cartography-point-circle-layer')
      .selectAll('circle')
      .data(circleData)
      .enter()
      .append('circle')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('r', d => d.r)
      .attr('class', d => {
        const baseClass = 'cartography-point-circle';
        const customClass = this.style.className || '';
        const featureClass = (d.feature.properties?.class as string) || '';
        return [baseClass, customClass, featureClass].filter(Boolean).join(' ');
      })
      .style('cursor', 'pointer');

    // スタイル属性を適用（共通メソッドを使用）
    this.applyStylesToElements(circles, this.layerGroup);
  }


  /**
   * GeoJSONデータを取得します
   * @returns 現在のGeoJSONデータ
   */
  getData(): GeoJSON.FeatureCollection {
    return this.data;
  }

  /**
   * 現在の半径設定関数を取得します
   * @returns 半径設定関数
   */
  getRadiusFunction(): (feature: GeoJSON.Feature, index: number) => number {
    return this.radiusFunction;
  }
}