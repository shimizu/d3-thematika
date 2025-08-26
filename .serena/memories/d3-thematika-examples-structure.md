# d3-thematika Examples ディレクトリ構造と内容

## 概要
examples/ディレクトリには、d3-thematikaライブラリの使用例を示す21個のデモページと関連リソースが含まれています。

## ディレクトリ構造

### メインディレクトリ
- **examples/** - デモページのルート
  - **css/** - スタイルシート
    - style.css - メインスタイル
    - components.css - コンポーネントスタイル
    - responsive.css - レスポンシブ対応
  - **js/** - JavaScriptファイル
    - common.js - 共通機能
  - **geojson/** - GeoJSONデータ
    - world.geojson - 世界地図
    - world-capitals.geojson - 世界の首都
    - aflica.geojson - アフリカ地図
    - 他サブディレクトリ: bloom/, stats/, point/, line/, japan/, takasaki/
  - **geotiff/** - GeoTIFFデータ
  - **img/** - 画像ファイル
  - **thumbnails/** - サムネイル画像

## デモページのカテゴリー別一覧

### 1. 基本レイヤー (3例)
- **geojson-layer.html** - GeoJSONレイヤーの基本使用例
- **image-layer.html** - 画像レイヤー（衛星画像・地形データ）
- **legend-layer-layer.html** - 凡例レイヤーの自動生成

### 2. ポイントレイヤー (6例)
- **point-circle-layer.html** - 円形ポイント表示
- **point-symbol-layer.html** - d3.symbolを使用したシンボル表示
- **point-annotation-layer.html** - アノテーション（注釈）表示
- **point-text-layer.html** - テキストラベル表示
- **point-text-avoid-overlap.html** - Voronoi図による重なり回避
- **point-spike.html** - 3Dスパイク表示

### 3. ラインレイヤー (3例)
- **line-connection-layer.html** - 直線・弧による接続
- **line-edgebundling-layer.html** - フォースシミュレーションによる集約
- **line-text-layer.html** - ライン上のテキスト配置

### 4. エフェクト (3例)
- **effect-bloom.html** - ブルーム（発光）エフェクト
- **effect-dropshadow.html** - ドロップシャドウエフェクト
- **effect-customFilter.html** - カスタムSVGフィルター効果

### 5. ユーティリティ (5例)
- **clip-polygon.html** - ポリゴン形状によるクリップ
- **cog-load.html** - Cloud Optimized GeoTIFF読み込み
- **tile-map.html** - タイル地図システム
- **color-palette-showcase.html** - カラーパレット展示
- **playground.html** - 実験的な複合デモ

### 6. ギャラリー (1例)
- **gallery1.html** - 古地図風デモ

### その他のファイル
- **index.html** - エントリーページ
- **examples.html** - サンプル一覧ページ（ギャラリー形式）
- **template.html** - 新規デモ作成用テンプレート
- **biutiful-map.html** - 美しい地図のデモ
- **gis-utils.html** - GISユーティリティ

## 重要な特徴

### 共通構造
- 全デモページは統一されたナビゲーションバー、ブレッドクラム、コントロールパネルを持つ
- template.htmlをベースとして作成されている
- UMDビルド（thematika.umd.js）を使用

### データソース
- GeoJSONファイルは主に世界地図、首都、地域データを含む
- 各デモは適切なGeoJSONデータセットを使用
- 画像データやGeoTIFFも一部のデモで使用

### スタイルとテーマ
- ダークテーマベースのモダンなデザイン
- レスポンシブ対応
- グラデーション効果やアニメーションを活用

### 機能の特徴
- 投影法の切り替え機能
- SVG/PNGダウンロード機能
- インタラクティブなコントロールパネル
- コードサンプルの表示とコピー機能

## 最新の更新
- 21個のデモページが利用可能
- 6つのカテゴリーに分類
- 15種類以上のレイヤータイプを実装
- 新規追加：カスタムフィルター、ポイントスパイク、エッジバンドリングなど

このディレクトリは、d3-thematikaライブラリの機能を網羅的に示すサンプル集として機能し、ユーザーが様々な地図表現技法を学習できるよう設計されています。