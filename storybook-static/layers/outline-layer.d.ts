import { Selection } from 'd3-selection';
import { GeoProjection } from 'd3-geo';
import { BaseLayer } from './base-layer';
import { LayerAttr, LayerStyle, IGeojsonLayer } from '../types';
/**
 * OutlineLayerの初期化オプション
 */
export interface OutlineLayerOptions {
    /** レイヤーの属性設定 */
    attr?: LayerAttr;
    /** レイヤーのCSS style属性設定 */
    style?: LayerStyle;
    /** クリップパスを作成するかどうか */
    createClipPath?: boolean;
    /** クリップパスのID（指定しない場合は自動生成） */
    clipPathId?: string;
}
/**
 * 地球の輪郭（アウトライン）を描画するレイヤークラス
 * D3のSphereジオメトリを使用して投影法の境界を描画します
 */
export declare class OutlineLayer extends BaseLayer implements IGeojsonLayer {
    /** パス生成器 */
    private path?;
    /** レイヤーグループ */
    private layerGroup?;
    /** クリップパスを作成するかどうか */
    private createClipPath;
    /** クリップパスのID */
    private clipPathId;
    /**
     * OutlineLayerを初期化します
     * @param options - レイヤーの設定オプション
     */
    constructor(options?: OutlineLayerOptions);
    /**
     * 投影法を設定します
     * @param projection - 地図投影法
     */
    setProjection(projection: GeoProjection): void;
    /**
     * レイヤーを描画します
     * @param container - 描画先のSVGコンテナ
     */
    render(container: Selection<SVGGElement, unknown, HTMLElement, any>): void;
    /**
     * アウトラインを描画します
     * @private
     */
    private renderOutline;
    /**
     * クリップパスIDを取得します
     * @returns クリップパスのID
     */
    getClipPathId(): string;
    /**
     * クリップパスURLを取得します
     * @returns クリップパスのURL文字列
     */
    getClipPathUrl(): string;
}
