import { Selection } from 'd3-selection';
import { BaseLayer } from '../core/base-layer';
import { LayerAttr, LayerStyle } from '../../types';

/**
 * タイトルの配置キーワード
 */
export type TitlePosition =
  | 'top-left'
  | 'top-center'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'bottom-right';

/**
 * TitleLayerの初期化オプション
 */
export interface TitleLayerOptions {
  /** タイトル本文 */
  title: string;
  /** サブタイトル（タイトルの下に小さく表示） */
  subtitle?: string;
  /** 配置キーワードまたはピクセル座標（デフォルト: 'top-left'） */
  position?: TitlePosition | { top?: number; bottom?: number; left?: number; right?: number };
  /** 地図端からの余白（ピクセル、デフォルト: 16） */
  margin?: number;
  /** タイトルのフォントサイズ（デフォルト: 20） */
  fontSize?: number;
  /** サブタイトルのフォントサイズ（デフォルト: 12） */
  subtitleFontSize?: number;
  /** 文字色（デフォルト: '#333333'） */
  color?: string;
  /** ハロー（縁取り）の色。null指定でハローなし（デフォルト: '#ffffff'） */
  haloColor?: string | null;
  /** レイヤーのSVG属性設定 */
  attr?: LayerAttr;
  /** レイヤーのCSS style属性設定 */
  style?: LayerStyle;
}

/**
 * 地図のタイトル・サブタイトル・出典表記などをピクセル座標で配置するレイヤークラス。
 * TextLayerがGeoJSON座標（経緯度）を必要とするのに対し、こちらは画面座標で
 * 「左上にタイトル」「右下に出典」のような静的地図の周辺要素を配置する。
 */
export class TitleLayer extends BaseLayer<LayerAttr, LayerStyle> {
  /** タイトル本文 */
  private title: string;
  /** サブタイトル */
  private subtitle?: string;
  /** 配置指定 */
  private position: TitlePosition | { top?: number; bottom?: number; left?: number; right?: number };
  /** 地図端からの余白 */
  private margin: number;
  /** タイトルのフォントサイズ */
  private fontSize: number;
  /** サブタイトルのフォントサイズ */
  private subtitleFontSize: number;
  /** 文字色 */
  private color: string;
  /** ハローの色 */
  private haloColor: string | null;
  /** レイヤーグループ */
  private layerGroup?: Selection<SVGGElement, unknown, HTMLElement, any>;

  /**
   * TitleLayerを初期化します
   * @param options - レイヤーの設定オプション
   */
  constructor(options: TitleLayerOptions) {
    // BaseLayerのデフォルト塗り/線がテキストに継承されないよう打ち消す
    super(
      `title-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      { fill: 'none', stroke: 'none', ...options.attr },
      options.style || {}
    );

    this.title = options.title;
    this.subtitle = options.subtitle;
    this.position = options.position ?? 'top-left';
    this.margin = options.margin ?? 16;
    this.fontSize = options.fontSize ?? 20;
    this.subtitleFontSize = options.subtitleFontSize ?? 12;
    this.color = options.color ?? '#333333';
    this.haloColor = options.haloColor === undefined ? '#ffffff' : options.haloColor;
  }

  /**
   * レイヤーを描画します
   * @param container - 描画先のSVGコンテナ
   */
  render(container: Selection<SVGGElement, unknown, HTMLElement, any>): void {
    this.layerGroup = this.createLayerGroup(container);
    this.renderTitle();
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
   * 配置指定からアンカー座標とtext-anchorを解決します
   * @param width - 地図の幅
   * @param height - 地図の高さ
   * @returns 座標・text-anchor・縦位置（top/bottom）
   * @private
   */
  private resolvePosition(width: number, height: number): { x: number; y: number; anchor: string; vertical: 'top' | 'bottom' } {
    const m = this.margin;

    if (typeof this.position === 'string') {
      const [vertical, horizontal] = this.position.split('-') as ['top' | 'bottom', 'left' | 'center' | 'right'];
      const x = horizontal === 'left' ? m : horizontal === 'right' ? width - m : width / 2;
      const anchor = horizontal === 'left' ? 'start' : horizontal === 'right' ? 'end' : 'middle';
      const y = vertical === 'top' ? m : height - m;
      return { x, y, anchor, vertical };
    }

    const p = this.position;
    const x = p.left ?? (p.right !== undefined ? width - p.right : m);
    const anchor = p.left !== undefined ? 'start' : p.right !== undefined ? 'end' : 'start';
    if (p.top !== undefined) {
      return { x, y: p.top, anchor, vertical: 'top' };
    }
    return { x, y: height - (p.bottom ?? m), anchor, vertical: 'bottom' };
  }

  /**
   * タイトルを描画します
   * @private
   */
  private renderTitle(): void {
    if (!this.layerGroup) return;

    this.layerGroup.selectAll('g.thematika-title').remove();

    const size = this.getMapSize();
    if (!size) return;
    const [width, height] = size;

    const { x, y, anchor, vertical } = this.resolvePosition(width, height);

    const g = this.layerGroup
      .append('g')
      .attr('class', 'thematika-title')
      .attr('paint-order', 'stroke')
      .attr('stroke-linejoin', 'round');

    const lineGap = 6;

    // 上配置はタイトル→サブタイトルの順に下へ、下配置は下端から上へ積む
    const addText = (text: string, fontSize: number, weight: string, ty: number) => {
      const t = g.append('text')
        .attr('x', x)
        .attr('y', ty)
        .attr('text-anchor', anchor)
        .attr('font-size', fontSize)
        .attr('font-weight', weight)
        .attr('fill', this.color)
        .text(text);
      if (this.haloColor) {
        t.attr('stroke', this.haloColor).attr('stroke-width', 3);
      }
      return t;
    };

    if (vertical === 'top') {
      addText(this.title, this.fontSize, 'bold', y + this.fontSize);
      if (this.subtitle) {
        addText(this.subtitle, this.subtitleFontSize, 'normal', y + this.fontSize + lineGap + this.subtitleFontSize);
      }
    } else {
      // 下配置: サブタイトルを最下段に、タイトルをその上に
      if (this.subtitle) {
        addText(this.subtitle, this.subtitleFontSize, 'normal', y);
        addText(this.title, this.fontSize, 'bold', y - this.subtitleFontSize - lineGap);
      } else {
        addText(this.title, this.fontSize, 'bold', y);
      }
    }

    // ユーザー指定のattr/styleをグループに適用
    this.applyAllStylesToElement(g, g as any);
  }
}
