import { Selection } from 'd3-selection';
import { GeoProjection } from 'd3-geo';
import { BaseLayer } from './base-layer';
import { IGeojsonLayer, PointSpikeLayerOptions } from '../types';
/**
 * GeoJSONデータをスパイク要素として描画するレイヤークラス
 * ポイントならそのまま、ポリゴンやラインなら中心点にスパイクを配置
 */
export declare class PointSpikeLayer extends BaseLayer implements IGeojsonLayer {
    /** GeoJSONデータ */
    private data;
    /** 投影法 */
    private projection?;
    /** レイヤーグループ */
    private layerGroup?;
    /** スパイクの長さ設定 */
    private lengthFunction;
    /** スパイクの方向 */
    private direction;
    /**
     * PointSpikeLayerを初期化します
     * @param options - レイヤーの設定オプション
     */
    constructor(options: PointSpikeLayerOptions);
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
     * スパイクを描画します
     * @private
     */
    private renderSpikes;
    /**
     * スパイクのSVGパス文字列を生成します
     * @param length - スパイクの長さ
     * @returns SVGパス文字列
     * @private
     */
    private generateSpikePath;
    /**
     * GeoJSONデータを取得します
     * @returns 現在のGeoJSONデータ
     */
    getData(): GeoJSON.FeatureCollection;
}
