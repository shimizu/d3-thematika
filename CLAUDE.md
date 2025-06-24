# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

このプロジェクトは D3.js の主題図作成（thematika）ライブラリです。

### ライブラリの目的

- 更新の止まっているbertin.jsに変わって主にスタティックな主題図を作る主題図ライブラリを作成
- D3.jsの機能をフルに活用し、CSSやSVGのエフェクトを適用しやすい作りにする
- 一般的な地図ライブラリとは違い、パンやズームといった機能は持たない
- 目標とする地図スタイル: img/reference_map_style.png を参照

## アーキテクチャ概要

### レイヤーベースアーキテクチャ
- **Map クラス (thematika.ts)**: メインオーケストレーター。SVG作成、投影法管理、LayerManagerへの委譲
- **LayerManager (core/layer-manager.ts)**: レイヤーのライフサイクル管理、z-index制御、レンダリング調整
- **BaseLayer (layers/base-layer.ts)**: 全レイヤーの基底クラス。共通インターフェースと基本実装
- **各種レイヤー**: GeojsonLayer, GraticuleLayer, OutlineLayer, RasterLayer, LegendLayer

### ビルド出力
- **UMD** (`dist/thematika.umd.js`): ブラウザ用、グローバル`Thematika`名前空間
- **ESM** (`dist/thematika.esm.js`): ESモジュール
- **CJS** (`dist/thematika.cjs.js`): CommonJS

注意: d3-geoとd3-selectionは外部依存として扱われ、UMDビルド使用時は別途読み込みが必要

## 開発環境

- プラットフォーム: Linux (WSL2)
- 作業ディレクトリ: /home/shimizu/_make_libs/d3-thematika

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

## トークン削減戦略

Claude Code 使用時は以下の方法でトークン消費を最小限に抑える：

### ファイル読み込み最適化
- 初回ファイル確認は `compact` モード使用
- 必要に応じて `limit`/`offset` で部分読み込み
- Task/Agent ツールで事前調査してピンポイント特定

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
- 地理空間データ（GeoJSON）の計算処理はturf.jsを使用する。d3-thematikaは可視化に特化し、地理計算はturf.jsに委譲する。
- 設計を変更したときは不要になったコードを極力削除する
- **重要**: examples/フォルダにthematika.umd.jsをコピーしてはいけません。rollup.config.jsのserve設定でcontentBase: ['examples', 'dist']により開発サーバーが両方を配信するため、コピーは不要で重複になります。
- **コーディング規約**: 新しいコードを書く際は必ず既存の処理との統一感を保つこと。他の関数やパターンと同じ引数の取り方、戻り値の形式、処理の流れに従う。独自の実装パターンを作らず、既存コードの一貫性を重視する

## 注意事項

- ファイルの変更や新規作成時は既存のコード規約に従ってください
- コミット前に必ずビルドとテストを実行してください
- 新機能追加時は必ず対応するexamplesページを作成してください