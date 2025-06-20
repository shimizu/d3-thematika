/**
 * グローバルなテストヘルパー関数の型定義
 */

declare global {
  /**
   * 値が指定された範囲内にあることを確認する
   */
  function expectToBeWithinRange(actual: number, min: number, max: number): void;

  /**
   * 数値の近似比較を行う
   */
  function expectToBeCloseTo(actual: number, expected: number, precision?: number): void;
}

export {};