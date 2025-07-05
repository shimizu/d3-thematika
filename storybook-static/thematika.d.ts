import { GeoProjection } from 'd3-geo';
import { ThematikaOptions, ILayer } from './types';
import { LayerManager } from './core/layer-manager';
/**
 * 主題図描画を行うメインクラス（リファクタリング版）
 * モジュール化された構造で、拡張性と保守性を向上させています
 */
export declare class Map {
    /** DOM要素を選択するためのD3セレクション */
    private container;
    /** SVG要素のD3セレクション */
    private svg;
    /** メインのSVGグループ要素 */
    private svgGroup;
    /** 地図投影法 */
    private projection;
    /** レイヤーマネージャーインスタンス */
    private layerManager;
    /** 地図の幅 */
    private width;
    /** 地図の高さ */
    private height;
    /**
     * Mapインスタンスを作成します
     * @param options - 主題図の設定オプション
     */
    constructor(options: ThematikaOptions);
    /**
     * 主題図にレイヤーを追加します
     * @param id - レイヤーの一意識別子
     * @param layer - レイヤーインスタンス
     */
    addLayer(id: string, layer: ILayer): void;
    /**
     * 指定されたIDのレイヤーを削除します
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
     * 地図の投影法を変更します
     * @param projection - 新しい投影法オブジェクト
     */
    setProjection(projection: GeoProjection): void;
    /**
     * 地図のサイズを変更します
     * @param width - 新しい幅
     * @param height - 新しい高さ
     */
    resize(width: number, height: number): void;
    /**
     * 地図を指定された境界にフィットさせます
     * @param bounds - 境界ボックス [minLng, minLat, maxLng, maxLat]
     * @param padding - パディング（ピクセル）
     */
    fitBounds(bounds: [number, number, number, number], padding?: number): void;
    /**
     * 全レイヤーを削除します
     */
    clearAllLayers(): void;
    /**
     * 地図のSVG要素を取得します
     * @returns 地図が描画されているSVG要素
     */
    getSVG(): SVGSVGElement;
    /**
     * 現在の投影法を取得します
     * @returns 現在使用されている投影法オブジェクト
     */
    getProjection(): GeoProjection;
    /**
     * レイヤーマネージャーを取得します
     * @returns レイヤーマネージャーインスタンス
     */
    getLayerManager(): LayerManager;
    /**
     * 地図のサイズを取得します
     * @returns [width, height]
     */
    getSize(): [number, number];
    /**
     * 全レイヤーのIDリストを取得します
     * @returns レイヤーIDの配列
     */
    getLayerIds(): string[];
    /**
     * defs要素を初期化します（初期化時の内部メソッド）
     * @private
     */
    private initializeDefs;
}
