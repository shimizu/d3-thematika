/**
 * COG (Cloud Optimized GeoTIFF) 関連のユーティリティ関数
 * GeoTIFFファイルの読み込みと処理に特化したユーティリティ集
 */
import { Pool } from 'geotiff';
/**
 * COG読み込みオプション
 */
export interface ReadCOGOptions {
    /** リサンプリング方法 */
    resampleMethod?: 'nearest' | 'bilinear';
    /** 画像インデックス（デフォルト: 0） */
    imageIndex?: number;
    /** 読み込むバンド（デフォルト: [0, 1, 2]でRGB） */
    samples?: number[];
    /** デコード用のワーカープール */
    pool?: Pool;
    /** サイズ制限設定 */
    sizeLimit?: {
        /** 最大幅（デフォルト: 512） */
        maxWidth?: number;
        /** 最大高さ（デフォルト: 512） */
        maxHeight?: number;
        /** 制限を超えた場合の処理（デフォルト: 'resample'） */
        onExceed?: 'error' | 'resample';
    };
    /** 出力解像度（リサンプリング時に使用） */
    outputWidth?: number;
    outputHeight?: number;
    /** 地理的境界（AOI）[west, south, east, north] */
    bbox?: [number, number, number, number];
}
/**
 * COG読み込み結果
 */
export interface ReadCOGResult {
    /** Data URI形式の画像 */
    dataUri: string;
    /** 地理的境界 [west, south, east, north] */
    bounds: [number, number, number, number];
    /** 実際の出力画像の幅 */
    width: number;
    /** 実際の出力画像の高さ */
    height: number;
    /** 元画像の幅 */
    originalWidth: number;
    /** 元画像の高さ */
    originalHeight: number;
    /** リサンプリングされたかどうか */
    wasResampled: boolean;
}
/**
 * Cloud Optimized GeoTIFF（COG）ファイルを読み込み、ImageLayerで使用可能な形式に変換します
 * @param url - COGファイルのURL
 * @param options - 読み込みオプション
 * @returns 読み込み結果
 */
export declare function readCOG(url: string, options?: ReadCOGOptions): Promise<ReadCOGResult>;
