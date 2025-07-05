import { Selection } from 'd3-selection';
import { GeoProjection } from 'd3-geo';
import { BaseLayer } from './base-layer';
import { LayerAttr, LayerStyle, IGeojsonLayer } from '../types';
/**
 * テキストの位置指定タイプ
 */
export type TextPositionType = 'start' | 'middle' | 'end' | number;
/**
 * テキストの配置方向
 */
export type TextPlacementType = 'along' | 'horizontal' | 'perpendicular';
/**
 * LineTextLayerの初期化オプション
 */
export interface LineTextLayerOptions {
    /** GeoJSONデータ（LineString/MultiLineString） */
    data: GeoJSON.FeatureCollection | GeoJSON.Feature[];
    /** レイヤーの属性設定 */
    attr?: LayerAttr;
    /** レイヤーのCSS style属性設定 */
    style?: LayerStyle;
    /** テキストの内容を取得するプロパティ名（デフォルト: 'text'、次候補: 'name'） */
    textProperty?: string;
    /** テキストの位置（デフォルト: 'middle'） */
    position?: TextPositionType;
    /** テキストの配置方向（デフォルト: 'along'） */
    placement?: TextPlacementType;
    /** パーセンテージベースかどうか（デフォルト: true） */
    usePercentage?: boolean;
    /** X方向のオフセット（デフォルト: 0） */
    dx?: number | ((feature: GeoJSON.Feature, index: number) => number);
    /** Y方向のオフセット（デフォルト: 0） */
    dy?: number | ((feature: GeoJSON.Feature, index: number) => number);
    /** 追加の回転角度（デフォルト: 0） */
    rotate?: number | ((feature: GeoJSON.Feature, index: number) => number);
    /** テキストの長さ調整（デフォルト: "spacing"） */
    lengthAdjust?: "spacing" | "spacingAndGlyphs";
    /** ベースラインの位置（デフォルト: "middle"） */
    alignmentBaseline?: "auto" | "baseline" | "before-edge" | "text-before-edge" | "middle" | "central" | "after-edge" | "text-after-edge" | "ideographic" | "alphabetic" | "hanging" | "mathematical" | "inherit";
    /** テキストアンカー（デフォルト: "middle"） */
    textAnchor?: "start" | "middle" | "end" | "inherit";
    /** フォントファミリー（デフォルト: "メイリオ, Meiryo, 'ＭＳ Ｐゴシック', MS Gothic, sans-serif"） */
    fontFamily?: string | ((feature: GeoJSON.Feature, index: number) => string);
    /** フォントサイズ（デフォルト: 16） */
    fontSize?: number | string | ((feature: GeoJSON.Feature, index: number) => number | string);
    /** フォントウェイト（デフォルト: "normal"） */
    fontWeight?: "normal" | "bold" | "bolder" | "lighter" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | "inherit" | ((feature: GeoJSON.Feature, index: number) => string);
    /** 複数のテキストを配置する場合の位置配列 */
    multiplePositions?: TextPositionType[];
}
/**
 * LineString/MultiLineString上にテキストを配置するレイヤークラス
 */
export declare class LineTextLayer extends BaseLayer implements IGeojsonLayer {
    /** GeoJSONデータ */
    private data;
    /** 投影法 */
    private projection?;
    /** レイヤーグループ */
    private layerGroup?;
    /** テキストプロパティ名 */
    private textProperty;
    /** テキストの位置 */
    private position;
    /** テキストの配置方向 */
    private placement;
    /** パーセンテージベースかどうか */
    private usePercentage;
    /** X方向オフセット関数 */
    private dxFunction;
    /** Y方向オフセット関数 */
    private dyFunction;
    /** 追加回転角度関数 */
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
    /** 複数のテキスト位置 */
    private multiplePositions?;
    /**
     * LineTextLayerを初期化します
     * @param options - レイヤーの設定オプション
     */
    constructor(options: LineTextLayerOptions);
    /**
     * データを検証します
     * @param data - 検証対象のデータ
     * @private
     */
    private validateData;
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
     * 指定された位置でのテキスト配置情報を計算します
     * @private
     */
    private calculateTextPositions;
    /**
     * LineString上のテキスト配置情報を計算します
     * @private
     */
    private calculateLineStringTextPosition;
    /**
     * ライン上の指定位置での回転角度を計算します
     * @private
     */
    private calculateLineRotation;
    /**
     * GeoJSONデータを取得します
     * @returns 現在のGeoJSONデータ
     */
    getData(): GeoJSON.FeatureCollection;
}
