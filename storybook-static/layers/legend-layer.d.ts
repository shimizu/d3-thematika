import { Selection } from 'd3-selection';
import { ScaleOrdinal, ScaleSequential, ScaleLinear, ScaleThreshold } from 'd3-scale';
import { BaseLayer } from './base-layer';
import { LayerAttr, LayerStyle } from '../types';
/**
 * 凡例の位置設定
 */
export interface LegendPosition {
    /** 上からの位置（ピクセル） */
    top: number;
    /** 左からの位置（ピクセル） */
    left: number;
}
/**
 * 凡例データの統一インターフェース
 */
export interface LegendData {
    /** 表示する値の配列 */
    data: any[];
    /** ラベル文字列の配列 */
    labels: string[];
    /** 色の配列 */
    colors: string[];
    /** サイズの配列（オプション） */
    sizes?: number[];
}
/**
 * サポートするD3スケール型
 */
export type SupportedScale = ScaleOrdinal<any, string> | ScaleSequential<string> | ScaleLinear<number, string> | ScaleThreshold<number, string> | ScaleLinear<number, number>;
/**
 * 凡例の視覚表現タイプ
 */
export type LegendSymbolType = 'cell' | 'circle' | 'line' | 'gradient';
/**
 * シンボルのサイズ設定
 */
export interface SymbolSize {
    /** 最小サイズ（ピクセル） */
    min?: number;
    /** 最大サイズ（ピクセル） */
    max?: number;
    /** 固定サイズ（ピクセル） */
    fixed?: number;
}
/**
 * 背景ボックスのスタイル設定
 */
export interface LegendBackgroundStyle {
    /** 背景色 */
    fill?: string;
    /** 境界線の色 */
    stroke?: string;
    /** 境界線の幅 */
    strokeWidth?: number;
    /** 透明度 */
    opacity?: number;
    /** 角丸の半径 */
    rx?: number;
    /** 角丸の半径（Y方向） */
    ry?: number;
    /** パディング */
    padding?: number;
}
/**
 * LegendLayerの初期化オプション
 */
export interface LegendLayerOptions {
    /** D3スケール関数 */
    scale: SupportedScale;
    /** 凡例の位置 */
    position: LegendPosition;
    /** 凡例のタイトル */
    title?: string;
    /** 配置の向き */
    orientation?: 'vertical' | 'horizontal';
    /** アイテム間のスペース（ピクセル） */
    itemSpacing?: number;
    /** フォントサイズ */
    fontSize?: number;
    /** 凡例の幅 */
    width?: number;
    /** 凡例の高さ */
    height?: number;
    /** レイヤーの属性設定 */
    attr?: LayerAttr;
    /** レイヤーのCSS style属性設定 */
    style?: LayerStyle;
    /** 凡例の視覚表現タイプ */
    symbolType?: LegendSymbolType;
    /** シンボルのサイズ設定 */
    symbolSize?: SymbolSize;
    /** サイズスケール（circleタイプ用） */
    sizeScale?: ScaleLinear<number, number>;
    /** グラデーションのステップ数（gradientタイプ用） */
    gradientSteps?: number;
    /** ドラッグ機能を有効にするか */
    enableDrag?: boolean;
    /** 背景ボックスを表示するか */
    showBackground?: boolean;
    /** 背景ボックスのスタイル */
    backgroundStyle?: LegendBackgroundStyle;
    /** 重ね表示モード（サイズスケール時のみ有効） */
    overlapping?: boolean;
}
/**
 * D3スケールを受け取って地図に凡例を表示するレイヤークラス
 */
export declare class LegendLayer extends BaseLayer {
    /** D3スケール */
    private scale;
    /** 凡例の位置 */
    private position;
    /** 凡例のタイトル */
    private title?;
    /** 配置の向き */
    private orientation;
    /** アイテム間のスペース */
    private itemSpacing;
    /** フォントサイズ */
    private fontSize;
    /** 凡例の幅 */
    private width?;
    /** 凡例の高さ */
    private height?;
    /** レイヤーグループ */
    private layerGroup?;
    /** 親コンテナの参照（リサイズ対応用） */
    private parentContainer?;
    /** 凡例の視覚表現タイプ */
    private symbolType;
    /** シンボルのサイズ設定 */
    private symbolSize;
    /** サイズスケール */
    private sizeScale?;
    /** グラデーションのステップ数 */
    private gradientSteps;
    /** ドラッグ機能の有効/無効 */
    private enableDrag;
    /** 背景ボックスの表示/非表示 */
    private showBackground;
    /** 背景ボックスのスタイル */
    private backgroundStyle;
    /** 重ね表示モード */
    private overlapping;
    /**
     * LegendLayerを初期化します
     * @param options - レイヤーの設定オプション
     */
    constructor(options: LegendLayerOptions);
    /**
     * スケール型から適切なシンボルタイプを推論します
     * @returns 推論されたシンボルタイプ
     * @private
     */
    private inferSymbolType;
    /**
     * サイズスケールが有効かどうかを判定します
     * @returns サイズスケールが有効な場合true
     * @private
     */
    private hasSizeScale;
    /**
     * レイヤーを描画します
     * @param container - 描画先のSVGコンテナ
     */
    render(container: Selection<SVGGElement, unknown, HTMLElement, any>): void;
    /**
     * d3-legendの設計思想に基づいてスケール型を自動判別します
     * @returns スケール型
     * @private
     */
    private detectScaleType;
    /**
     * 値が色を表す文字列かどうかを判定します
     * @param value - 判定する値
     * @returns 色の場合true
     * @private
     */
    private isColorValue;
    /**
     * スケール型に応じた凡例データを生成します
     * @returns 凡例データ
     * @private
     */
    private generateLegendData;
    /**
     * 連続スケール用の凡例データを生成します
     * @returns 凡例データ
     * @private
     */
    private generateContinuousLegend;
    /**
     * 量的スケール用の凡例データを生成します
     * @returns 凡例データ
     * @private
     */
    private generateQuantizedLegend;
    /**
     * 序数スケール用の凡例データを生成します
     * @returns 凡例データ
     * @private
     */
    private generateOrdinalLegend;
    /**
     * サイズスケール用の凡例データを生成します
     * @returns 凡例データ
     * @private
     */
    private generateSizeScaleLegendData;
    /**
     * 凡例を描画します
     * @private
     */
    private renderLegend;
    /**
     * タイトルを描画します
     * @private
     */
    private renderTitle;
    /**
     * セル（矩形）タイプの凡例を描画します（固定サイズ版）
     * @private
     */
    private renderCellLegend;
    /**
     * 円タイプの凡例を描画します（固定サイズ版）
     * @private
     */
    private renderCircleLegend;
    /**
     * 線タイプの凡例を描画します（固定サイズ版）
     * @private
     */
    private renderLineLegend;
    /**
     * グラデーションタイプの凡例を描画します
     * @private
     */
    private renderGradientLegend;
    /**
     * サイズスケール用の凡例を描画します
     * @private
     */
    private renderSizeScaleLegend;
    /**
     * 重ね表示モードでサイズスケール凡例を描画します
     * @param legendData - 凡例データ
     * @param titleOffset - タイトルのオフセット
     * @private
     */
    private renderOverlappingSizeScale;
    /**
     * 重ね表示モードで円を描画します（同心円配置）
     * @param legendData - 凡例データ
     * @param titleOffset - タイトルのオフセット
     * @param maxSize - 最大サイズ
     * @private
     */
    private renderOverlappingCircles;
    /**
     * 重ね表示モードでセルを描画します
     * @param legendData - 凡例データ
     * @param titleOffset - タイトルのオフセット
     * @param maxSize - 最大サイズ（面積）
     * @private
     */
    private renderOverlappingCells;
    /**
     * 重ね表示モードで線を描画します
     * @param legendData - 凡例データ
     * @param titleOffset - タイトルのオフセット
     * @param maxSize - 最大サイズ（線幅）
     * @private
     */
    private renderOverlappingLines;
    /**
     * 通常モードでサイズスケール凡例を描画します
     * @param legendData - 凡例データ
     * @param titleOffset - タイトルのオフセット
     * @private
     */
    private renderRegularSizeScale;
    /**
     * 通常モードでサイズ可変の円を描画します
     * @private
     */
    private renderRegularSizeCircles;
    /**
     * 通常モードでサイズ可変のセルを描画します
     * @private
     */
    private renderRegularSizeCells;
    /**
     * 通常モードでサイズ可変の線を描画します
     * @private
     */
    private renderRegularSizeLines;
    /**
     * アイテムの配置を設定します
     * @param items - アイテムの選択セット
     * @param titleOffset - タイトルのオフセット
     * @param sizes - サイズ配列（サイズスケール時のボトム揃え用）
     * @private
     */
    private positionItems;
    /**
     * 背景ボックスを描画します
     * @private
     */
    private renderBackground;
    /**
     * 凡例の境界ボックスを計算します
     * @returns 境界ボックス
     * @private
     */
    private calculateLegendBounds;
    /**
     * 位置のtransformを更新します
     * @private
     */
    private updatePositionTransform;
    /**
     * ドラッグ動作を設定します
     * @private
     */
    private setupDragBehavior;
    /**
     * スライダーの値を更新します（デモページ用）
     * @private
     */
    private updateSliders;
    /**
     * 背景ボックスの透明度のみを更新します
     * @private
     */
    private updateBackgroundOpacity;
    /**
     * 背景ボックスのスタイルを更新します
     * @private
     */
    private updateBackgroundStyles;
    /**
     * リサイズイベントの監視を設定します
     * @private
     */
    private setupResizeListener;
}
