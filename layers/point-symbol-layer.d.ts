import { Selection } from 'd3-selection';
import { GeoProjection } from 'd3-geo';
import { SymbolType } from 'd3-shape';
import { BaseLayer } from './core/base-layer';
import { LayerAttr, LayerStyle, IGeojsonLayer } from '../types';
/**
 * PointSymbolLayerの初期化オプション
 */
export interface PointSymbolLayerOptions {
    /** GeoJSONデータ */
    data: GeoJSON.FeatureCollection | GeoJSON.Feature[];
    /** レイヤーの属性設定 */
    attr?: LayerAttr;
    /** レイヤーのCSS style属性設定 */
    style?: LayerStyle;
    /** シンボルのサイズ（固定値または関数） */
    size?: number | ((feature: GeoJSON.Feature, index: number) => number);
    /** シンボルタイプ（固定値または関数） */
    symbolType?: SymbolType | ((feature: GeoJSON.Feature, index: number) => SymbolType);
}
/**
 * GeoJSONデータをシンボル要素として描画するレイヤークラス
 * ポイントならそのまま、ポリゴンやラインなら中心点にシンボルを配置
 */
export declare class PointSymbolLayer extends BaseLayer implements IGeojsonLayer {
    /** GeoJSONデータ */
    private data;
    /** 投影法 */
    private projection?;
    /** レイヤーグループ */
    private layerGroup?;
    /** シンボルのサイズ設定 */
    private sizeFunction;
    /** シンボルタイプ設定 */
    private symbolTypeFunction;
    /**
     * PointSymbolLayerを初期化します
     * @param options - レイヤーの設定オプション
     */
    constructor(options: PointSymbolLayerOptions);
    /**
     * レイヤーを描画します
     * @param container - 描画先のSVGコンテナ
     */
    render(container: Selection<SVGGElement, unknown, HTMLElement, any>): void;
    /**
     * 投影法を設定します
     * @param projection - 新しい投影法
     */
    setProjection(projection: GeoProjection): void;
    /**
     * シンボルを描画します
     * @private
     */
    private renderSymbols;
    /**
     * GeoJSONデータを取得します
     * @returns 現在のGeoJSONデータ
     */
    getData(): GeoJSON.FeatureCollection;
}
