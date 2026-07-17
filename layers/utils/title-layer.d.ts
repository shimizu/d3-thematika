import { Selection } from 'd3-selection';
import { BaseLayer } from '../core/base-layer';
import { LayerAttr, LayerStyle } from '../../types';
/**
 * タイトルの配置キーワード
 */
export type TitlePosition = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
/**
 * TitleLayerの初期化オプション
 */
export interface TitleLayerOptions {
    /** タイトル本文 */
    title: string;
    /** サブタイトル（タイトルの下に小さく表示） */
    subtitle?: string;
    /** 配置キーワードまたはピクセル座標（デフォルト: 'top-left'） */
    position?: TitlePosition | {
        top?: number;
        bottom?: number;
        left?: number;
        right?: number;
    };
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
export declare class TitleLayer extends BaseLayer<LayerAttr, LayerStyle> {
    /** タイトル本文 */
    private title;
    /** サブタイトル */
    private subtitle?;
    /** 配置指定 */
    private position;
    /** 地図端からの余白 */
    private margin;
    /** タイトルのフォントサイズ */
    private fontSize;
    /** サブタイトルのフォントサイズ */
    private subtitleFontSize;
    /** 文字色 */
    private color;
    /** ハローの色 */
    private haloColor;
    /** レイヤーグループ */
    private layerGroup?;
    /**
     * TitleLayerを初期化します
     * @param options - レイヤーの設定オプション
     */
    constructor(options: TitleLayerOptions);
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
     * 配置指定からアンカー座標とtext-anchorを解決します
     * @param width - 地図の幅
     * @param height - 地図の高さ
     * @returns 座標・text-anchor・縦位置（top/bottom）
     * @private
     */
    private resolvePosition;
    /**
     * タイトルを描画します
     * @private
     */
    private renderTitle;
}
