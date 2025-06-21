# D3 Cartography ドキュメント

D3 Cartographyライブラリの包括的なドキュメントです。

## 📚 ドキュメント構成

### 👥 [ユーザー向けドキュメント](./user/)
ライブラリを使用する開発者向けの情報

- **[はじめに](./user/getting-started.md)** - インストールと基本的な使い方
- **[API リファレンス](./user/api-reference.md)** - 全APIの詳細仕様
- **[主題図の作成](./user/thematic-maps.md)** - 様々な主題図の作成方法
- **[スタイリング](./user/styling.md)** - CSS/SVGエフェクトの活用
- **[チュートリアル](./user/tutorials/)** - ステップバイステップガイド
- **[FAQ](./user/faq.md)** - よくある質問と回答

### 🛠️ [開発者向けドキュメント](./developer/)
ライブラリ開発に参加する開発者向けの情報

- **[アーキテクチャ](./developer/architecture.md)** - ライブラリの全体構造と設計思想
- **[コーディング規約](./developer/coding-standards.md)** - コード品質の基準
- **[開発ワークフロー](./developer/development-workflow.md)** - 開発・テスト・リリース手順
- **[コントリビューション](./developer/contributing.md)** - 貢献方法とガイドライン
- **[API設計](./developer/api-design.md)** - API設計の指針と原則

### 📖 [サンプル集](./examples/)
実用的なコード例とデモ

- **基本的な地図** - シンプルな世界地図の作成
- **主題図の例** - 段階区分図、比例シンボルなど
- **高度なスタイリング** - CSS/SVGエフェクトの活用例
- **複数地図のレイアウト** - ダッシュボード形式の地図配置

## 🚀 クイックリンク

### はじめて使う方
1. [インストールガイド](./user/getting-started.md#インストール)
2. [基本的な地図の作成](./user/getting-started.md#基本的な地図の作成)
3. [API リファレンス](./user/api-reference.md)

### 開発に参加したい方
1. [アーキテクチャ概要](./developer/architecture.md)
2. [開発環境セットアップ](./developer/README.md#開発環境セットアップ)
3. [コントリビューション](./developer/contributing.md)

## 📋 目標とする機能

D3 Cartographyは、[bertin.js](https://github.com/neocarto/bertin)に代わるスタティックな主題図作成ライブラリとして、以下の機能を目指しています：

### 基本機能
- ✅ ベクターレイヤー描画
- ✅ 複数投影法サポート
- ✅ レイヤー管理システム
- ✅ 基本的なスタイリング
- ✅ アウトラインレイヤー（クリップ機能付き）
- ✅ 経緯線レイヤー
- ✅ SVGフィルター・エフェクト

### 主題図表現
- 📋 段階区分図 (Choropleth)
- 📋 比例シンボル (Proportional symbols)
- 📋 ドット密度図 (Dot density)
- 📋 フロー図 (Flow maps)
- 📋 カルトグラム (Cartogram)

### 地図装飾
- 📋 凡例 (Legends)
- 📋 スケールバー (Scale bar)
- 📋 方位記号 (North arrow)
- 📋 注釈・ラベル (Annotations)

### エフェクト
- 📋 影効果 (Shadow effects)
- 📋 ハッチング (Hatching patterns)
- 📋 グラデーション (Gradients)
- 📋 アニメーション (Transitions)

## 🌐 デモページ

実際の動作を確認できるデモページをGitHub Pagesで公開しています：

🔗 **[Live Demo](https://shimizu.github.io/d3-cartography/)**

### デプロイ手順

開発者向け：デモページの更新は以下のコマンドで実行できます：

```bash
npm run deploy
```

このコマンドで以下が自動実行されます：
1. ライブラリのビルド（`npm run build`）
2. デモページの構築（`npm run build:demo`）
3. GitHub Pagesへのデプロイ（`gh-pages`）

## 🤝 貢献

ドキュメントの改善や新しい機能の提案を歓迎します！

- [GitHub Issues](https://github.com/shimizu/d3-cartography/issues) - バグ報告や機能要望
- [Pull Requests](https://github.com/shimizu/d3-cartography/pulls) - ドキュメントの改善やコード貢献

## 📄 ライセンス

このプロジェクトは[ISC License](../LICENSE)の下で公開されています。