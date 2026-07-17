import { Selection } from 'd3-selection';
import { GeoProjection } from 'd3-geo';
import { BaseLayer } from '../core/base-layer';
import { LayerAttr, LayerStyle, ILineTaperedLayer } from '../../types';
import * as GeoJSON from 'geojson';
/**
 * LineTaperedLayerの初期化オプション
 */
export interface LineTaperedLayerOptions {
    /** GeoJSONデータ（LineString/MultiLineString） */
    data: GeoJSON.Feature | GeoJSON.Feature[] | GeoJSON.FeatureCollection;
    /** レイヤーの属性設定 */
    attr?: LayerAttr;
    /** レイヤーのCSS style属性設定 */
    style?: LayerStyle;
    /** 始点のサイズ（ピクセル、デフォルト: 10） */
    startSize?: number | ((d: GeoJSON.Feature, i: number) => number);
    /** 終点のサイズ（ピクセル、デフォルト: 2） */
    endSize?: number | ((d: GeoJSON.Feature, i: number) => number);
    /** アークの高さ係数（デフォルト: 0.3） */
    arcHeight?: number;
    /** アークの向きを反転するか（デフォルト: false） */
    flipArc?: boolean | ((d: GeoJSON.Feature, i: number) => boolean);
    /** 開始点に矢印を表示（デフォルト: false） */
    startArrow?: boolean;
    /** 終了点に矢印を表示（デフォルト: false） */
    endArrow?: boolean;
    /** 矢印のサイズ（デフォルト: 10） */
    arrowSize?: number;
    /** 矢印の横幅（デフォルト: 端点サイズと同じ） */
    arrowWidth?: number;
}
/**
 * テーパー（太さが変化する）アーク型ポリゴンで始点と終点を結ぶレイヤークラス
 * LineString/MultiLineString形式のGeoJSONデータをサポート
 * 中間頂点は無視し、最初と最後の座標のみを使用
 */
export declare class LineTaperedLayer extends BaseLayer<LayerAttr<GeoJSON.Feature>, LayerStyle<GeoJSON.Feature>> implements ILineTaperedLayer {
    /** GeoJSONデータ */
    private data;
    /** パス生成器 */
    private path?;
    /** レイヤーグループ */
    private layerGroup?;
    /** 始点のサイズ */
    private startSize;
    /** 終点のサイズ */
    private endSize;
    /** アークの高さ係数 */
    private arcHeight;
    /** アークの向きを反転するか */
    private flipArc;
    /** 開始点に矢印を表示 */
    private startArrow;
    /** 終了点に矢印を表示 */
    private endArrow;
    /** 矢印のサイズ */
    private arrowSize;
    /** 矢印の横幅 */
    private arrowWidth?;
    /** 投影法 */
    private projection?;
    /**
     * LineTaperedLayerを初期化します
     * @param options - レイヤーの設定オプション
     */
    constructor(options: LineTaperedLayerOptions);
    /**
     * データを検証します
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
     * テーパーライン描画を実行します
     * @private
     */
    private renderTaperedLines;
    /**
     * 全フィーチャーから統一されたテーパーラインデータを準備します
     * @returns テーパーラインデータの配列
     * @private
     */
    private prepareAllLinesData;
    /**
     * テーパーアークポリゴンのSVGパスを生成します
     * @param start - 始点の地理座標
     * @param end - 終点の地理座標
     * @param feature - フィーチャー情報
     * @param featureIndex - フィーチャーインデックス
     * @returns SVGパス文字列
     * @private
     */
    private generateTaperedPolygon;
    /**
     * GeoJSONデータを取得します
     * @returns GeoJSONデータ
     */
    getData(): GeoJSON.FeatureCollection;
}
