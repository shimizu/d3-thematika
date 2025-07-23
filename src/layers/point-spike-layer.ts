import { Selection } from 'd3-selection';
import { GeoProjection } from 'd3-geo';
import { BaseLayer } from './base-layer';
import { LayerAttr, LayerStyle, IGeojsonLayer, PointSpikeLayerOptions } from '../types';
import { getCentroid } from '../utils/gis-utils';

/**
 * GeoJSONデータをスパイク要素として描画するレイヤークラス
 * ポイントならそのまま、ポリゴンやラインなら中心点にスパイクを配置
 */
export class PointSpikeLayer extends BaseLayer implements IGeojsonLayer {
  /** GeoJSONデータ */
  private data: GeoJSON.FeatureCollection;
  /** 投影法 */
  private projection?: GeoProjection;
  /** レイヤーグループ */
  private layerGroup?: Selection<SVGGElement, unknown, HTMLElement, any>;
  /** スパイクの長さ設定 */
  private lengthFunction: (feature: GeoJSON.Feature, index: number) => number;
  /** スパイクの方向 */
  private direction: 'up' | 'down' | 'left' | 'right';

  /**
   * PointSpikeLayerを初期化します
   * @param options - レイヤーの設定オプション
   */
  constructor(options: PointSpikeLayerOptions) {
    // 一意のIDを自動生成
    super(`point-spike-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, options.attr || {}, options.style || {});
    
    // データの正規化
    this.data = Array.isArray(options.data)
      ? { type: 'FeatureCollection', features: options.data }
      : options.data as GeoJSON.FeatureCollection;
    
    // 長さ設定の処理
    if (typeof options.length === 'function') {
      this.lengthFunction = options.length;
    } else {
      const length = options.length || 50; // デフォルト長さは50
      this.lengthFunction = () => length;
    }

    // 方向設定の処理
    this.direction = options.direction || 'up';
  }

  /**
   * レイヤーを描画します
   * @param container - 描画先のSVGコンテナ
   */
  render(container: Selection<SVGGElement, unknown, HTMLElement, any>): void {
    this.layerGroup = this.createLayerGroup(container);
    this.renderSpikes();
  }


  /**
   * 投影法を設定します
   * @param projection - 新しい投影法
   */
  setProjection(projection: GeoProjection): void {
    this.projection = projection;
    // 投影法が変更されたら再描画
    if (this.layerGroup) {
      this.renderSpikes();
    }
  }

  /**
   * スパイクを描画します
   * @private
   */
  private renderSpikes(): void {
    if (!this.layerGroup || !this.projection) return;

    // 既存のスパイクを削除
    this.layerGroup.selectAll('g.thematika-point-spike-layer').remove();

    // 各フィーチャーの座標を取得
    const spikeData = this.data.features.map((feature, index) => {
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
        length: this.lengthFunction(feature, index)
      };
    }).filter(d => d.x !== null && d.y !== null); // 投影できない座標を除外

    // スパイク要素を作成
    const spikes = this.layerGroup
      .append('g')
      .attr('class', 'thematika-point-spike-layer')
      .selectAll('path')
      .data(spikeData)
      .enter()
      .append('path')
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .attr('d', d => this.generateSpikePath(d.length))
      .attr('class', d => {
        const baseClass = 'thematika-point-spike';
        const customClass = this.attr.className || '';
        const featureClass = (d.feature.properties?.class as string) || '';
        return [baseClass, customClass, featureClass].filter(Boolean).join(' ');
      })

    // 属性とスタイルを適用（共通メソッドを使用）
    this.applyAllStylesToElements(spikes, this.layerGroup);
  }

  /**
   * スパイクのSVGパス文字列を生成します
   * @param length - スパイクの長さ
   * @returns SVGパス文字列
   * @private
   */
  private generateSpikePath(length: number): string {
    const width = length * 0.2; // スパイクの幅は長さの20%
    
    switch (this.direction) {
      case 'up':
        return `M 0,0 L ${-width/2},0 L 0,${-length} L ${width/2},0 Z`;
      case 'down':
        return `M 0,0 L ${-width/2},0 L 0,${length} L ${width/2},0 Z`;
      case 'left':
        return `M 0,0 L 0,${-width/2} L ${-length},0 L 0,${width/2} Z`;
      case 'right':
        return `M 0,0 L 0,${-width/2} L ${length},0 L 0,${width/2} Z`;
      default:
        return `M 0,0 L ${-width/2},0 L 0,${-length} L ${width/2},0 Z`;
    }
  }

  /**
   * GeoJSONデータを取得します
   * @returns 現在のGeoJSONデータ
   */
  getData(): GeoJSON.FeatureCollection {
    return this.data;
  }
}