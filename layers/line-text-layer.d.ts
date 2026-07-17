import { Selection } from 'd3-selection';
import { GeoProjection } from 'd3-geo';
import { BaseLayer } from './core/base-layer';
import { LayerAttr, LayerStyle, IGeojsonLayer, ArcControlPointType, ArcOffsetType } from '../types';
import * as GeoJSON from 'geojson';
/**
 * LineTextLayerの初期化オプション
 */
export interface LineTextLayerOptions {
    /** GeoJSONデータ（LineString/MultiLineString） */
    data: GeoJSON.Feature | GeoJSON.Feature[] | GeoJSON.FeatureCollection;
    /** レイヤーの属性設定 */
    attr?: LayerAttr;
    /** レイヤーのCSS style属性設定 */
    style?: LayerStyle;
    /** テキストの内容を取得するプロパティ名（デフォルト: 'text'、次候補: 'name'） */
    textProperty?: string;
    /** フォントファミリー（デフォルト: "メイリオ, Meiryo, 'ＭＳ Ｐゴシック', MS Gothic, sans-serif"） */
    fontFamily?: string | ((feature: GeoJSON.Feature, index: number) => string);
    /** フォントサイズ（デフォルト: 16） */
    fontSize?: number | string | ((feature: GeoJSON.Feature, index: number) => number | string);
    /** フォントウェイト（デフォルト: "normal"） */
    fontWeight?: "normal" | "bold" | "bolder" | "lighter" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | "inherit" | ((feature: GeoJSON.Feature, index: number) => string);
    /** テキストアンカー（デフォルト: "middle"） */
    textAnchor?: "start" | "middle" | "end" | "inherit";
    /** textPath使用時のstartOffset（デフォルト: "50%"） */
    startOffset?: string | number;
    /** ライン描画タイプ（デフォルト: 'straight'） */
    lineType?: 'straight' | 'arc' | 'smooth';
    /** アーク描画時の高さ（デフォルト: 0.3） */
    arcHeight?: number;
    /** アーク制御点の位置（デフォルト: 'center'） */
    arcControlPoint?: ArcControlPointType;
    /** アークオフセットの方向（デフォルト: 'perpendicular'） */
    arcOffset?: ArcOffsetType;
    /** スムージング時のカーブタイプ（デフォルト: 'curveBasis'） */
    smoothType?: 'curveBasis' | 'curveCardinal' | 'curveCatmullRom' | 'curveLinear' | 'curveMonotoneX' | 'curveMonotoneY' | 'curveNatural' | 'curveStep' | 'curveStepAfter' | 'curveStepBefore';
    /** ガイドパスを表示するかどうか（デフォルト: false） */
    showGuidePath?: boolean;
    /** ガイドパスのスタイル設定 */
    guidePathStyle?: LayerAttr;
    /** パスに沿ってテキストを配置するかどうか（デフォルト: true） */
    followPath?: boolean;
    /** テキストの向きを反転させるかどうか（デフォルト: false） */
    flipText?: boolean;
    /** X方向のオフセット（デフォルト: 0） */
    dx?: number | ((feature: GeoJSON.Feature, index: number) => number);
    /** Y方向のオフセット（デフォルト: 0） */
    dy?: number | ((feature: GeoJSON.Feature, index: number) => number);
}
/**
 * LineString/MultiLineString上にテキストを配置するレイヤークラス
 * textPathを使用してパス沿いにテキストを配置
 */
export declare class LineTextLayer extends BaseLayer implements IGeojsonLayer {
    /** GeoJSONデータ */
    private data;
    /** パス生成器 */
    private path?;
    /** レイヤーグループ */
    private layerGroup?;
    /** 投影法 */
    private projection?;
    /** テキストプロパティ名 */
    private textProperty;
    /** フォントファミリー関数 */
    private fontFamilyFunction;
    /** フォントサイズ関数 */
    private fontSizeFunction;
    /** フォントウェイト関数 */
    private fontWeightFunction;
    /** テキストアンカー */
    private textAnchor;
    /** textPath用startOffset */
    private startOffset;
    /** ライン描画タイプ */
    private lineType;
    /** アーク描画時の高さ */
    private arcHeight;
    /** アーク制御点の位置 */
    private arcControlPoint;
    /** アークオフセットの方向 */
    private arcOffset;
    /** スムージング時のカーブタイプ */
    private smoothType;
    /** ガイドパス表示フラグ */
    private showGuidePath;
    /** ガイドパスのスタイル */
    private guidePathStyle;
    /** パスに沿ってテキストを配置するかどうか */
    private followPath;
    /** テキストの向きを反転させるかどうか */
    private flipText;
    /** X方向オフセット関数 */
    private dxFunction;
    /** Y方向オフセット関数 */
    private dyFunction;
    /**
     * LineTextLayerを初期化します
     * @param options - レイヤーの設定オプション
     */
    constructor(options: LineTextLayerOptions);
    /**
     * データを検証します（line-connection-layerと同じ）
     * @param data - 検証対象のデータ
     * @private
     */
    private validateData;
    /**
     * 座標配列を検証します
     * @private
     */
    private validateCoordinates;
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
     * 統一されたテキスト描画処理（リファクタリング版）
     * @private
     */
    private renderUnifiedText;
    /**
     * 全フィーチャーから統一されたラインテキストデータを準備します
     * @returns 統一されたラインテキストデータの配列
     * @private
     */
    private prepareAllTextLinesData;
    /**
     * 個別のラインテキストデータを作成します
     * @private
     */
    private createLineTextData;
    /**
     * textPathを使用してテキストを描画します（リファクタリング版）
     * @private
     */
    private renderTextPathUnified;
    /**
     * シンプルテキストを描画します（リファクタリング版）
     * @private
     */
    private renderSimpleTextUnified;
    /**
     * デバッグ用ガイドパスを描画します
     * @private
     */
    private renderGuidePaths;
    /**
     * 単一LineString用のガイドパスを描画します
     * @private
     */
    private renderGuideLineString;
    /**
     * セグメントのパスを生成します（line-connection-layerから移植）
     * @param start - 開始点の地理座標
     * @param end - 終了点の地理座標
     * @returns SVGパス文字列
     * @private
     */
    private generateSegmentPath;
    /**
     * アークパスを生成します（line-connection-layerから移植）
     * @param start - 開始点の地理座標
     * @param end - 終了点の地理座標
     * @param startPoint - 開始点のピクセル座標
     * @param endPoint - 終了点のピクセル座標
     * @returns SVGパス文字列
     * @private
     */
    private generateArcPath;
    /**
     * アーク制御点の基準位置を計算します（line-connection-layerから移植）
     * @private
     */
    private calculateBaseControlPoint;
    /**
     * 制御点にオフセットを適用します（line-connection-layerから移植）
     * @private
     */
    private applyArcOffset;
    /**
     * 地理座標系でスムージングパスを生成します（line-connection-layerから移植）
     * @private
     */
    private geoSmoothPath;
    /**
     * 設定されたカーブタイプに応じたカーブ関数を取得します（line-connection-layerから移植）
     * @private
     */
    private getCurveFunction;
    /**
     * LineString用のパス文字列を生成します
     * @private
     */
    private generateLineStringPath;
    /**
     * SVGパス文字列を逆順にします
     * @param pathString - 元のパス文字列
     * @returns 逆順にされたパス文字列
     * @private
     */
    private reversePath;
    /**
     * GeoJSONデータを取得します
     * @returns GeoJSONデータ
     */
    getData(): GeoJSON.FeatureCollection;
}
