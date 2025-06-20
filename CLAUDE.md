# Claude Code プロジェクト設定

このファイルは Claude Code がプロジェクトを理解するための設定ファイルです。

## プロジェクト概要

このプロジェクトは D3.js の地図作成（cartography）ライブラリです。

### ライブラリの目的

- 更新の止まっているbertin.jsに変わって主にスタティックな主題図を作るカルトグラフィーライブラリを作成
- D3.jsの機能をフルに活用し、CSSやSVGのエフェクトを適用しやすい作りにする
- 一般的な地図ライブラリとは違い、パンやズームといった機能は持たない
- 目標とする地図スタイル: img/reference_map_style.png を参照

## 開発環境

- プラットフォーム: Linux (WSL2)
- 作業ディレクトリ: /home/shimizu/_playground/d3/d3-cartography

## Git/GitHub設定

- リポジトリ: https://github.com/shimizu/d3-cartography.git
- メインブランチ: main
- GPG署名: 無効（--no-gpg-sign使用）
- コミット時はGPG署名なしで実行する必要があります
- コミットメッセージ: 日本語で作成する

## 開発ワークフロー

- `npm run build`: プロダクションビルド
- `npm run dev`: 開発サーバー起動（http://localhost:3000/index.html）
- 開発サーバーは examples/ と dist/ フォルダをホスティング
- ライブリロード機能付き

## 注意事項

- ファイルの変更や新規作成時は既存のコード規約に従ってください
- コミット前に必ずビルドとテストを実行してください