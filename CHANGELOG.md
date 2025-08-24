# Changelog

All notable changes to d3-thematika will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### 🚧 開発中の機能
- インタラクティブ機能の強化
- アニメーションAPI
- プラグインシステム
- TypeScript型定義の改善

## [0.0.1-alpha] - 2024-12-24

### 🎉 初期リリース

#### ✨ 機能
- **コア機能**
  - Mapクラス: SVG作成、投影法管理、レイヤー管理
  - LayerManager: レイヤーのライフサイクル管理、z-index制御
  - BaseLayer: 全レイヤーの基底クラス

- **レイヤータイプ（13種類）**
  - **地理データ系**
    - GeojsonLayer: GeoJSONデータの汎用描画
    - OutlineLayer: 地図輪郭描画
    - GraticuleLayer: 経緯線グリッド
  
  - **ポイント系**
    - PointCircleLayer: 円形マーカー
    - PointSymbolLayer: シンボルマーカー
    - PointTextLayer: テキストラベル
    - PointAnnotationLayer: 注釈付きマーカー
    - PointSpikeLayer: スパイク表現
  
  - **ライン系**
    - LineConnectionLayer: 地点間接続線
    - LineEdgeBundlingLayer: エッジバンドリング線
    - LineTextLayer: ライン沿いテキスト
  
  - **その他**
    - ImageLayer: ラスター画像表示
    - LegendLayer: 凡例表示

- **ユーティリティ**
  - gis-utils: GeoJSON処理、bbox計算、重心計算
  - color-palette: カラーパレット生成、色覚シミュレーション
  - effect-utils: SVGフィルター効果（Bloom、DropShadow、Glow等）
  - texture-utils: テクスチャパターン生成
  - tile-utils: タイル座標計算
  - cog-utils: Cloud Optimized GeoTIFF処理

- **エフェクト**
  - ドロップシャドウ
  - ブルーム効果
  - グロー効果
  - ガウシアンブラー
  - エッジ検出
  - ノイズ
  - インナーシャドウ
  - クリッピング

#### 📦 ビルド形式
- UMD版: ブラウザ直接読み込み対応
- ESM版: ES Modules対応
- CJS版: CommonJS対応

#### 📚 ドキュメント
- README.md
- 15以上のサンプルコード
- APIドキュメント（基本）

#### 🧪 テスト
- Jest設定
- 基本的なユニットテスト
- カバレッジ目標: 80%

### ⚠️ 既知の問題
- APIは安定していません
- 一部の機能が未実装
- パフォーマンス最適化が必要
- ドキュメントが不完全

### 📝 注意事項
- これは開発版/アルファ版です
- プロダクション環境での使用は推奨されません
- 破壊的変更が頻繁に発生する可能性があります

---

## 今後の予定

### v0.1.0（予定）
- [ ] 基本的なレイヤータイプの安定化
- [ ] APIドキュメントの充実
- [ ] パフォーマンス最適化
- [ ] より多くのサンプル追加
- [ ] バグ修正

### v0.2.0（構想）
- [ ] インタラクティブ機能
- [ ] アニメーションサポート
- [ ] カスタムレイヤーAPI
- [ ] プラグインシステム

### v1.0.0（目標）
- [ ] 安定版API
- [ ] 完全なドキュメント
- [ ] プロダクション対応
- [ ] パフォーマンス最適化完了