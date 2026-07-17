import { Selection } from 'd3-selection';
import { GeoProjection } from 'd3-geo';
import { BaseLayer } from '../core/base-layer';
import { LayerAttr, LayerStyle, IGeojsonLayer } from '../../types';
/**
 * TextLayerの初期化オプション
 */
export interface TextLayerOptions {
    /** GeoJSONデータ */
    data: GeoJSON.FeatureCollection | GeoJSON.Feature[];
    /** レイヤーの属性設定 */
    attr?: LayerAttr;
    /** レイヤーのCSS style属性設定 */
    style?: LayerStyle;
    /** テキスト内容を取得するプロパティ名または関数（デフォルト: 'name'） */
    textProperty?: string | ((feature: GeoJSON.Feature, index: number) => string);
}
/**
 * GeoJSONデータにテキストラベルを描画するレイヤークラス
 * ポイントならそのまま、ポリゴンやラインなら中心点にテキストを配置
 */
export declare class TextLayer extends BaseLayer<LayerAttr<GeoJSON.Feature>, LayerStyle<GeoJSON.Feature>> implements IGeojsonLayer {
    /** GeoJSONデータ */
    private data;
    /** 投影法 */
    private projection?;
    /** レイヤーグループ */
    private layerGroup?;
    /** テキスト取得関数 */
    private textAccessor;
    /**
     * TextLayerを初期化します
     * @param options - レイヤーの設定オプション
     */
    constructor(options: TextLayerOptions);
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
     * テキスト要素を描画します
     * @private
     */
    private renderTexts;
    /** text要素固有の属性は個々の要素に直接適用する */
    private static readonly TEXT_ELEMENT_ATTRS;
    protected applyAttributesToElements(elements: Selection<any, any, any, any>, layerGroup: Selection<SVGGElement, unknown, HTMLElement, any>): void;
    /**
     * GeoJSONデータを取得します
     * @returns 現在のGeoJSONデータ
     */
    getData(): GeoJSON.FeatureCollection;
}
