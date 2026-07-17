import { Selection } from 'd3-selection';
import { GeoProjection } from 'd3-geo';
import { BaseLayer } from '../core/base-layer';
import { LayerAttr, LayerStyle, IGeojsonLayer } from '../../types';
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
export declare class ScaleBarLayer extends BaseLayer<LayerAttr, LayerStyle> implements IGeojsonLayer {
    /** 投影法 */
    private projection?;
    /** レイヤーグループ */
    private layerGroup?;
    /** 配置位置 */
    private position;
    /** バーの最大幅 */
    private maxWidth;
    /** 距離の単位 */
    private units;
    /** バーの分割数 */
    private segments;
    /** バーの高さ */
    private barHeight;
    /** ラベルのフォントサイズ */
    private fontSize;
    /**
     * ScaleBarLayerを初期化します
     * @param options - レイヤーの設定オプション
     */
    constructor(options?: ScaleBarLayerOptions);
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
     * 距離をキリの良い値（1/2/5×10^n）に切り下げます
     * @param distance - 距離
     * @returns 丸められた距離
     * @private
     */
    private static niceDistance;
    /**
     * SVGのviewBoxから地図のサイズを取得します
     * @returns [width, height]、取得できない場合はnull
     * @private
     */
    private getMapSize;
    /**
     * スケールバーを描画します
     * @private
     */
    private renderScaleBar;
}
