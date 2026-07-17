import { Selection } from 'd3-selection';
import { GeoProjection } from 'd3-geo';
import { BaseLayer } from '../core/base-layer';
import { LayerAttr, LayerStyle, IGeojsonLayer } from '../../types';
/**
 * GeojsonLayerの初期化オプション
 */
export interface GeojsonLayerOptions {
    /** GeoJSONデータ */
    data: GeoJSON.FeatureCollection | GeoJSON.Feature[];
    /** レイヤーのSVG属性設定 */
    attr?: LayerAttr;
    /** レイヤーのCSS style属性設定 */
    style?: LayerStyle;
}
/**
 * GeoJSONデータを描画するレイヤークラス
 */
export declare class GeojsonLayer extends BaseLayer<LayerAttr<GeoJSON.Feature>, LayerStyle<GeoJSON.Feature>> implements IGeojsonLayer {
    /** GeoJSONデータ */
    private data;
    /** パス生成器 */
    private path?;
    /** レイヤーグループ */
    private layerGroup?;
    /**
     * GeoJSONレイヤーを初期化します
     * @param options - レイヤーの設定オプション
     */
    constructor(options: GeojsonLayerOptions);
    /**
     * ワインディング順序が逆（CCW外側リング）の疑いがあるポリゴンを検出して警告します。
     * D3はGeoJSON仕様(RFC7946)と逆に外側リングが時計回り(CW)であることを期待するため、
     * CCWのポリゴンは球面上で「そのポリゴンの外側全体」と解釈され、
     * geoAreaが半球(2πステラジアン)を超える巨大な面積になる。
     * @private
     */
    private warnIfInvalidWinding;
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
     * フィーチャーを描画します
     * @private
     */
    private renderFeatures;
    /**
     * GeoJSONデータを取得します
     * @returns 現在のGeoJSONデータ
     */
    getData(): GeoJSON.FeatureCollection;
}
