/**
 * Jestテスト環境のセットアップファイル
 * 全テストファイルの実行前に実行されます
 */

// グローバルなテスト設定
global.console = {
  ...console,
  // テスト中のログを制御
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// テスト用のヘルパー関数
(global as any).expectToBeWithinRange = (actual: number, min: number, max: number) => {
  expect(actual).toBeGreaterThanOrEqual(min);
  expect(actual).toBeLessThanOrEqual(max);
};

// 数値の近似比較用ヘルパー
(global as any).expectToBeCloseTo = (actual: number, expected: number, precision: number = 2) => {
  expect(actual).toBeCloseTo(expected, precision);
};

// テスト前の初期化処理
beforeEach(() => {
  // モックをクリア
  jest.clearAllMocks();
});

// テスト後のクリーンアップ
afterEach(() => {
  // 必要に応じてクリーンアップ処理
});