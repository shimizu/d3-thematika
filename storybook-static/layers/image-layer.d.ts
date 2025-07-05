import { Selection } from 'd3-selection';
import { GeoProjection } from 'd3-geo';
import { BaseLayer } from './base-layer';
import { LayerAttr, LayerStyle } from '../types';
/**
 * 画像レイヤーのオプション
 */
export interface ImageLayerOptions {
    /** 画像のURL */
    src: string;
    /** 画像の地理的境界 [west, south, east, north] */
    bounds: [number, number, number, number];
    /** SVG属性設定 */
    attr?: LayerAttr;
    /** CSS style属性設定 */
    style?: LayerStyle;
    /** bboxの四隅にマーカーを表示するかどうか */
    showBboxMarkers?: boolean;
    /** 高度な再投影を使用するかどうか（デフォルト: true） */
    useAdvancedReprojection?: boolean;
    /** マスク処理を使用するかどうか（デフォルト: true） */
    useMask?: boolean;
}
/**
 * 画像を地図上に表示するレイヤー
 * Equirectangular投影法の場合は高速に描画し、
 * その他の投影法では画像を変換して表示します
 */
export declare class ImageLayer extends BaseLayer {
    private src;
    private bounds;
    private projection?;
    private imageElement?;
    private showBboxMarkers;
    private useAdvancedReprojection;
    private useMask;
    /**
     * ImageLayerを初期化します
     * @param id - レイヤーの一意識別子
     * @param options - レイヤーのオプション
     */
    constructor(id: string, options: ImageLayerOptions);
    /**
     * 投影法を設定します
     * @param projection - 投影法
     */
    setProjection(projection: GeoProjection): void;
    /**
     * レイヤーを描画します
     * @param container - 描画先のSVGグループ要素
     */
    render(container: Selection<SVGGElement, unknown, HTMLElement, any>): Promise<void>;
    /**
     * 画像を読み込みます
     * @param src - 画像のURL
     * @returns 読み込まれた画像要素
     */
    private loadImage;
    /**
     * Equirectangular投影法かどうかを判定します
     * @param projection - 投影法
     * @returns Equirectangular投影法の場合はtrue
     */
    private isEquirectangularProjection;
    /**
     * Web Mercatorタイルと互換性のある投影法かどうかを判定します
     * @param projection - 投影法
     * @returns Web Mercatorと互換性がある場合はtrue
     */
    private isWebMercatorCompatible;
    /**
     * 投影法の現在の状態を保存します
     * @param projection - 投影法
     * @returns 保存された状態
     */
    private saveProjectionState;
    /**
     * 投影法の状態を復元します
     * @param projection - 投影法
     * @param state - 復元する状態
     */
    private restoreProjectionState;
    /**
     * 画像専用の投影法を作成します
     * @param baseProjection - ベースとなる投影法
     * @returns 画像用に最適化された投影法
     */
    private createImageProjection;
    /**
     * 画像をそのまま描画します（座標変換なし）
     * @param img - 画像要素
     */
    private renderSimpleImage;
    /**
     * 画像を変換して描画します（その他の投影法用）
     * @param img - 画像要素
     */
    private renderTransformedImage;
    /**
     * ラスター画像を投影変換します
     * @param img - 元画像
     * @returns 変換後の画像のData URL
     */
    private transformRasterImage;
    /**
     * 逆投影を近似的に計算します
     * @param screenX - 画面X座標
     * @param screenY - 画面Y座標
     * @param west - 西端の経度
     * @param south - 南端の緯度
     * @param east - 東端の経度
     * @param north - 北端の緯度
     * @returns 地理座標 [経度, 緯度] またはnull
     */
    private approximateInverseProjection;
    /**
     * bbox の四隅にマーカーを表示します
     * @param selection - SVGグループ選択
     * @param corners - 四隅の座標配列
     */
    private addBboxMarkers;
    /**
     * 高度な再投影を使用して画像を描画します
     * @param img - 画像要素
     */
    private renderAdvancedReprojection;
    /**
     * 高度なアルゴリズムを使用してラスター画像を投影変換します
     * @param img - 元画像
     * @returns 変換後の画像のData URL
     */
    private advancedTransformRasterImage;
    /**
     * 出力画像の境界を計算します
     * @returns 境界情報またはnull
     */
    private calculateOutputBounds;
    /**
     * 投影の逆変換を行います（フォールバック付き）
     * @param screenX - 画面X座標
     * @param screenY - 画面Y座標
     * @param west - 西端の経度
     * @param south - 南端の緯度
     * @param east - 東端の経度
     * @param north - 北端の緯度
     * @returns 地理座標 [経度, 緯度] またはnull
     */
    private inverseProjectWithFallback;
    /**
     * 双線形補間を行います
     * @param imageData - 画像データ
     * @param x - X座標（小数）
     * @param y - Y座標（小数）
     * @returns RGBA値の配列
     */
    private bilinearInterpolate;
}
