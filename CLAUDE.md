# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

このプロジェクトは D3.js の主題図作成（thematika）ライブラリです。

### ライブラリの目的

- 主にスタティックな主題図を作る主題図ライブラリを作成
- D3.jsの機能をフルに活用し、CSSやSVGのエフェクトを適用しやすい作りにする
- 一般的な地図ライブラリとは違い、パンやズームといった機能は持たない

## アーキテクチャ概要

### レイヤーベースアーキテクチャ
- **Map クラス (thematika.ts)**: メインオーケストレーター。SVG作成、投影法管理、LayerManagerへの委譲
- **LayerManager (core/layer-manager.ts)**: レイヤーのライフサイクル管理、z-index制御、レンダリング調整
- **BaseLayer (layers/base-layer.ts)**: 全レイヤーの基底クラス。共通インターフェースと基本実装

### 実装済みレイヤータイプ

#### 基本レイヤー
- **GeojsonLayer**: GeoJSONデータの表示、動的スタイリング
- **ImageLayer**: 画像データの投影変換表示
- **LegendLayer**: D3スケールと連携した凡例自動生成
- **GraticuleLayer**: 経緯線グリッド
- **OutlineLayer**: 地球アウトライン

#### ポイントレイヤー
- **PointCircleLayer**: 円形ポイント、サイズ・色の動的変更
- **PointSymbolLayer**: d3.symbolを使用したシンボル表示
- **PointAnnotationLayer**: アノテーション（注釈）、引き出し線とテキストボックス
- **PointTextLayer**: テキストラベル表示
- **PointSpikeLayer**: 3Dスパイク（棒グラフ）表示

#### ラインレイヤー
- **LineConnectionLayer**: 直線・弧・スムージング接続
- **LineEdgeBundlingLayer**: フォースシミュレーションによる集約
- **LineTextLayer**: ライン上のテキスト配置

#### エフェクト・ユーティリティ
- **カスタムフィルター**: createCustomFilter APIによるSVGフィルター定義
- **ブルームエフェクト**: 発光効果
- **ドロップシャドウ**: 影効果
- **クリップ機能**: ポリゴン形状によるクリッピング
- **COG対応**: Cloud Optimized GeoTIFFの読み込み
- **タイル機能**: Web地図タイルシステム

### ビルド出力
- **UMD** (`dist/thematika.umd.js`): ブラウザ用、グローバル`Thematika`名前空間
- **ESM** (`dist/thematika.esm.js`): ESモジュール
- **CJS** (`dist/thematika.cjs.js`): CommonJS

注意: d3-geoとd3-selectionは外部依存として扱われ、UMDビルド使用時は別途読み込みが必要

## 開発環境

- プラットフォーム: Linux (WSL2)
- 作業ディレクトリ: d3-thematika
- Node.js: v16以上必須（ESMサポートのため）

### コーディング規約

- **モジュール形式**: 全てのJavaScriptコードはESM（ECMAScript Modules）形式を使用
- **scripts/配下**: ESM形式（`import`/`export`）を使用、CommonJS（`require`/`module.exports`）は使用禁止
- **インポート**: 常に`import`文を使用
- **エクスポート**: `export`または`export default`を使用

## Git/GitHub設定

- リポジトリ: https://github.com/shimizu/d3-thematika.git
- メインブランチ: main
- GPG署名: 無効（--no-gpg-sign使用）
- コミット時はGPG署名なしで実行する必要があります
- コミットメッセージ: 日本語で作成する
- Push: 明示的な指示があるまで自動でpushしない

## 開発コマンド

```bash
# 開発サーバー起動（http://localhost:3000）
npm run dev

# プロダクションビルド
npm run build

# テスト実行
npm test

# テスト（ウォッチモード）
npm run test:watch

# カバレッジレポート付きテスト
npm run test:coverage

# デモページのデプロイ
npm run deploy

```

### テスト要件
- Jest使用、TypeScript対応
- カバレッジ要件: 全指標で80%以上
- 新機能追加時は必ずユニットテストを作成

## 開発ワークフロー

### Examples作成時の必須手順

新しいデモページ（examples/*.html）を作成する場合は、必ず以下の手順に従ってください：

1. **テンプレートの内容を読む**: examples/template.html を参照
2. **テンプレートをコピー**: `cp examples/template.html examples/your-layer-name.html`
3. **テンプレートを修正**: 目的に合わせてテンプレートを修正
4. **不要な標準機能を削除**: 使用しない機能（透明度スライダー等）を削除

これにより全デモページで一貫したデザインとUXを維持できます。

## Examples ディレクトリ構造

### 概要
examples/ディレクトリには21個のデモページが6つのカテゴリーに分類されて配置されています。

### カテゴリー別構成
1. **基本レイヤー** (3例)
   - geojson-layer.html - GeoJSONデータの基本表示
   - image-layer.html - 衛星画像・地形データ表示
   - legend-layer-layer.html - 凡例の自動生成

2. **ポイントレイヤー** (6例)
   - point-circle-layer.html - 円形ポイント
   - point-symbol-layer.html - d3.symbolシンボル
   - point-annotation-layer.html - 注釈・コールアウト
   - point-text-layer.html - テキストラベル
   - point-text-avoid-overlap.html - Voronoi重なり回避
   - point-spike.html - 3Dスパイク表示

3. **ラインレイヤー** (3例)
   - line-connection-layer.html - 直線・弧接続
   - line-edgebundling-layer.html - エッジバンドリング
   - line-text-layer.html - ライン上テキスト

4. **エフェクト** (3例)
   - effect-bloom.html - ブルーム効果
   - effect-dropshadow.html - ドロップシャドウ
   - effect-customFilter.html - カスタムSVGフィルター

5. **ユーティリティ** (5例)
   - clip-polygon.html - ポリゴンクリップ
   - cog-load.html - Cloud Optimized GeoTIFF
   - tile-map.html - タイル地図システム
   - color-palette-showcase.html - カラーパレット展示
   - playground.html - 実験的複合デモ

6. **ギャラリー** (1例)
   - gallery1.html - 古地図風デモ

### 重要ファイル
- **examples.html**: サンプル一覧ページ（ギャラリー形式）
- **template.html**: 新規デモ作成用テンプレート
- **index.html**: エントリーページ

### リソースディレクトリ
- **css/**: 共通スタイルシート
- **js/**: 共通JavaScript（common.js）
- **geojson/**: GeoJSONデータファイル
- **thumbnails/**: デモページのサムネイル画像

## トークン削減戦略

Claude Code 使用時は以下の方法でトークン消費を最小限に抑える：

### ファイル読み込み最適化
- 初回ファイル確認は `compact` モード使用
- 必要に応じて `limit`/`offset` で部分読み込み
- Task/Agent ツールで事前調査してピンポイント特定

### コード解析最適化（serena MCP活用）
- **serena MCPサーバー**を活用してシンボルベースで効率的にコード解析
- `mcp__serena__find_symbol`で特定のクラス・関数をピンポイント読み込み
- `mcp__serena__get_symbols_overview`でファイル構造を軽量に把握
- `mcp__serena__search_for_pattern`で柔軟なパターン検索
- `mcp__serena__list_dir`でディレクトリ構造を効率的に探索
- **重要**: ファイル全体の`Read`は最終手段。serenaツールで必要部分のみ取得

### 効率的な処理
- 複数ファイル読み込みを並列実行
- 独立したGitコマンドをバッチ処理
- MultiEdit で複数箇所を一括変更

### 開発アプローチ
- 実装前に構造とアプローチを明確化
- 小さな単位で段階的に進行
- キャッシュ活用で同一ファイル再読み込み回避

## 重要な設計方針とメモリーログ

- ライブラリの正式名称は「d3-thematika」です。
- ライブラリは開発中のため後方互換を保つ必要はありません。
- レイヤーはイベントハンドリングを行いません。
  - **禁止**: レイヤークラスに`on()`メソッドを追加すること
  - **禁止**: レイヤー内でD3イベントリスナーを設定すること
  - **理由**: シンプルで一貫性のあるライブラリ設計を維持するため
  - **代替手段**: インタラクティブな機能が必要な場合は、Map レベルまたはアプリケーション側で実装する
- 地理空間データ（GeoJSON）の計算処理はturf.jsを使用する。d3-thematikaは可視化に特化し、地理計算はturf.jsに委譲する。
- 設計を変更したときは不要になったコードを極力削除する
- **重要**: examples/フォルダにthematika.umd.jsをコピーしてはいけません。rollup.config.jsのserve設定でcontentBase: ['examples', 'dist']により開発サーバーが両方を配信するため、コピーは不要で重複になります。
- **重要**: HTMLファイルでのスクリプト参照は必ず `<script src="thematika.umd.js"></script>` とする。`../dist/` は絶対に付けない。
- **コーディング規約**: 新しいコードを書く際は必ず既存の処理との統一感を保つこと。他の関数やパターンと同じ引数の取り方、戻り値の形式、処理の流れに従う。独自の実装パターンを作らず、既存コードの一貫性を重視する
- **実装状況**: 21個のデモページ、20種類以上のレイヤータイプが実装済み。新機能追加時は必ず対応するexampleを作成

### Immutableパターンの採用

**基本方針**: レイヤーの状態変更は動的更新ではなく、新しいインスタンス作成で対応する

- **禁止**: `setXxx()` メソッドによる動的な状態変更（setProjection除く）
- **推奨**: 設定変更が必要な場合は新しいオプションで新しいインスタンスを作成
- **例外**: `setProjection()` のみ許可（投影法の変更は必須機能のため）
- **UIでの変更**: 設定変更時は `draw()` 関数内で地図全体を再作成

#### 具体例

```typescript
// ❌ 動的変更（削除済み）
layer.setStep([10, 10]);
layer.setShowBboxMarkers(true);

// ✅ 新インスタンス作成
const newLayer = new GraticuleLayer({
  step: [10, 10],
  // その他のオプション
});

const newImageLayer = new ImageLayer('id', {
  src: 'image.png',
  bounds: bounds,
  showBboxMarkers: true,
  useAdvancedReprojection: false
});
```

#### examples/での実装

UIコントロールの変更時は地図全体を再描画：

```javascript
function draw() {
  // 既存の地図を削除
  d3.select('#map').selectAll('*').remove();
  
  // UIの状態を取得
  const showMarkers = document.getElementById('markers').checked;
  
  // 新しい設定で地図を再作成
  const map = new Thematika.Map({...});
  const layer = new Thematika.ImageLayer('image', {
    // ...
    showBboxMarkers: showMarkers
  });
  map.addLayer('raster', layer);
}

// UI変更時に再描画
document.getElementById('markers').addEventListener('change', draw);
```

この方針により、状態管理が単純化され、予期しない副作用を防止できる。

## コード品質チェックリスト（セッション間での品質維持のため必須）

### 作業開始前の必須確認（この順序で必ず実行）
1. **既存コードパターンの調査**: 類似機能の実装を必ず確認し、同じパターンを踏襲する
2. **テンプレート確認**: examples作成時は必ず`cp examples/template.html examples/新ファイル名.html`でコピー
3. **段階的実装計画**: 大きなコードを一度に書かず、小さな単位での実装を計画
4. **依存関係確認**: 外部ライブラリの使用方法とビルド設定への影響を確認

### 実装時の品質基準（妥協禁止）
- **命名規則**: 既存コードと完全に同じ命名規則・構造を使用
- **UMDビルド**: destructuring禁止、必ず`Thematika.ClassName`形式で使用
- **エラーハンドリング**: 最初から組み込み、後付け禁止
- **TypeScript**: 型安全性を確保、`any`の乱用禁止
- **一貫性**: 引数の取り方、戻り値の形式、処理の流れを既存と統一

### 完成前の最終確認（コミット前必須）
- **動作テスト**: 実際の動作確認完了
- **ルール遵守**: このCLAUDE.mdの全ルール遵守確認
- **既存コード整合性**: 既存コードとの一貫性確認
- **ビルド確認**: `npm run build`でエラーがないことを確認

## 絶対に守るべきルール（違反は品質低下の原因）

### Examples関連
- **必須**: examples/template.htmlを必ずコピーして修正（独自作成禁止）
- **必須**: UMDビルドでは`Thematika.Map`等の名前空間経由アクセス
- **必須**: 動作する既存exampleを参考にして同じパターンを使用

### コード実装関連
- **必須**: 新機能実装前に既存の類似コードを調査
- **必須**: 小さな部分から段階的に実装・テスト
- **必須**: エラー発生時は段階的に小さな部分から確認
- **禁止**: 大きなコードを一度に書いて後でデバッグ

### データ処理関連
- **必須**: GeoJSONデータの実際の構造を確認してからプロパティアクセス
- **必須**: データファイルパスの実際の存在確認
- **禁止**: 推測に基づくプロパティ名やパスの使用

## 注意事項

- ファイルの変更や新規作成時は既存のコード規約に従ってください
- コミット前に必ずビルドとテストを実行してください
- 新機能追加時は必ず対応するexamplesページを作成してください
- **重要**: 上記チェックリストを省略した作業は品質低下の原因となるため禁止