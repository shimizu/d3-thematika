# d3-thematikaプロジェクト構造解析メモリー

## プロジェクト概要
- **名称**: d3-thematika
- **目的**: D3.jsベースの静的主題図（テーマティックマップ）作成ライブラリ
- **特徴**: パン・ズーム機能なし、純粋な可視化に特化
- **ビルド形式**: UMD, ESM, CJS（外部依存: d3-geo, d3-selection）

## コアアーキテクチャ

### 1. Map クラス (src/thematika.ts)
**責務**: メインオーケストレーター
- SVG要素の作成・管理
- 投影法(projection)の設定・更新
- LayerManagerへのレイヤー管理委譲
- PNG/SVGエクスポート機能

**主要メソッド**:
- constructor: SVG初期化、投影法設定
- addLayer/removeLayer: レイヤー追加・削除
- setProjection: 投影法変更
- fitBounds: 境界に合わせた投影調整
- savePNG/saveSVG: エクスポート機能

### 2. LayerManager (src/core/layer-manager.ts)
**責務**: レイヤーライフサイクル管理
- レイヤーインスタンスの管理
- z-indexによる重ね順制御
- 投影法更新の伝播
- レンダリング調整

**主要メソッド**:
- addLayer: レイヤー登録とレンダリング
- setLayerZIndex: 重ね順変更
- updateProjection: 全レイヤーへの投影法伝播
- rerenderAllLayers: 一括再レンダリング

### 3. BaseLayer (src/layers/base-layer.ts)
**責務**: 全レイヤーの基底クラス
- 共通インターフェース定義
- スタイル/属性適用メソッド提供
- 可視性とz-index管理
- レイヤーグループ作成

**主要メソッド**:
- render: 抽象メソッド（サブクラスで実装）
- setProjection: 投影法設定（IGeojsonLayer実装時）
- applyStylesToElement: スタイル適用
- applyAttributesToElement: 属性適用
- createLayerGroup: SVGグループ作成

## レイヤー実装（13種類）

### 地理データ系レイヤー
1. **GeojsonLayer**: GeoJSONデータの汎用描画
2. **OutlineLayer**: 地図輪郭描画
3. **GraticuleLayer**: 経緯線グリッド

### ポイント系レイヤー
4. **PointCircleLayer**: 円形マーカー
5. **PointSymbolLayer**: シンボルマーカー
6. **PointTextLayer**: テキストラベル
7. **PointAnnotationLayer**: 注釈付きマーカー
8. **PointSpikeLayer**: スパイク表現

### ライン系レイヤー
9. **LineConnectionLayer**: 地点間接続線
10. **LineEdgeBundlingLayer**: エッジバンドリング線
11. **LineTextLayer**: ライン沿いテキスト

### その他のレイヤー
12. **ImageLayer**: ラスター画像表示
13. **LegendLayer**: 凡例表示

## ユーティリティモジュール

### gis-utils.ts
- GeoJSON処理（検証、マージ、座標抽出）
- BBox計算（取得、マージ、中心点、拡張）
- 重心計算

### color-palette.ts
- カラーパレット生成・推奨
- 色覚シミュレーション
- パレット: ColorBrewer, CARTO, Tailwind, Viridis

### effect-utils.ts
- SVGフィルター効果
- Bloom, DropShadow, Glow, Blur
- EdgeDetect, Noise, InnerShadow
- ClipPolygon, ColorMatrix

### その他
- **texture-utils**: テクスチャパターン生成
- **tile-utils**: タイル座標計算
- **cog-utils**: Cloud Optimized GeoTIFF処理
- **test-utils**: テスト用ユーティリティ

## 重要な設計原則

### Immutableパターン
- setProjection以外の動的状態変更禁止
- 設定変更時は新インスタンス作成
- UIでの変更時は地図全体を再描画

### コーディング規約
- 全コードESM形式（import/export使用）
- UMDビルドではThematika名前空間経由アクセス
- 既存コードとの統一性を最重視

### 制約事項
- レイヤーでのイベントハンドリング禁止
- 地理計算はturf.jsに委譲
- examples作成時は必ずtemplate.htmlをコピー

## インターフェース定義（types.ts）

### 主要インターフェース
- **ILayer**: 基本レイヤーインターフェース
- **IGeojsonLayer**: GeoJSONレイヤー用
- **ILineConnectionLayer**: 接続線レイヤー用
- **ThematikaOptions**: Map初期化オプション
- **LayerStyle/LayerAttr**: スタイル・属性定義

### 型定義
- カラーパレット関連型
- タイル処理関連型
- エフェクトオプション型

## ファイル構造
```
src/
├── thematika.ts         # Mapクラス
├── index.ts             # エントリーポイント
├── types.ts             # 型定義
├── core/
│   └── layer-manager.ts # レイヤー管理
├── layers/
│   ├── base-layer.ts    # 基底クラス
│   └── [各種レイヤー実装]
├── utils/
│   └── [各種ユーティリティ]
└── vendor/
    └── textures.js      # 外部ライブラリ
```

## 開発時の注意点
- 新機能追加時は既存パターンを踏襲
- テスト作成必須（カバレッジ80%以上）
- examples追加時はtemplate.html使用
- GPG署名なしでコミット
- 地図の動的更新より再作成を推奨