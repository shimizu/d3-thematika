/**
 * グローバルなテストヘルパー関数の型定義
 */

import { MockSVGElement } from './browser-mocks';

declare global {
  /**
   * 値が指定された範囲内にあることを確認する
   */
  function expectToBeWithinRange(actual: number, min: number, max: number): void;

  /**
   * 数値の近似比較を行う
   */
  function expectToBeCloseTo(actual: number, expected: number, precision?: number): void;

  /**
   * 座標が有効な範囲内にあるかを確認する
   */
  function expectCoordinateToBeValid(coord: [number, number]): void;

  /**
   * 投影座標がキャンバス範囲内にあるかを確認する
   */
  function expectProjectedCoordinateToBeInCanvas(
    coord: [number, number], 
    width: number, 
    height: number
  ): void;

  /**
   * GeoJSONフィーチャーの有効性を確認する
   */
  function expectGeoJSONFeatureToBeValid(feature: GeoJSON.Feature): void;

  /**
   * SVG要素が正しく作成されているかを確認する
   */
  function expectSVGElementToBeValid(element: MockSVGElement | null): void;

  /**
   * レイヤーの状態を確認する
   */
  function expectLayerToBeRendered(layerId: string, isVisible?: boolean): void;
}

export {};