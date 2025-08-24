# d3-thematikaテストフレームワーク詳細

## package.json - NPMスクリプト

### ビルドコマンド
- `npm run build`: プロダクションビルド（Rollup使用）
- `npm run build:watch`: ウォッチモードでビルド
- `npm run dev`: 開発サーバー起動（ウォッチモード）

### テストコマンド
- `npm test`: Jestテスト実行
- `npm run test:watch`: ウォッチモードでテスト
- `npm run test:coverage`: カバレッジレポート付きテスト
- `npm run test:ci`: CI環境用テスト

### デプロイコマンド
- `npm run build:demo`: デモページビルド（scripts/build-demo.js）
- `npm run predeploy`: ビルド＋デモビルド
- `npm run deploy`: gh-pagesでデモページデプロイ

## Jest設定（jest.config.cjs）

### 基本設定
- **プリセット**: ts-jest（TypeScript対応）
- **環境**: Node.js環境
- **並列実行**: 最大50%のワーカー使用

### テストファイルパターン
```javascript
testMatch: [
  '**/__tests__/**/*.ts',
  '**/?(*.)+(spec|test).ts'
]
```

### カバレッジ設定
- **対象**: src/**/*.ts（d.tsとindex.ts除外）
- **閾値**: 全指標80%以上必須
- **レポート形式**: text, lcov, html

### モックマッピング
```javascript
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/src/$1',
  '^d3-selection$': '<rootDir>/tests/mocks/d3-selection.js',
  '^d3-geo$': '<rootDir>/tests/mocks/d3-geo.js',
  // 他のD3モジュール
  '^geotiff$': '<rootDir>/tests/mocks/geotiff.js',
  '^.*/vendor/textures\\.esm\\.js$': '<rootDir>/tests/mocks/textures.js'
}
```

## テストセットアップ（tests/setup.ts）

### グローバルヘルパー関数

#### 数値検証
```typescript
expectToBeWithinRange(actual, min, max)
expectToBeCloseTo(actual, expected, precision = 2)
```

#### 座標検証
```typescript
expectCoordinateToBeValid(coord: [number, number])
expectProjectedCoordinateToBeInCanvas(coord, width, height)
```

#### GeoJSON検証
```typescript
expectGeoJSONFeatureToBeValid(feature: GeoJSON.Feature)
```

#### SVG検証
```typescript
expectSVGElementToBeValid(element: MockSVGElement | null)
expectLayerToBeRendered(layerId: string, isVisible = true)
```

### サンプルデータ
```typescript
SAMPLE_GEOJSON = {
  type: 'FeatureCollection',
  features: [
    // Polygonフィーチャー（国）
    {
      type: 'Feature',
      properties: { name: 'Test Country', id: 1 },
      geometry: {
        type: 'Polygon',
        coordinates: [[[0,0], [10,0], [10,10], [0,10], [0,0]]]
      }
    },
    // Pointフィーチャー（都市）
    {
      type: 'Feature',
      properties: { name: 'Test City', id: 2 },
      geometry: {
        type: 'Point',
        coordinates: [5, 5]
      }
    }
  ]
}
```

### テストライフサイクル
- **beforeEach**: モッククリア、SVGモックリセット
- **afterEach**: DOMモッククリーンアップ

## ブラウザモック（tests/browser-mocks.ts）

### MockSVGElement クラス
```typescript
class MockSVGElement {
  style: { [key: string]: string } = {};
  attributes: { [key: string]: string } = {};
  children: MockSVGElement[] = [];
  
  setAttribute(name: string, value: string)
  getAttribute(name: string)
  appendChild(child: MockSVGElement)
  remove()
  querySelector(selector: string)
  querySelectorAll(selector: string)
}
```

### D3モックオブジェクト
```typescript
mockD3Selection = {
  select: jest.fn().mockReturnThis(),
  selectAll: jest.fn().mockReturnThis(),
  append: jest.fn().mockReturnThis(),
  attr: jest.fn().mockReturnThis(),
  style: jest.fn().mockReturnThis(),
  datum: jest.fn().mockReturnThis(),
  data: jest.fn().mockReturnThis(),
  enter: jest.fn().mockReturnThis(),
  exit: jest.fn().mockReturnThis(),
  remove: jest.fn().mockReturnThis(),
  node: jest.fn(() => new MockSVGElement()),
  empty: jest.fn(() => false),
  size: jest.fn(() => 1)
}
```

### グローバルモック
- `document.createElement`: SVG要素作成モック
- `document.createElementNS`: 名前空間付き要素作成
- `window`: グローバルオブジェクト拡張
- `d3`: 基本的なD3関数モック

## テストパターン（実際のテストファイルから）

### レイヤーテストの標準構造
```typescript
describe('LayerName', () => {
  let layer: LayerClass;
  let mockContainer: any;
  let mockProjection: any;
  let sampleData: any;

  beforeEach(() => {
    // テストデータ準備
    // レイヤーインスタンス作成
    // モック設定
  });

  describe('constructor', () => {
    // 初期化テスト
  });

  describe('projection management', () => {
    // 投影法関連テスト
  });

  describe('render', () => {
    // レンダリングテスト
  });

  describe('style application', () => {
    // スタイル適用テスト
  });

  describe('error handling', () => {
    // エラーハンドリングテスト
  });
});
```

### テスト項目カテゴリー

#### 基本機能テスト
- コンストラクタでのデータ設定
- プロパティの初期値確認
- メソッドの存在確認

#### データ検証テスト
- 有効/無効なGeoJSONデータ
- 座標変換の正確性
- データ型変換（配列→FeatureCollection）

#### レンダリングテスト
- SVG要素の作成
- 属性の適用
- スタイルの適用
- CSSクラスの適用

#### 投影法テスト
- setProjection呼び出し
- 投影法変更時の再レンダリング
- 座標変換の正確性

#### エラーハンドリング
- 無効なデータ処理
- 欠損プロパティ処理
- 例外のスロー/キャッチ

#### 統合テスト
- 複数レイヤーの相互作用
- イベント処理
- ライフサイクル管理

## テスト作成ガイドライン

### 必須テスト項目
1. **コンストラクタ**: 全オプションの動作確認
2. **データ処理**: 有効/無効データの処理
3. **レンダリング**: SVG要素の正しい生成
4. **スタイル/属性**: 適用の確認
5. **投影法**: setProjectionの動作
6. **破棄処理**: destroyメソッドの動作

### モック作成パターン
```typescript
// コンテナモックの標準構造
const mockContainer = {
  append: jest.fn().mockReturnThis(),
  attr: jest.fn().mockReturnThis(),
  style: jest.fn().mockReturnThis(),
  selectAll: jest.fn(() => mockSubSelection),
  // ...
};

// 投影法モック
const mockProjection = jest.fn((coords) => [
  coords[0] * 10,
  coords[1] * 10
]);
```

### アサーション例
```typescript
// レンダリング確認
expect(mockContainer.selectAll).toHaveBeenCalledWith('path');
expect(mockContainer.append).toHaveBeenCalledWith('g');

// スタイル適用確認
expect(mockElement.style).toHaveBeenCalledWith('fill', '#ff0000');

// データ検証
expect(layer.getData()).toEqual(expectedData);

// エラー検証
expect(() => new Layer({ data: null })).toThrow();
```

## CI/CD連携

### GitHub Actions対応
- `npm run test:ci`: CI環境用設定
- カバレッジレポート生成
- ウォッチモード無効化

### カバレッジ要件
- **branches**: 80%以上
- **functions**: 80%以上
- **lines**: 80%以上
- **statements**: 80%以上

失敗時はビルドがブロックされる