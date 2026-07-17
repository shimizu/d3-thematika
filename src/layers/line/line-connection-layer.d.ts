import { Selection } from 'd3-selection';
import { GeoProjection } from 'd3-geo';
import { BaseLayer } from '../core/base-layer';
import { LayerAttr, LayerStyle, ILineConnectionLayer, ArcControlPointType, ArcOffsetType } from '../../types';
import * as GeoJSON from 'geojson';
/**
 * LineConnectionLayerの初期化オプション
 */
export interface LineConnectionLayerOptions {
    /** GeoJSONデータ（LineString/MultiLineString） */
    data: GeoJSON.Feature | GeoJSON.Feature[] | GeoJSON.FeatureCollection;
    /** レイヤーの属性設定 */
    attr?: LayerAttr;
    /** レイヤーのCSS style属性設定 */
    style?: LayerStyle;
    /** ライン描画タイプ（デフォルト: 'straight'） */
    lineType?: 'straight' | 'arc' | 'smooth';
    /** アーク描画時の高さ（デフォルト: 0.3） */
    arcHeight?: number;
    /** アーク制御点の位置（デフォルト: 'center'） */
    arcControlPoint?: ArcControlPointType;
    /** アークオフセットの方向（デフォルト: 'perpendicular'） */
    arcOffset?: ArcOffsetType;
    /** 開始点に矢印を表示（デフォルト: false） */
    startArrow?: boolean;
    /** 終了点に矢印を表示（デフォルト: false） */
    endArrow?: boolean;
    /** 矢印のサイズ（デフォルト: 10） */
    arrowSize?: number;
    /** スムージング時のカーブタイプ（デフォルト: 'curveBasis'） */
    smoothType?: 'curveBasis' | 'curveCardinal' | 'curveCatmullRom' | 'curveLinear' | 'curveMonotoneX' | 'curveMonotoneY' | 'curveNatural' | 'curveStep' | 'curveStepAfter' | 'curveStepBefore';
}
/**
 * 複数点間をラインで接続するレイヤークラス
 * LineString/MultiLineString形式のGeoJSONデータをサポート
 */
export declare class LineConnectionLayer extends BaseLayer<LayerAttr<GeoJSON.Feature>, LayerStyle<GeoJSON.Feature>> implements ILineConnectionLayer {
    /** GeoJSONデータ */
    private data;
    /** パス生成器 */
    private path?;
    /** レイヤーグループ */
    private layerGroup?;
    /** ライン描画タイプ */
    private lineType;
    /** アーク描画時の高さ */
    private arcHeight;
    /** アーク制御点の位置 */
    private arcControlPoint;
    /** アークオフセットの方向 */
    private arcOffset;
    /** 開始点に矢印を表示 */
    private startArrow;
    /** 終了点に矢印を表示 */
    private endArrow;
    /** 矢印のサイズ */
    private arrowSize;
    /** スムージング時のカーブタイプ */
    private smoothType;
    /** 投影法 */
    private projection?;
    /** マーカー定義を格納するdefs要素 */
    private defs?;
    /**
     * LineConnectionLayerを初期化します
     * @param options - レイヤーの設定オプション
     */
    constructor(options: LineConnectionLayerOptions);
    /**
     * データを検証します
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
     * 矢印のマーカーを作成します
     * @private
     */
    private createArrowMarkers;
    /**
     * ライン描画を実行します（リファクタリング版：一括データバインディング）
     * @private
     */
    private renderLines;
    /**
     * 全フィーチャーから統一されたラインデータを準備します
     * @returns 統一されたラインデータの配列
     * @private
     */
    private prepareAllLinesData;
    /**
     * パス要素に矢印マーカーを適用します
     * @param paths - パス要素のselection
     * @private
     */
    private applyArrowMarkers;
    /**
     * 動的に色付きマーカーを作成します
     * @param markerId - マーカーID
     * @param color - 矢印の色
     * @param type - マーカータイプ（start/end）
     * @private
     */
    private createDynamicMarker;
    /**
     * LineStringをセグメントごとに描画します（旧実装 - 非推奨）
     * @deprecated 新しいrenderLines()メソッドで置き換えられました
     * @private
     */
    /**
     * セグメントのパスを生成します
     * @param start - 開始点の地理座標
     * @param end - 終了点の地理座標
     * @returns SVGパス文字列
     * @private
     */
    private generateSegmentPath;
    /**
     * アークパスを生成します
     * @param start - 開始点の地理座標
     * @param end - 終了点の地理座標
     * @param startPoint - 開始点のピクセル座標
     * @param endPoint - 終了点のピクセル座標
     * @returns SVGパス文字列
     * @private
     */
    private generateArcPath;
    /**
     * アーク制御点の基準位置を計算します
     * @private
     */
    private calculateBaseControlPoint;
    /**
     * 制御点にオフセットを適用します
     * @private
     */
    private applyArcOffset;
    /**
     * スムージングでLineStringを描画します（旧実装 - 非推奨）
     * @deprecated 新しいrenderLines()メソッドで置き換えられました
     * @private
     */
    /**
     * 地理座標系でスムージングパスを生成します
     * @private
     */
    private geoSmoothPath;
    /**
     * 設定されたカーブタイプに応じたカーブ関数を取得します
     * @private
     */
    private getCurveFunction;
    /**
     * ライン座標から統一されたパス文字列を生成します
     * @param coordinates - ライン座標配列
     * @returns SVGパス文字列
     * @private
     */
    private generateLinePath;
    /**
     * 直線パスを生成します
     * @param coordinates - ライン座標配列
     * @returns SVGパス文字列
     * @private
     */
    private generateStraightPath;
    /**
     * アークパスを生成します（セグメント毎にアーク処理）
     * @param coordinates - ライン座標配列
     * @returns SVGパス文字列
     * @private
     */
    private generateArcLinePath;
    /**
     * スムースパスを生成します
     * @param coordinates - ライン座標配列
     * @returns SVGパス文字列
     * @private
     */
    private generateSmoothPath;
    /**
     * GeoJSONデータを取得します
     * @returns GeoJSONデータ
     */
    getData(): GeoJSON.FeatureCollection;
}
