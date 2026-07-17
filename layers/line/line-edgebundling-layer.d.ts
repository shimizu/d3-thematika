import { Selection } from 'd3-selection';
import { GeoProjection } from 'd3-geo';
import { BaseLayer } from '../core/base-layer';
import { LayerAttr, LayerStyle, ILineConnectionLayer } from '../../types';
import * as GeoJSON from 'geojson';
/**
 * LineEdgeBundlingLayerの初期化オプション
 */
export interface LineEdgeBundlingLayerOptions {
    /** GeoJSONデータ（LineString/MultiLineString） */
    data: GeoJSON.Feature | GeoJSON.Feature[] | GeoJSON.FeatureCollection;
    /** レイヤーの属性設定 */
    attr?: LayerAttr;
    /** レイヤーのCSS style属性設定 */
    style?: LayerStyle;
    /** バンドリング強度（0-1、デフォルト: 0.85） */
    bundlingStrength?: number;
    /** Force-directed layoutの強度（デフォルト: 20） */
    forceStrength?: number;
    /** 制御点の数（デフォルト: 'auto'、自動計算） */
    segmentSteps?: number | 'auto';
    /** 制御点を表示するか（デフォルト: false） */
    showControlPoints?: boolean;
    /** 元のラインも表示するか（デフォルト: false） */
    showOriginalLines?: boolean;
    /** Force layoutをアニメーションするか（デフォルト: true） */
    animateForce?: boolean;
    /** 制御点のサイズ（デフォルト: 3） */
    controlPointSize?: number;
    /** 端点のサイズ（デフォルト: 6） */
    endpointSize?: number;
}
/**
 * エッジバンドリング効果を適用したラインレイヤークラス
 * D3のcurveBundleとForce-directed layoutを使用して複数のラインを視覚的に整理します
 */
export declare class LineEdgeBundlingLayer extends BaseLayer<LayerAttr<GeoJSON.Feature>, LayerStyle<GeoJSON.Feature>> implements ILineConnectionLayer {
    /** GeoJSONデータ */
    private data;
    /** パス生成器 */
    private path?;
    /** レイヤーグループ */
    private layerGroup?;
    /** 投影法 */
    private projection?;
    /** バンドリング強度 */
    private bundlingStrength;
    /** Force-directed layoutの強度 */
    private forceStrength;
    /** 制御点の数設定 */
    private segmentSteps;
    /** 制御点を表示するか */
    private showControlPoints;
    /** 元のラインも表示するか */
    private showOriginalLines;
    /** Force layoutをアニメーションするか */
    private animateForce;
    /** 制御点のサイズ */
    private controlPointSize;
    /** 端点のサイズ */
    private endpointSize;
    /** Force simulation */
    private simulation?;
    /** バンドリングデータ */
    private bundlingData?;
    /**
     * LineEdgeBundlingLayerを初期化します
     * @param options - レイヤーの設定オプション
     */
    constructor(options: LineEdgeBundlingLayerOptions);
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
     * バンドリングされたラインを描画します
     * @private
     */
    private renderBundledLines;
    /**
     * GeoJSONからバンドリング用のデータを生成します
     * @returns バンドリングデータ
     * @private
     */
    private generateBundlingData;
    /**
     * 単一のLineStringを処理してバンドリングデータに追加します
     * @private
     */
    private processLineString;
    /**
     * 距離に基づいて制御点の数を計算します
     * @private
     */
    private calculateSegmentSteps;
    /**
     * 元のラインを描画します
     * @private
     */
    private renderOriginalLines;
    /**
     * バンドリングされたパスを描画します
     * @private
     */
    private renderBundledPaths;
    /**
     * 制御点を描画します
     * @private
     */
    private renderControlPoints;
    /**
     * Force simulationを開始します
     * @private
     */
    private startForceSimulation;
    /**
     * Force simulationのtickイベントで位置を更新します
     * @private
     */
    private updatePositions;
    /**
     * レイヤーを削除します
     */
    destroy(): void;
    /**
     * Force simulationを取得します（デバッグ用）
     * @returns Force simulation
     */
    getSimulation(): any | undefined;
    /**
     * バンドリング強度を動的に変更します
     * @param strength - 新しいバンドリング強度（0-1）
     */
    setBundlingStrength(strength: number): void;
}
