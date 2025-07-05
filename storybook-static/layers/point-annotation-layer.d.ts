import { Selection } from 'd3-selection';
import { GeoProjection } from 'd3-geo';
import { BaseLayer } from './base-layer';
import { LayerAttr, LayerStyle, IGeojsonLayer } from '../types';
/**
 * アノテーションタイプの定義
 */
export type AnnotationType = 'callout' | 'label' | 'badge' | 'calloutElbow' | 'calloutCurve' | 'calloutCircle' | 'calloutRect';
/**
 * テキストアクセサーの型定義
 */
export type TextAccessor = string | ((feature: GeoJSON.Feature, index: number) => string);
/**
 * オフセットアクセサーの型定義
 */
export type OffsetAccessor = ((feature: GeoJSON.Feature, index: number) => [number, number]);
/**
 * サブジェクトタイプの定義
 */
export type SubjectType = 'point' | 'circle' | 'rect';
/**
 * スタイル値の型定義（固定値またはコールバック関数）
 */
export type StyleValue<T> = T | ((feature: GeoJSON.Feature, index: number) => T);
/**
 * サブジェクトオプションの型定義
 */
export interface SubjectOptions {
    /** サブジェクトタイプ */
    type?: SubjectType;
    /** 半径（circle用） */
    r?: StyleValue<number>;
    /** 幅（rect用） */
    width?: StyleValue<number>;
    /** 高さ（rect用） */
    height?: StyleValue<number>;
    /** 塗りつぶし色 */
    fill?: StyleValue<string>;
    /** 境界線色 */
    stroke?: StyleValue<string>;
    /** 境界線の太さ */
    strokeWidth?: StyleValue<number>;
    /** 境界線のダッシュ配列 */
    strokeDasharray?: StyleValue<string>;
    /** その他の基本設定（後方互換性のため） */
    radius?: number;
}
/**
 * コネクターオプションの型定義
 */
export interface ConnectorOptions {
    /** 線の色 */
    stroke?: StyleValue<string>;
    /** 線の太さ */
    strokeWidth?: StyleValue<number>;
    /** 線のダッシュ配列 */
    strokeDasharray?: StyleValue<string>;
}
/**
 * ノートオプションの型定義
 */
export interface NoteOptions {
    /** 背景色 */
    backgroundColor?: string;
    /** 境界線色 */
    borderColor?: string;
    /** 境界線の太さ */
    borderWidth?: number;
    /** 境界線の角丸 */
    borderRadius?: number;
    /** パディング */
    padding?: number;
    /** フォントサイズ */
    fontSize?: string;
    /** フォントファミリー */
    fontFamily?: string;
    /** テキスト色 */
    textColor?: string;
    /** テキストの折り返し */
    wrap?: number;
    /** テキストの配置 */
    align?: string;
}
/**
 * PointAnnotationLayerの初期化オプション
 */
export interface PointAnnotationLayerOptions {
    /** GeoJSONデータ */
    data: GeoJSON.FeatureCollection | GeoJSON.Feature[];
    /** アノテーションタイプ */
    annotationType?: AnnotationType;
    /** テキスト内容のアクセサー */
    textAccessor?: TextAccessor;
    /** タイトル内容のアクセサー */
    titleAccessor?: TextAccessor;
    /** オフセット位置のアクセサー */
    offsetAccessor?: OffsetAccessor;
    /** サブジェクト（対象）の設定 */
    subjectOptions?: SubjectOptions;
    /** コネクター（引き出し線）の設定 */
    connectorOptions?: ConnectorOptions;
    /** ノート（テキスト部分）の設定 */
    noteOptions?: NoteOptions;
    /** レイヤーの属性設定 */
    attr?: LayerAttr;
    /** レイヤーのCSS style属性設定 */
    style?: LayerStyle;
}
/**
 * GeoJSONデータをアノテーション要素として描画するレイヤークラス
 * ポイントならそのまま、ポリゴンやラインなら中心点にアノテーションを配置
 */
export declare class PointAnnotationLayer extends BaseLayer implements IGeojsonLayer {
    /** GeoJSONデータ */
    private data;
    /** 投影法 */
    private projection?;
    /** レイヤーグループ */
    private layerGroup?;
    /** アノテーションタイプ */
    private annotationType;
    /** テキストアクセサー */
    private textAccessor;
    /** タイトルアクセサー */
    private titleAccessor?;
    /** オフセットアクセサー */
    private offsetAccessor?;
    /** サブジェクト設定 */
    private subjectOptions;
    /** コネクター設定 */
    private connectorOptions;
    /** ノート設定 */
    private noteOptions;
    /**
     * PointAnnotationLayerを初期化します
     * @param options - レイヤーの設定オプション
     */
    constructor(options: PointAnnotationLayerOptions);
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
     * GeoJSONデータを取得します
     * @returns 現在のGeoJSONデータ
     */
    getData(): GeoJSON.FeatureCollection;
    /**
     * デフォルトのテキストアクセサーを取得します
     * フィーチャーのpropertiesから最初の文字列値を使用
     * @private
     */
    private getDefaultTextAccessor;
    /**
     * テキスト値を取得します
     * @param feature - GeoJSONフィーチャー
     * @param index - インデックス
     * @private
     */
    private getTextValue;
    /**
     * タイトル値を取得します
     * @param feature - GeoJSONフィーチャー
     * @param index - インデックス
     * @private
     */
    private getTitleValue;
    /**
     * オフセット値を取得します
     * @param feature - GeoJSONフィーチャー
     * @param index - インデックス
     * @private
     */
    private getOffsetValue;
    /**
     * スタイル値を解決します（固定値またはコールバック関数）
     * @param styleValue - スタイル値
     * @param feature - GeoJSONフィーチャー
     * @param index - インデックス
     * @param defaultValue - デフォルト値
     * @private
     */
    private resolveStyleValue;
    /**
     * サブジェクトタイプを取得します
     * @private
     */
    private getSubjectType;
    /**
     * アノテーションデータを準備します
     * @private
     */
    private prepareAnnotationData;
    /**
     * アノテーションを描画します
     * @private
     */
    private renderAnnotations;
    /**
     * 単一のアノテーションを描画します
     * @param data - アノテーションデータ
     * @param index - インデックス
     * @private
     */
    private drawSingleAnnotation;
    /**
     * サブジェクト（対象ポイント）を描画します
     * @private
     */
    private drawSubject;
    /**
     * ポイント型サブジェクトを描画
     * @private
     */
    private drawPointSubject;
    /**
     * 円形サブジェクトを描画
     * @private
     */
    private drawCircleSubject;
    /**
     * 矩形サブジェクトを描画
     * @private
     */
    private drawRectSubject;
    /**
     * コネクター（引き出し線）を描画します
     * @private
     */
    private drawConnector;
    /**
     * ラベル形式を描画（引き出し線なし、テキストのみ）
     * @private
     */
    private drawLabel;
    /**
     * バッジテキストを描画（サブジェクト上に短いテキストを表示）
     * @private
     */
    private drawBadgeText;
    /**
     * ノート（テキスト部分）を描画
     * @private
     */
    private drawNote;
    /**
     * テキストアンカーを取得
     * @private
     */
    private getTextAnchor;
    /**
     * ベースラインを取得
     * @private
     */
    private getBaseline;
}
