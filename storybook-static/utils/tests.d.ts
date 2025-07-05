import { GeoProjection } from 'd3-geo';
/**
 * 座標変換テストの異常値情報
 */
export interface AbnormalCoordinate {
    /** 地物名 */
    featureName?: string;
    /** 元の地理座標 [経度, 緯度] */
    originalCoord: [number, number];
    /** 変換後のピクセル座標 [x, y] */
    projectedCoord: [number, number];
    /** 範囲外の詳細情報 */
    outOfBounds: {
        x: string;
        y: string;
    };
}
/**
 * 座標変換テストの結果
 */
export interface ProjectionTestResult {
    /** 総座標数 */
    totalCoords: number;
    /** 正常座標数 */
    normalCoords: number;
    /** 異常座標数 */
    abnormalCoords: number;
    /** 異常値の詳細リスト */
    abnormalDetails: AbnormalCoordinate[];
    /** テストが成功したかどうか */
    isValid: boolean;
    /** サマリーメッセージ */
    summary: string;
}
/**
 * 投影法による座標変換が正しく動作しているかテストします
 * @param width - 地図の幅（ピクセル）
 * @param height - 地図の高さ（ピクセル）
 * @param projection - D3投影法オブジェクト
 * @param geoJson - テスト対象のGeoJSONデータ
 * @returns テスト結果
 */
export declare function testProjectionTransform(width: number, height: number, projection: GeoProjection, geoJson: GeoJSON.FeatureCollection): ProjectionTestResult;
/**
 * テスト結果をコンソールに出力
 * @param result - テスト結果
 * @param detailed - 詳細な異常値情報も出力するかどうか
 */
export declare function logTestResult(result: ProjectionTestResult, detailed?: boolean): void;
/**
 * 地図の境界ボックスが正しく設定されているかテスト
 * @param projection - D3投影法オブジェクト
 * @param geoJson - テスト対象のGeoJSONデータ
 * @returns テスト結果の概要
 */
export declare function testProjectionBounds(projection: GeoProjection, geoJson: GeoJSON.FeatureCollection): {
    isValid: boolean;
    message: string;
};
