import { Selection } from 'd3-selection';
import { ILayer, LayerAttr, LayerStyle } from '../types';
/**
 * 全レイヤーの基底となる抽象クラス
 * 共通の機能と振る舞いを定義します
 */
export declare abstract class BaseLayer implements ILayer {
    /** レイヤーの一意識別子 */
    readonly id: string;
    /** レイヤーの表示状態 */
    visible: boolean;
    /** レイヤーの描画順序 */
    zIndex: number;
    /** レイヤーのSVG属性設定（d3命名規則） */
    protected attr: LayerAttr;
    /** レイヤーのCSS style属性設定（d3命名規則） */
    protected style?: LayerStyle;
    /** レイヤーのSVGグループ要素 */
    protected element?: SVGGElement;
    /**
     * 基底レイヤーを初期化します
     * @param id - レイヤーの一意識別子
     * @param attr - レイヤーのSVG属性設定
     * @param style - レイヤーのCSS style属性設定（オプション）
     */
    constructor(id: string, attr?: LayerAttr, style?: LayerStyle);
    /**
     * レイヤーを描画します（サブクラスで実装）
     * @param container - 描画先のSVGコンテナ
     */
    abstract render(container: Selection<SVGGElement, unknown, HTMLElement, any>): void;
    /**
     * レイヤーを削除します
     */
    destroy(): void;
    /**
     * 表示状態を設定します
     * @param visible - 表示状態
     */
    setVisible(visible: boolean): void;
    /**
     * 描画順序を設定します
     * @param zIndex - 新しいzIndex値
     */
    setZIndex(zIndex: number): void;
    /**
     * レイヤーが描画されているかを確認します
     * @returns 描画状態
     */
    isRendered(): boolean;
    /**
     * レイヤーのD3セレクションを取得します
     * @returns レイヤーグループのD3セレクション、未描画の場合はnull
     */
    getLayerGroup(): Selection<SVGGElement, unknown, HTMLElement, any> | null;
    /**
     * 表示状態を更新します
     * @protected
     */
    protected updateVisibility(): void;
    /**
     * レイヤーグループ要素を作成します
     * @param container - 親コンテナ
     * @returns 作成されたレイヤーグループ
     * @protected
     */
    protected createLayerGroup(container: Selection<SVGGElement, unknown, HTMLElement, any>): Selection<SVGGElement, unknown, HTMLElement, any>;
    /**
     * 単一要素にSVG属性を適用します
     * @param element - 対象要素
     * @protected
     */
    protected applyAttributesToElement(element: Selection<any, any, any, any>, layerGroup: Selection<SVGGElement, unknown, HTMLElement, any>): void;
    /**
     * 単一要素にCSS style属性を適用します
     * @param element - 対象要素
     * @protected
     */
    protected applyStylesToElement(element: Selection<any, any, any, any>, layerGroup: Selection<SVGGElement, unknown, HTMLElement, any>): void;
    /**
     * 単一要素にSVG属性とCSS style属性の両方を適用します
     * @param element - 対象要素
     * @param layerGroup - レイヤーグループ
     * @protected
     */
    protected applyAllStylesToElement(element: Selection<any, any, any, any>, layerGroup: Selection<SVGGElement, unknown, HTMLElement, any>): void;
    /**
     * 複数要素にSVG属性を適用します
     * @param elements - 対象要素群
     * @param layerGroup - レイヤーグループ
     * @protected
     */
    protected applyAttributesToElements(elements: Selection<any, any, any, any>, layerGroup: Selection<SVGGElement, unknown, HTMLElement, any>): void;
    /**
     * 複数要素にCSS style属性を適用します
     * @param elements - 対象要素群
     * @param layerGroup - レイヤーグループ
     * @protected
     */
    protected applyStylesToElements(elements: Selection<any, any, any, any>, layerGroup: Selection<SVGGElement, unknown, HTMLElement, any>): void;
    /**
     * 複数要素にSVG属性とCSS style属性の両方を適用します（GeojsonLayer用）
     * @param elements - 対象要素群
     * @param layerGroup - レイヤーグループ
     * @protected
     */
    protected applyAllStylesToElements(elements: Selection<any, any, any, any>, layerGroup: Selection<SVGGElement, unknown, HTMLElement, any>): void;
}
