import { Selection } from 'd3-selection';
import { GeoProjection } from 'd3-geo';
import { BaseLayer } from '../core/base-layer';
import { LayerAttr, LayerStyle, IGeojsonLayer } from '../../types';
/**
 * NorthArrowLayerの初期化オプション
 */
export interface NorthArrowLayerOptions {
    /** 配置位置（ピクセル座標、デフォルト: { top: 20, right: 20 }） */
    position?: {
        top?: number;
        bottom?: number;
        left?: number;
        right?: number;
    };
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
export declare class NorthArrowLayer extends BaseLayer<LayerAttr, LayerStyle> implements IGeojsonLayer {
    /** 投影法 */
    private projection?;
    /** レイヤーグループ */
    private layerGroup?;
    /** 配置位置 */
    private position;
    /** 記号のサイズ */
    private size;
    /** 記号の色 */
    private color;
    /** Nラベル表示 */
    private showLabel;
    /** 真北回転の有効/無効 */
    private rotateToNorth;
    /**
     * NorthArrowLayerを初期化します
     * @param options - レイヤーの設定オプション
     */
    constructor(options?: NorthArrowLayerOptions);
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
     * SVGのviewBoxから地図のサイズを取得します
     * @returns [width, height]、取得できない場合はnull
     * @private
     */
    private getMapSize;
    /**
     * 配置位置での真北方向（画面上の角度）を計算します。
     * 配置点を逆投影し、わずかに北へ動かした点を再投影して方向を求める。
     * @param x - 配置点のx座標
     * @param y - 配置点のy座標
     * @returns 回転角（度）。計算できない場合は0
     * @private
     */
    private computeNorthAngle;
    /**
     * 方位記号を描画します
     * @private
     */
    private renderArrow;
}
