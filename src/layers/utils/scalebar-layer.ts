import { Selection } from 'd3-selection';
import { GeoProjection, geoDistance } from 'd3-geo';
import { BaseLayer } from '../core/base-layer';
import { LayerAttr, LayerStyle, IGeojsonLayer } from '../../types';

/** 地球の平均半径（km） */
const EARTH_RADIUS_KM = 6371;
/** 1マイルあたりのkm */
const KM_PER_MILE = 1.609344;

/**
 * スケールバーのピクセル座標配置。
 * left/right、top/bottom はそれぞれ一方のみ指定する（両方指定時は left/top を優先）。
 */
export interface ScaleBarPosition {
  /** 上端からの距離（ピクセル） */
  top?: number;
  /** 下端からの距離（ピクセル） */
  bottom?: number;
  /** 左端からの距離（ピクセル） */
  left?: number;
  /** 右端からの距離（ピクセル） */
  right?: number;
}

/**
 * ScaleBarLayerの初期化オプション
 */
export interface ScaleBarLayerOptions {
  /** 配置位置（デフォルト: { left: 20, bottom: 20 }） */
  position?: ScaleBarPosition;
  /** バーの最大幅（ピクセル、デフォルト: 150）。この幅以下でキリの良い距離に丸められる */
  maxWidth?: number;
  /** 距離の単位（デフォルト: 'km'） */
  units?: 'km' | 'mi';
  /** バーの分割数（デフォルト: 4） */
  segments?: number;
  /** バーの高さ（ピクセル、デフォルト: 6） */
  barHeight?: number;
  /** ラベルのフォントサイズ（デフォルト: 10） */
  fontSize?: number;
  /** レイヤーのSVG属性設定 */
  attr?: LayerAttr;
  /** レイヤーのCSS style属性設定 */
  style?: LayerStyle;
}

/**
 * 縮尺（スケールバー）を描画するレイヤークラス。
 *
 * 配置位置のピクセル座標を投影法で逆変換し、球面距離からバーの実距離を
 * 計算する。距離は 1/2/5×10^n のキリの良い値に丸められる。
 * 縮尺は地図上の場所によって変わるため、バーはその配置位置での距離を表す。
 */
export class ScaleBarLayer extends BaseLayer<LayerAttr, LayerStyle> implements IGeojsonLayer {
  /** 投影法 */
  private projection?: GeoProjection;
  /** レイヤーグループ */
  private layerGroup?: Selection<SVGGElement, unknown, HTMLElement, any>;
  /** 配置位置 */
  private position: ScaleBarPosition;
  /** バーの最大幅 */
  private maxWidth: number;
  /** 距離の単位 */
  private units: 'km' | 'mi';
  /** バーの分割数 */
  private segments: number;
  /** バーの高さ */
  private barHeight: number;
  /** ラベルのフォントサイズ */
  private fontSize: number;

  /**
   * ScaleBarLayerを初期化します
   * @param options - レイヤーの設定オプション
   */
  constructor(options: ScaleBarLayerOptions = {}) {
    super(`scalebar-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, options.attr || {}, options.style || {});

    this.position = options.position ?? { left: 20, bottom: 20 };
    this.maxWidth = options.maxWidth ?? 150;
    this.units = options.units ?? 'km';
    this.segments = options.segments ?? 4;
    this.barHeight = options.barHeight ?? 6;
    this.fontSize = options.fontSize ?? 10;
  }

  /**
   * 投影法を設定します
   * @param projection - 地図投影法
   */
  setProjection(projection: GeoProjection): void {
    this.projection = projection;
    if (this.layerGroup) {
      this.renderScaleBar();
    }
  }

  /**
   * レイヤーを描画します
   * @param container - 描画先のSVGコンテナ
   */
  render(container: Selection<SVGGElement, unknown, HTMLElement, any>): void {
    this.layerGroup = this.createLayerGroup(container);
    this.renderScaleBar();
  }

  /**
   * 距離をキリの良い値（1/2/5×10^n）に切り下げます
   * @param distance - 距離
   * @returns 丸められた距離
   * @private
   */
  private static niceDistance(distance: number): number {
    const exponent = Math.floor(Math.log10(distance));
    const base = Math.pow(10, exponent);
    if (distance >= 5 * base) return 5 * base;
    if (distance >= 2 * base) return 2 * base;
    return base;
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
   * スケールバーを描画します
   * @private
   */
  private renderScaleBar(): void {
    if (!this.layerGroup || !this.projection) return;

    this.layerGroup.selectAll('g.thematika-scalebar').remove();

    if (!this.projection.invert) {
      console.warn('[thematika] ScaleBarLayer: この投影法はinvertをサポートしていないため、スケールバーを描画できません。');
      return;
    }

    const size = this.getMapSize();
    if (!size) return;
    const [width, height] = size;

    // 配置基準点（バーの左端）をピクセル座標で解決
    const x = this.position.left ?? (width - (this.position.right ?? 20) - this.maxWidth);
    const y = this.position.top ?? (height - (this.position.bottom ?? 20));

    // 基準点とmaxWidth右の点を逆投影し、球面距離を求める
    const p1 = this.projection.invert([x, y]);
    const p2 = this.projection.invert([x + this.maxWidth, y]);
    if (!p1 || !p2 || !p1.every(isFinite) || !p2.every(isFinite)) {
      console.warn('[thematika] ScaleBarLayer: 配置位置が投影範囲外のため、スケールバーを描画できません。');
      return;
    }

    const distanceKm = geoDistance(p1, p2) * EARTH_RADIUS_KM;
    const distance = this.units === 'mi' ? distanceKm / KM_PER_MILE : distanceKm;
    if (!(distance > 0)) return;

    // キリの良い距離に丸め、対応するピクセル幅を計算
    const niceDist = ScaleBarLayer.niceDistance(distance);
    const barWidth = (niceDist / distance) * this.maxWidth;
    const segmentWidth = barWidth / this.segments;

    const g = this.layerGroup
      .append('g')
      .attr('class', 'thematika-scalebar')
      .attr('transform', `translate(${x}, ${y})`);

    // 交互塗りのセグメント
    for (let i = 0; i < this.segments; i++) {
      g.append('rect')
        .attr('x', i * segmentWidth)
        .attr('y', -this.barHeight)
        .attr('width', segmentWidth)
        .attr('height', this.barHeight)
        .attr('fill', i % 2 === 0 ? '#333333' : '#ffffff')
        .attr('stroke', '#333333')
        .attr('stroke-width', 1);
    }

    // 両端のラベル（ハロー付き）
    const label = (text: string, lx: number, anchor: string) => {
      g.append('text')
        .attr('x', lx)
        .attr('y', -this.barHeight - 4)
        .attr('text-anchor', anchor)
        .attr('font-size', this.fontSize)
        .attr('fill', '#333333')
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 2)
        .attr('paint-order', 'stroke')
        .text(text);
    };
    label('0', 0, 'middle');
    label(`${niceDist.toLocaleString()} ${this.units}`, barWidth, 'middle');

    // ユーザー指定のattr/styleをグループに適用
    this.applyAllStylesToElement(g, g as any);
  }
}
