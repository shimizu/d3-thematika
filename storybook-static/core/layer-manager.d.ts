import { ILayer } from '../types';
import { GeoProjection } from 'd3-geo';
import { Selection } from 'd3-selection';
/**
 * レイヤーの管理を担当するクラス
 * レイヤーの追加、削除、更新、並び替えを行います
 */
export declare class LayerManager {
    /** レイヤーインスタンスを管理するマップ */
    private layerInstances;
    /** SVGコンテナ */
    private svgContainer?;
    /** 現在の投影法 */
    private projection?;
    /**
     * レイヤーマネージャーを初期化します
     */
    constructor();
    /**
     * SVGコンテナと投影法を設定します
     * @param svgContainer - SVGコンテナ
     * @param projection - 投影法
     */
    setContext(svgContainer: Selection<SVGGElement, unknown, HTMLElement, any>, projection: GeoProjection): void;
    /**
     * レイヤーインスタンスを追加します
     * @param id - レイヤーの一意識別子
     * @param layerInstance - レイヤーインスタンス
     */
    addLayer(id: string, layerInstance: ILayer): void;
    /**
     * レイヤーを削除します
     * @param id - 削除するレイヤーのID
     */
    removeLayer(id: string): void;
    /**
     * レイヤーの表示/非表示を切り替えます
     * @param id - 切り替えるレイヤーのID
     * @param visible - 表示状態
     */
    setLayerVisibility(id: string, visible: boolean): void;
    /**
     * レイヤーの描画順序を変更します
     * @param id - 並び替えるレイヤーのID
     * @param zIndex - 新しいzIndex値
     */
    setLayerZIndex(id: string, zIndex: number): void;
    /**
     * 指定されたレイヤーを取得します
     * @param id - レイヤーのID
     * @returns レイヤーインスタンス
     */
    getLayer(id: string): ILayer | undefined;
    /**
     * 全レイヤーのIDリストを取得します
     * @returns レイヤーIDの配列
     */
    getLayerIds(): string[];
    /**
     * 全レイヤーを削除します
     */
    clearAllLayers(): void;
    /**
     * 全レイヤーを再描画します
     */
    rerenderAllLayers(): void;
    /**
     * レイヤーの描画順序を最適化された方法で再整理します
     * 再描画せずにDOM要素の順序のみを変更します
     * @private
     */
    private reorderLayersOptimized;
    /**
     * 投影法を更新します
     * @param projection - 新しい投影法
     */
    updateProjection(projection: GeoProjection): void;
    /**
     * 次に使用するzIndex値を取得します
     * @private
     * @returns 次のzIndex値
     */
    private getNextZIndex;
    /**
     * レイヤーがIGeojsonLayerインターフェースを実装しているか確認します
     * @private
     * @param layer - 確認するレイヤー
     * @returns IGeojsonLayerの場合true
     */
    private isGeojsonLayer;
    /**
     * レイヤーのSVG要素を取得します
     * @private
     * @param layer - 対象のレイヤー
     * @returns SVG要素またはundefined
     */
    private getLayerElement;
}
