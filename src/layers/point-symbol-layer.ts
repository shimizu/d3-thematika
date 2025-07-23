import { Selection } from 'd3-selection';
import { GeoProjection } from 'd3-geo';
import { symbol, symbolCircle, symbolCross, symbolDiamond, symbolSquare, symbolStar, symbolTriangle, symbolWye, SymbolType } from 'd3-shape';
import { BaseLayer } from './base-layer';
import { LayerAttr, LayerStyle, IGeojsonLayer } from '../types';
import { getCentroid } from '../utils/gis-utils';

/**
 * PointSymbolLayerの初期化オプション
 */
export interface PointSymbolLayerOptions {
  /** GeoJSONデータ */
  data: GeoJSON.FeatureCollection | GeoJSON.Feature[];
  /** レイヤーの属性設定 */
  attr?: LayerAttr;
  /** レイヤーのCSS style属性設定 */
  style?: LayerStyle;
  /** シンボルのサイズ（固定値または関数） */
  size?: number | ((feature: GeoJSON.Feature, index: number) => number);
  /** シンボルタイプ（固定値または関数） */
  symbolType?: SymbolType | ((feature: GeoJSON.Feature, index: number) => SymbolType);
}

/**
 * GeoJSONデータをシンボル要素として描画するレイヤークラス
 * ポイントならそのまま、ポリゴンやラインなら中心点にシンボルを配置
 */
export class PointSymbolLayer extends BaseLayer implements IGeojsonLayer {
  /** GeoJSONデータ */
  private data: GeoJSON.FeatureCollection;
  /** 投影法 */
  private projection?: GeoProjection;
  /** レイヤーグループ */
  private layerGroup?: Selection<SVGGElement, unknown, HTMLElement, any>;
  /** シンボルのサイズ設定 */
  private sizeFunction: (feature: GeoJSON.Feature, index: number) => number;
  /** シンボルタイプ設定 */
  private symbolTypeFunction: (feature: GeoJSON.Feature, index: number) => SymbolType;

  /**
   * PointSymbolLayerを初期化します
   * @param options - レイヤーの設定オプション
   */
  constructor(options: PointSymbolLayerOptions) {
    // 一意のIDを自動生成
    super(`point-symbol-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, options.attr || {}, options.style || {});
    
    // データの正規化
    this.data = Array.isArray(options.data)
      ? { type: 'FeatureCollection', features: options.data }
      : options.data as GeoJSON.FeatureCollection;
    
    // サイズ設定の処理
    if (typeof options.size === 'function') {
      this.sizeFunction = options.size;
    } else {
      const size = options.size || 64; // デフォルトサイズは64（8x8ピクセル相当）
      this.sizeFunction = () => size;
    }
    
    // シンボルタイプ設定の処理
    if (typeof options.symbolType === 'function') {
      this.symbolTypeFunction = options.symbolType;
    } else {
      const symbolType = options.symbolType || symbolCross; // デフォルトはcross
      this.symbolTypeFunction = () => symbolType;
    }
  }

  /**
   * レイヤーを描画します
   * @param container - 描画先のSVGコンテナ
   */
  render(container: Selection<SVGGElement, unknown, HTMLElement, any>): void {
    this.layerGroup = this.createLayerGroup(container);
    this.renderSymbols();
  }




  /**
   * 投影法を設定します
   * @param projection - 新しい投影法
   */
  setProjection(projection: GeoProjection): void {
    this.projection = projection;
    // 投影法が変更されたら再描画
    if (this.layerGroup) {
      this.renderSymbols();
    }
  }

  /**
   * シンボルを描画します
   * @private
   */
  private renderSymbols(): void {
    if (!this.layerGroup || !this.projection) return;

    // 既存のシンボルを削除
    this.layerGroup.selectAll('g.thematika-point-symbol-layer').remove();

    // 各フィーチャーの座標を取得
    const symbolData = this.data.features.map((feature, index) => {
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
        size: this.sizeFunction(feature, index),
        symbolType: this.symbolTypeFunction(feature, index)
      };
    }).filter(d => d.x !== null && d.y !== null); // 投影できない座標を除外

    // シンボル要素を作成
    const symbols = this.layerGroup
      .append('g')
      .attr('class', 'thematika-point-symbol-layer')
      .selectAll('path')
      .data(symbolData)
      .enter()
      .append('path')
      .attr('transform', d => `translate(${d.x}, ${d.y})`)
      .attr('d', d => {
        const symbolGenerator = symbol()
          .type(d.symbolType)
          .size(d.size);
        return symbolGenerator() || '';
      })
      .attr('class', d => {
        const baseClass = 'thematika-point-symbol';
        const customClass = this.attr.className || '';
        const featureClass = (d.feature.properties?.class as string) || '';
        return [baseClass, customClass, featureClass].filter(Boolean).join(' ');
      })

    // 属性とスタイルを適用（共通メソッドを使用）
    this.applyAllStylesToElements(symbols, this.layerGroup);
  }


  /**
   * GeoJSONデータを取得します
   * @returns 現在のGeoJSONデータ
   */
  getData(): GeoJSON.FeatureCollection {
    return this.data;
  }
}