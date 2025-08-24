/** @type {import('jest').Config} */
module.exports = {
  // TypeScriptファイルを処理するためのプリセット
  preset: 'ts-jest',
  
  // テスト環境（Node.js環境を使用）
  testEnvironment: 'node',
  
  // テストファイルのパターン
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/?(*.)+(spec|test).ts'
  ],
  
  // カバレッジ対象ファイル
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts' // エントリーポイントは除外
  ],

  // テスト対象から除外するパターン
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/storybook-static/'
  ],
  
  // カバレッジレポート形式
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  
  // カバレッジ閾値
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // モジュール解決
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^d3-selection$': '<rootDir>/tests/mocks/d3-selection.js',
    '^d3-geo$': '<rootDir>/tests/mocks/d3-geo.js',
    '^d3-drag$': '<rootDir>/tests/mocks/d3-drag.js',
    '^d3-scale$': '<rootDir>/tests/mocks/d3-scale.js',
    '^d3-scale-chromatic$': '<rootDir>/tests/mocks/d3-scale-chromatic.js',
    '^d3-shape$': '<rootDir>/tests/mocks/d3-shape.js',
    '^d3-path$': '<rootDir>/tests/mocks/d3-path.js',
    '^d3-force$': '<rootDir>/tests/mocks/d3-force.js',
    '^d3-delaunay$': '<rootDir>/tests/mocks/d3-delaunay.js',
    '^d3-polygon$': '<rootDir>/tests/mocks/d3-polygon.js',
    '^d3-contour$': '<rootDir>/tests/mocks/d3-contour.js',
    '^.*/vendor/textures\\.esm\\.js$': '<rootDir>/tests/mocks/textures.js',
    '^geotiff$': '<rootDir>/tests/mocks/geotiff.js'
  },
  
  // セットアップファイル
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  
  // ブラウザAPIのモック
  setupFiles: ['<rootDir>/tests/browser-mocks.ts'],
  
  // TypeScript設定
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.json'
    }]
  },
  
  // 詳細なエラー表示
  verbose: true,
  
  // 並列実行の制御
  maxWorkers: '50%'
};