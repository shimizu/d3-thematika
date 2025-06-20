import { Selection, select } from 'd3-selection';
import { ILayer, LayerStyle, DropShadowConfig } from '../types';

/**
 * 全レイヤーの基底となる抽象クラス
 * 共通の機能と振る舞いを定義します
 */
export abstract class BaseLayer implements ILayer {
  /** レイヤーの一意識別子 */
  public readonly id: string;
  /** レイヤーの表示状態 */
  public visible: boolean = true;
  /** レイヤーの描画順序 */
  public zIndex: number = 0;
  /** レイヤーのスタイル設定 */
  protected style: LayerStyle;
  /** レイヤーのSVGグループ要素 */
  protected element?: SVGGElement;

  /**
   * 基底レイヤーを初期化します
   * @param id - レイヤーの一意識別子
   * @param style - レイヤーのスタイル設定
   */
  constructor(id: string, style: LayerStyle = {}) {
    this.id = id;
    this.style = {
      fill: '#cccccc',
      stroke: '#333333',
      strokeWidth: 0.5,
      opacity: 1,
      ...style
    };
  }

  /**
   * レイヤーを描画します（サブクラスで実装）
   * @param container - 描画先のSVGコンテナ
   */
  abstract render(container: Selection<SVGGElement, unknown, HTMLElement, any>): void;

  /**
   * レイヤーを更新します（サブクラスで実装）
   */
  abstract update(): void;

  /**
   * レイヤーを削除します
   */
  destroy(): void {
    if (this.element) {
      this.element.remove();
      this.element = undefined;
    }
  }

  /**
   * スタイルを設定します
   * @param style - 新しいスタイル設定
   */
  setStyle(style: LayerStyle): void {
    this.style = { ...this.style, ...style };
    this.updateStyle();
    this.updateDropShadow();
  }

  /**
   * 表示状態を設定します
   * @param visible - 表示状態
   */
  setVisible(visible: boolean): void {
    this.visible = visible;
    this.updateVisibility();
  }

  /**
   * 描画順序を設定します
   * @param zIndex - 新しいzIndex値
   */
  setZIndex(zIndex: number): void {
    this.zIndex = zIndex;
  }

  /**
   * レイヤーが描画されているかを確認します
   * @returns 描画状態
   */
  isRendered(): boolean {
    return this.element !== undefined;
  }

  /**
   * スタイルを更新します（サブクラスでオーバーライド可能）
   * @protected
   */
  protected updateStyle(): void {
    if (!this.element) return;

    // d3-selectionでelementをラップして適切なD3セレクションを作成
    const container = select(this.element);
    container.selectAll('path')
      .style('fill', (d: any, i: number) => {
        const feature = d as GeoJSON.Feature;
        return typeof this.style.fill === 'function' ? this.style.fill(feature, i) : (this.style.fill || null);
      })
      .style('stroke', (d: any, i: number) => {
        const feature = d as GeoJSON.Feature;
        return typeof this.style.stroke === 'function' ? this.style.stroke(feature, i) : (this.style.stroke || null);
      })
      .style('stroke-width', (d: any, i: number) => {
        const feature = d as GeoJSON.Feature;
        return typeof this.style.strokeWidth === 'function' ? this.style.strokeWidth(feature, i) : (this.style.strokeWidth || null);
      })
      .style('stroke-dasharray', (d: any, i: number) => {
        const feature = d as GeoJSON.Feature;
        return typeof this.style.strokeDasharray === 'function' ? this.style.strokeDasharray(feature, i) : (this.style.strokeDasharray || null);
      })
      .style('opacity', (d: any, i: number) => {
        const feature = d as GeoJSON.Feature;
        return typeof this.style.opacity === 'function' ? this.style.opacity(feature, i) : (this.style.opacity || null);
      });
  }

  /**
   * 表示状態を更新します
   * @protected
   */
  protected updateVisibility(): void {
    if (!this.element) return;

    // d3-selectionでelementをラップして適切なD3セレクションを作成
    const container = select(this.element);
    container.style('display', this.visible ? '' : 'none');
  }

  /**
   * レイヤーグループ要素を作成します
   * @param container - 親コンテナ
   * @returns 作成されたレイヤーグループ
   * @protected
   */
  protected createLayerGroup(
    container: Selection<SVGGElement, unknown, HTMLElement, any>
  ): Selection<SVGGElement, unknown, HTMLElement, any> {
    const group = container
      .append('g')
      .attr('class', `cartography-layer cartography-layer--${this.id}`)
      .style('display', this.visible ? '' : 'none');

    this.element = group.node()!;
    
    // 初期のdrop-shadowを適用
    this.updateDropShadow();
    
    return group;
  }

  /**
   * ドロップシャドウを更新します
   * @protected
   */
  protected updateDropShadow(): void {
    if (!this.element) return;

    const container = select(this.element);
    
    if (this.style.dropShadow) {
      if (typeof this.style.dropShadow === 'string') {
        // 文字列の場合はそのまま適用
        container.style('filter', this.style.dropShadow);
      } else if (typeof this.style.dropShadow === 'function') {
        // 関数の場合は、レイヤー全体に対して最初のfeatureの値を使用
        // TODO: より適切な処理が必要な場合は、サブクラスでオーバーライド
        container.style('filter', 'none'); // 関数型の場合は個別に処理
      } else {
        // DropShadowConfigオブジェクトの場合
        const shadow = this.style.dropShadow as DropShadowConfig;
        const filterValue = `drop-shadow(${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blur}px ${shadow.color})`;
        container.style('filter', filterValue);
      }
    } else {
      container.style('filter', 'none');
    }
  }
}