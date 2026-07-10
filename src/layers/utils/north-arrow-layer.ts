import { Selection } from 'd3-selection';
import { GeoProjection } from 'd3-geo';
import { BaseLayer } from '../core/base-layer';
import { LayerAttr, LayerStyle, IGeojsonLayer } from '../../types';

/**
 * NorthArrowLayerの初期化オプション
 */
export interface NorthArrowLayerOptions {
  /** 配置位置（ピクセル座標、デフォルト: { top: 20, right: 20 }） */
  position?: { top?: number; bottom?: number; left?: number; right?: number };
  /** 記号のサイズ（ピクセル、デフォルト: 40） */
  size?: number;
  /** 記号の色（デフォルト: '#333333'） */
  color?: string;
  /** 「N」ラベルを表示するか（デフォルト: true） */
  showLabel?: boolean;
  /** 配置位置での真北方向に合わせて回転するか（デフォルト: true）。
   *  falseの場合は常に画面上向き */
  rotateToNorth?: boolean;
  /** レイヤーのSVG属性設定 */
  attr?: LayerAttr;
  /** レイヤーのCSS style属性設定 */
  style?: LayerStyle;
}

/**
 * 方位記号（ノースアロー）を描画するレイヤークラス。
 *
 * デフォルトでは配置位置における真北の方向を投影法から計算して回転する
 * （メルカトルなど正角図法では常に上、円錐図法などでは傾く）。
 * 真北が画面上で一定でない投影法（正距方位図法の全球表示など）では
 * 記号の意味が場所によって変わるため注意。
 */
export class NorthArrowLayer extends BaseLayer<LayerAttr, LayerStyle> implements IGeojsonLayer {
  /** 投影法 */
  private projection?: GeoProjection;
  /** レイヤーグループ */
  private layerGroup?: Selection<SVGGElement, unknown, HTMLElement, any>;
  /** 配置位置 */
  private position: { top?: number; bottom?: number; left?: number; right?: number };
  /** 記号のサイズ */
  private size: number;
  /** 記号の色 */
  private color: string;
  /** Nラベル表示 */
  private showLabel: boolean;
  /** 真北回転の有効/無効 */
  private rotateToNorth: boolean;

  /**
   * NorthArrowLayerを初期化します
   * @param options - レイヤーの設定オプション
   */
  constructor(options: NorthArrowLayerOptions = {}) {
    super(
      `northarrow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      { fill: 'none', stroke: 'none', ...options.attr },
      options.style || {}
    );

    this.position = options.position ?? { top: 20, right: 20 };
    this.size = options.size ?? 40;
    this.color = options.color ?? '#333333';
    this.showLabel = options.showLabel ?? true;
    this.rotateToNorth = options.rotateToNorth ?? true;
  }

  /**
   * 投影法を設定します
   * @param projection - 地図投影法
   */
  setProjection(projection: GeoProjection): void {
    this.projection = projection;
    if (this.layerGroup) {
      this.renderArrow();
    }
  }

  /**
   * レイヤーを描画します
   * @param container - 描画先のSVGコンテナ
   */
  render(container: Selection<SVGGElement, unknown, HTMLElement, any>): void {
    this.layerGroup = this.createLayerGroup(container);
    this.renderArrow();
  }

  /**
   * SVGのviewBoxから地図のサイズを取得します
   * @returns [width, height]、取得できない場合はnull
   * @private
   */
  private getMapSize(): [number, number] | null {
    const node = this.layerGroup?.node();
    const svg = node?.ownerSVGElement;
    if (!svg) return null;
    const vb = svg.viewBox?.baseVal;
    if (vb && vb.width > 0 && vb.height > 0) {
      return [vb.width, vb.height];
    }
    return null;
  }

  /**
   * 配置位置での真北方向（画面上の角度）を計算します。
   * 配置点を逆投影し、わずかに北へ動かした点を再投影して方向を求める。
   * @param x - 配置点のx座標
   * @param y - 配置点のy座標
   * @returns 回転角（度）。計算できない場合は0
   * @private
   */
  private computeNorthAngle(x: number, y: number): number {
    if (!this.rotateToNorth || !this.projection?.invert) return 0;

    const geo = this.projection.invert([x, y]);
    if (!geo || !geo.every(isFinite)) return 0;

    const [lon, lat] = geo;
    // 北極を越えないよう少しだけ北へ
    const northLat = Math.min(lat + 0.1, 89.9);
    const p0 = this.projection([lon, lat]);
    const p1 = this.projection([lon, northLat]);
    if (!p0 || !p1) return 0;

    const dx = p1[0] - p0[0];
    const dy = p1[1] - p0[1];
    if (dx === 0 && dy === 0) return 0;

    // 画面上向き（0, -1）を基準にした回転角
    return (Math.atan2(dx, -dy) * 180) / Math.PI;
  }

  /**
   * 方位記号を描画します
   * @private
   */
  private renderArrow(): void {
    if (!this.layerGroup) return;

    this.layerGroup.selectAll('g.thematika-north-arrow').remove();

    const size = this.getMapSize();
    if (!size) return;
    const [width, height] = size;

    const s = this.size;
    // 配置基準は記号の中心
    const cx = this.position.left !== undefined
      ? this.position.left + s / 2
      : width - (this.position.right ?? 20) - s / 2;
    const cy = this.position.top !== undefined
      ? this.position.top + s / 2
      : height - (this.position.bottom ?? 20) - s / 2;

    const angle = this.computeNorthAngle(cx, cy);

    const g = this.layerGroup
      .append('g')
      .attr('class', 'thematika-north-arrow')
      .attr('transform', `translate(${cx}, ${cy}) rotate(${angle})`);

    const h = s / 2;         // 中心から先端までの距離
    const wing = s * 0.18;   // 矢の幅

    // 右半分（塗り）と左半分（白）で立体感を出す定番の形
    g.append('path')
      .attr('d', `M 0 ${-h} L ${wing} ${h * 0.5} L 0 ${h * 0.25} Z`)
      .attr('fill', this.color)
      .attr('stroke', this.color)
      .attr('stroke-width', 1)
      .attr('stroke-linejoin', 'round');
    g.append('path')
      .attr('d', `M 0 ${-h} L ${-wing} ${h * 0.5} L 0 ${h * 0.25} Z`)
      .attr('fill', '#ffffff')
      .attr('stroke', this.color)
      .attr('stroke-width', 1)
      .attr('stroke-linejoin', 'round');

    if (this.showLabel) {
      g.append('text')
        .attr('x', 0)
        .attr('y', h * 0.95)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'hanging')
        .attr('font-size', s * 0.35)
        .attr('font-weight', 'bold')
        .attr('fill', this.color)
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 2)
        .attr('paint-order', 'stroke')
        .text('N');
    }

    // ユーザー指定のattr/styleをグループに適用
    this.applyAllStylesToElement(g, g as any);
  }
}
