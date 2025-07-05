import { Selection } from 'd3-selection';
import { GeoProjection } from 'd3-geo';
import { BaseLayer } from './base-layer';
import { LayerAttr, LayerStyle, IGeojsonLayer } from '../types';
/**
 * PointTextLayerの初期化オプション
 */
export interface PointTextLayerOptions {
    /** GeoJSONデータ */
    data: GeoJSON.FeatureCollection | GeoJSON.Feature[];
    /** レイヤーの属性設定 */
    attr?: LayerAttr;
    /** レイヤーのCSS style属性設定 */
    style?: LayerStyle;
    /** テキストの内容を取得するプロパティ名（デフォルト: 'text'、次候補: 'name'） */
    textProperty?: string;
    /** X方向のオフセット（デフォルト: 0） */
    dx?: number | ((feature: GeoJSON.Feature, index: number) => number);
    /** Y方向のオフセット（デフォルト: 0） */
    dy?: number | ((feature: GeoJSON.Feature, index: number) => number);
    /** テキストの回転角度（デフォルト: 0） */
    rotate?: number | ((feature: GeoJSON.Feature, index: number) => number);
    /** テキストの長さ調整（デフォルト: "spacing"） */
    lengthAdjust?: "spacing" | "spacingAndGlyphs";
    /** ベースラインの位置（デフォルト: "middle"） */
    alignmentBaseline?: "auto" | "baseline" | "before-edge" | "text-before-edge" | "middle" | "central" | "after-edge" | "text-after-edge" | "ideographic" | "alphabetic" | "hanging" | "mathematical" | "inherit";
    /** テキストアンカー（デフォルト: "start"） */
    textAnchor?: "start" | "middle" | "end" | "inherit";
    /** フォントファミリー（デフォルト: "メイリオ, Meiryo, 'ＭＳ Ｐゴシック', MS Gothic, sans-serif"） */
    fontFamily?: string | ((feature: GeoJSON.Feature, index: number) => string);
    /** フォントサイズ（デフォルト: 16） */
    fontSize?: number | string | ((feature: GeoJSON.Feature, index: number) => number | string);
    /** フォントウェイト（デフォルト: "normal"） */
    fontWeight?: "normal" | "bold" | "bolder" | "lighter" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | "inherit" | ((feature: GeoJSON.Feature, index: number) => string);
}
/**
 * GeoJSONデータをテキスト要素として描画するレイヤークラス
 * ポイントならそのまま、ポリゴンやラインなら中心点にテキストを配置
 */
export declare class PointTextLayer extends BaseLayer implements IGeojsonLayer {
    /** GeoJSONデータ */
    private data;
    /** 投影法 */
    private projection?;
    /** レイヤーグループ */
    private layerGroup?;
    /** テキストプロパティ名 */
    private textProperty;
    /** X方向オフセット関数 */
    private dxFunction;
    /** Y方向オフセット関数 */
    private dyFunction;
    /** 回転角度関数 */
    private rotateFunction;
    /** テキスト長さ調整 */
    private lengthAdjust;
    /** ベースライン位置 */
    private alignmentBaseline;
    /** テキストアンカー */
    private textAnchor;
    /** フォントファミリー関数 */
    private fontFamilyFunction;
    /** フォントサイズ関数 */
    private fontSizeFunction;
    /** フォントウェイト関数 */
    private fontWeightFunction;
    /**
     * PointTextLayerを初期化します
     * @param options - レイヤーの設定オプション
     */
    constructor(options: PointTextLayerOptions);
    /**
     * レイヤーを描画します
     * @param container - 描画先のSVGコンテナ
     */
    render(container: Selection<SVGGElement, unknown, HTMLElement, any>): void;
    /**
     * フィーチャーにイベントリスナーを追加します
     * @param eventType - イベントタイプ
     * @param handler - イベントハンドラー
     */
    on(eventType: string, handler: (event: Event, data: GeoJSON.Feature) => void): void;
    /**
     * 投影法を設定します
     * @param projection - 新しい投影法
     */
    setProjection(projection: GeoProjection): void;
    /**
     * テキストを描画します
     * @private
     */
    private renderTexts;
    /**
     * GeoJSONデータを取得します
     * @returns 現在のGeoJSONデータ
     */
    getData(): GeoJSON.FeatureCollection;
}
