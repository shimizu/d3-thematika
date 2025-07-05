import { Selection } from 'd3-selection';
import { GeoProjection } from 'd3-geo';
import { BaseLayer } from './base-layer';
import { LayerAttr, LayerStyle, IGeojsonLayer } from '../types';
/**
 * GraticuleLayerの初期化オプション
 */
export interface GraticuleLayerOptions {
    /** レイヤーのSVG属性設定 */
    attr?: LayerAttr;
    /** レイヤーのCSS style属性設定 */
    style?: LayerStyle;
    /** 経緯線の間隔 [経度間隔, 緯度間隔] (度) */
    step?: [number, number];
    /** 経緯線の範囲 [[西端, 南端], [東端, 北端]] (度) */
    extent?: [[number, number], [number, number]];
}
/**
 * 経緯線（グラティキュール）を描画するレイヤークラス
 * D3のgeoGraticuleを使用して経緯線網を描画します
 */
export declare class GraticuleLayer extends BaseLayer implements IGeojsonLayer {
    /** パス生成器 */
    private path?;
    /** レイヤーグループ */
    private layerGroup?;
    /** 経緯線の間隔 */
    private step;
    /** 経緯線の範囲 */
    private extent?;
    /**
     * GraticuleLayerを初期化します
     * @param options - レイヤーの設定オプション
     */
    constructor(options?: GraticuleLayerOptions);
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
     * 経緯線を描画します
     * @private
     */
    private renderGraticule;
}
