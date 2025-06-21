import { Selection } from 'd3-selection';
import { geoPath, GeoPath, GeoProjection, geoGraticule } from 'd3-geo';
import { BaseLayer } from './base-layer';
import { LayerStyle, IGeojsonLayer } from '../types';

/**
 * GraticuleLayerの初期化オプション
 */
export interface GraticuleLayerOptions {
  /** レイヤーのスタイル設定 */
  style?: LayerStyle;
  /** レイヤーの属性設定（styleのエイリアス） */
  attr?: LayerStyle;
  /** 経緯線の間隔 [経度間隔, 緯度間隔] (度) */
  step?: [number, number];
  /** 経緯線の範囲 [[西端, 南端], [東端, 北端]] (度) */
  extent?: [[number, number], [number, number]];
}

/**
 * 経緯線（グラティキュール）を描画するレイヤークラス
 * D3のgeoGraticuleを使用して経緯線網を描画します
 */
export class GraticuleLayer extends BaseLayer implements IGeojsonLayer {
  /** パス生成器 */
  private path?: GeoPath;
  /** レイヤーグループ */
  private layerGroup?: Selection<SVGGElement, unknown, HTMLElement, any>;
  /** 経緯線の間隔 */
  private step: [number, number];
  /** 経緯線の範囲 */
  private extent?: [[number, number], [number, number]];

  /**
   * GraticuleLayerを初期化します
   * @param options - レイヤーの設定オプション
   */
  constructor(options: GraticuleLayerOptions = {}) {
    // 一意のIDを自動生成
    // style または attr のどちらかを使用（attr が優先）
    const defaultStyle: LayerStyle = {
      fill: 'none',
      stroke: '#cccccc',
      strokeWidth: 0.5,
      opacity: 0.7
    };
    
    super(`graticule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, 
          { ...defaultStyle, ...(options.attr || options.style) });
    
    this.step = options.step || [10, 10];
    this.extent = options.extent;
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
    this.renderGraticule();
  }

  /**
   * レイヤーを更新します
   */
  update(): void {
    if (this.layerGroup) {
      this.layerGroup.selectAll('path').remove();
      this.renderGraticule();
    }
  }

  /**
   * 経緯線の間隔を設定します
   * @param step - 新しい間隔 [経度間隔, 緯度間隔]
   */
  setStep(step: [number, number]): void {
    this.step = step;
    this.update();
  }

  /**
   * 経緯線の範囲を設定します
   * @param extent - 新しい範囲 [[西端, 南端], [東端, 北端]]
   */
  setExtent(extent?: [[number, number], [number, number]]): void {
    this.extent = extent;
    this.update();
  }

  /**
   * 経緯線を描画します
   * @private
   */
  private renderGraticule(): void {
    if (!this.layerGroup || !this.path) return;

    // geoGraticuleを作成
    const graticule = geoGraticule().step(this.step);
    
    // 範囲が指定されている場合は設定
    if (this.extent) {
      graticule.extent(this.extent);
    }
    
    // 経緯線のジオメトリを生成
    const graticuleGeometry = graticule();
    
    // 経緯線パス要素を作成
    const graticulePath = this.layerGroup
      .append('path')
      .datum(graticuleGeometry)
      .attr('d', this.path)
      .attr('class', () => {
        const baseClass = 'cartography-graticule';
        const customClass = this.style.className || '';
        return [baseClass, customClass].filter(Boolean).join(' ');
      });

    // スタイル属性を適用（共通メソッドを使用）
    this.applyStylesToElement(graticulePath, graticuleGeometry, 0);
  }

  /**
   * 現在の経緯線間隔を取得します
   * @returns 経緯線の間隔
   */
  getStep(): [number, number] {
    return this.step;
  }

  /**
   * 現在の経緯線範囲を取得します
   * @returns 経緯線の範囲
   */
  getExtent(): [[number, number], [number, number]] | undefined {
    return this.extent;
  }
}