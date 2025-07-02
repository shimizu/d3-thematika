import { Selection, select } from 'd3-selection';
import { ILayer, LayerAttr, LayerStyle } from '../types';

/**
 * SVG属性のマッピング定義
 */
interface AttributeMapping {
  key: keyof LayerAttr;
  method: 'attr' | 'style';
  attrName?: string;
}

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
  /** レイヤーのSVG属性設定（d3命名規則） */
  protected attr: LayerAttr;
  /** レイヤーのCSS style属性設定（d3命名規則） */
  protected style?: LayerStyle;
  /** レイヤーのSVGグループ要素 */
  protected element?: SVGGElement;

  /** 共通のSVG属性マッピング */
  protected static readonly ATTRIBUTE_MAPPINGS: AttributeMapping[] = [
    { key: 'fill', method: 'attr' },
    { key: 'fillOpacity', method: 'attr', attrName: 'fill-opacity' },
    { key: 'stroke', method: 'attr' },
    { key: 'strokeWidth', method: 'attr', attrName: 'stroke-width' },
    { key: 'strokeDasharray', method: 'attr', attrName: 'stroke-dasharray' },
    { key: 'opacity', method: 'attr' },
    { key: 'filter', method: 'attr' },
    { key: 'clipPath', method: 'attr', attrName: 'clip-path' }
  ];

  /**
   * 基底レイヤーを初期化します
   * @param id - レイヤーの一意識別子
   * @param attr - レイヤーのSVG属性設定
   * @param style - レイヤーのCSS style属性設定（オプション）
   */
  constructor(id: string, attr: LayerAttr = {}, style?: LayerStyle) {
    this.id = id;
    this.attr = {
      fill: '#cccccc',
      stroke: '#333333',
      strokeWidth: 0.5,
      opacity: 1,
      ...attr
    };
    this.style = style;
  }

  /**
   * レイヤーを描画します（サブクラスで実装）
   * @param container - 描画先のSVGコンテナ
   */
  abstract render(container: Selection<SVGGElement, unknown, HTMLElement, any>): void;


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
   * レイヤーのD3セレクションを取得します
   * @returns レイヤーグループのD3セレクション、未描画の場合はnull
   */
  getLayerGroup(): Selection<SVGGElement, unknown, HTMLElement, any> | null {
    if (!this.element) return null;
    return select(this.element) as unknown as Selection<SVGGElement, unknown, HTMLElement, any>;
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
      .attr('class', `thematika-layer thematika-layer--${this.id}`)
      .style('display', this.visible ? '' : 'none');

    this.element = group.node()!;
    
    return group;
  }

  /**
   * 単一要素にSVG属性を適用します
   * @param element - 対象要素
   * @param data - データ（関数型属性用）
   * @param index - インデックス（関数型属性用）
   * @protected
   */
  protected applyAttributesToElement(
    element: Selection<any, any, any, any>, 
    data?: any, 
    index?: number
  ): void {
    BaseLayer.ATTRIBUTE_MAPPINGS.forEach(({ key, method, attrName }) => {
      const value = this.attr[key];
      const finalAttrName = attrName || key;
      
      if (value !== undefined) {
        const finalValue = typeof value === 'function' ? value(data || {}, index || 0) : value;
        element[method](finalAttrName, finalValue);
      }
    });
  }

  /**
   * 単一要素にCSS style属性を適用します
   * @param element - 対象要素
   * @param data - データ（関数型スタイル用）
   * @param index - インデックス（関数型スタイル用）
   * @protected
   */
  protected applyStylesToElement(
    element: Selection<any, any, any, any>, 
    data?: any, 
    index?: number
  ): void {
    if (this.style) {
      Object.entries(this.style).forEach(([property, value]) => {
        if (value !== undefined) {
          const finalValue = typeof value === 'function' ? value(data || {}, index || 0) : value;
          element.style(property, finalValue);
        }
      });
    }
  }

  /**
   * 単一要素にSVG属性とCSS style属性の両方を適用します
   * @param element - 対象要素
   * @param data - データ（関数型用）
   * @param index - インデックス（関数型用）
   * @protected
   */
  protected applyAllStylesToElement(
    element: Selection<any, any, any, any>, 
    data?: any, 
    index?: number
  ): void {
    this.applyAttributesToElement(element, data, index);
    this.applyStylesToElement(element, data, index);
  }

  /**
   * 複数要素にSVG属性を適用します（GeojsonLayer用）
   * @param elements - 対象要素群
   * @param layerGroup - レイヤーグループ
   * @protected
   */
  protected applyAttributesToElements(
    elements: Selection<any, any, any, any>, 
    layerGroup: Selection<SVGGElement, unknown, HTMLElement, any>
  ): void {
    BaseLayer.ATTRIBUTE_MAPPINGS.forEach(({ key, method, attrName }) => {
      const value = this.attr[key];
      const finalAttrName = attrName || key;
      
      // clipPathは常にレイヤーグループに適用
      if (key === 'clipPath') {
        if (value !== undefined) {
          const finalValue = typeof value === 'function' ? value({} as any, 0) : value;
          layerGroup[method](finalAttrName, finalValue);
        }
      } else if (typeof value === 'function') {
        // 関数型の場合は個別の要素に適用
        elements[method](finalAttrName, (d: any, i: number) => value(d, i));
      } else if (value !== undefined) {
        // 非関数型の場合はレイヤーグループに適用
        layerGroup[method](finalAttrName, value);
      }
    });
  }

  /**
   * 複数要素にCSS style属性を適用します（GeojsonLayer用）
   * @param elements - 対象要素群
   * @param layerGroup - レイヤーグループ
   * @protected
   */
  protected applyStylesToElements(
    elements: Selection<any, any, any, any>, 
    layerGroup: Selection<SVGGElement, unknown, HTMLElement, any>
  ): void {
    if (this.style) {
      Object.entries(this.style).forEach(([property, value]) => {
        if (value !== undefined) {
          if (typeof value === 'function') {
            // 関数型の場合は個別の要素に適用
            elements.style(property, (d: any, i: number) => value(d, i));
          } else {
            // 非関数型の場合はレイヤーグループに適用
            layerGroup.style(property, value);
          }
        }
      });
    }
  }

  /**
   * 複数要素にSVG属性とCSS style属性の両方を適用します（GeojsonLayer用）
   * @param elements - 対象要素群
   * @param layerGroup - レイヤーグループ
   * @protected
   */
  protected applyAllStylesToElements(
    elements: Selection<any, any, any, any>, 
    layerGroup: Selection<SVGGElement, unknown, HTMLElement, any>
  ): void {
    this.applyAttributesToElements(elements, layerGroup);
    this.applyStylesToElements(elements, layerGroup);
  }

}