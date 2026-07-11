# 引き継ぎドキュメント

e-Stat Web AI Agent の保守・修正・機能追加のための開発者向けドキュメントです。

## このアプリは何か

利用者が自然言語で統計の依頼を入力すると、AIエージェント（Claude）が
e-Stat（政府統計総合窓口）のWeb APIを操作して統計表を検索・取得し、
結果を提示・ダウンロードできる**ブラウザ完結型**のWebアプリです。

- フロントエンドのみ（バックエンドなし）。React + Vite + 素のJavaScript（ES Modules）
- LLMは「文章生成」ではなく「ツールを操作するエージェント」として利用
- 大量の統計データはLLMの会話履歴に入れず、ブラウザ内のストアで管理

## ドキュメント構成

| ドキュメント | 内容 | こんなときに読む |
|---|---|---|
| [architecture.md](./architecture.md) | システム構成、データフロー、tool useループ、トークン抑制、永続化 | 全体像を理解したい／改修の影響範囲を知りたい |
| [development.md](./development.md) | 環境構築、コマンド、テスト、環境変数、ビルド・デプロイ | 開発を始める／ビルドして配置する |
| [extending.md](./extending.md) | ツール追加・スキル追加・モデル変更・エクスポート形式追加などの手順 | 機能を追加する |
| [maintenance.md](./maintenance.md) | 既知の制約、エラー処理、トラブルシュート、セキュリティ、コミット規約 | 不具合対応／運用上の注意を確認する |

## 関連する既存ドキュメント

- `../README.md` — プロジェクト概要、開発手順、API・認証情報の扱い（利用者・概要向け）
- `../CLAUDE.md` — Claude Code（AIエージェント）向けの簡潔なアーキテクチャ要約。本 docs/ はその人間向け詳細版

## ディレクトリ構成（俯瞰）

```text
web-agents/
├── index.html              # Vite のエントリ HTML
├── vite.config.js          # base:"./"（相対パス）等のビルド設定
├── src/
│   ├── main.jsx            # React マウント
│   ├── App.jsx             # 全体のハブ。状態管理とモジュール結線（appId/APIキーは localStorage）
│   ├── components/         # 表示のみ（ChatPanel/ExecutionLog/DatasetPanel/AnalysisPanel/DebugPanel/ApiSettings）
│   ├── agent/              # エージェント中核
│   │   ├── runtime.js          # tool use 反復エンジン
│   │   ├── claude-client.js    # Claude Messages API クライアント
│   │   ├── tool-registry.js    # ツール定義+実装の管理
│   │   ├── conversation-store.js  # 会話履歴（localStorage 永続）
│   │   ├── compaction.js       # 会話履歴のトークン縮約
│   │   ├── system-prompt.js    # system prompt 組み立て
│   │   └── skills/jp-trade-stats.js  # 貿易統計スキル（手順知識）
│   ├── analysis/           # 取得データの決定論的分析（会話履歴に依存しない）
│   │   ├── operations.js       # 固定分析の純粋関数（合計/group-by/前年比 等）
│   │   ├── index.js            # runAnalysis（操作名→関数のディスパッチ）
│   │   ├── analysis-runner.js  # 使い捨てWorkerでJSを実行（タイムアウト/上限/検査）
│   │   ├── analysis-worker.js  # Worker本体（生成JSを隔離実行）
│   │   └── code-guard.js       # 生成JSの実行前検査・簡易ハッシュ
│   ├── tools/
│   │   ├── estat-client.js     # e-Stat API 呼び出し・正規化・ページング
│   │   ├── register-tools.js   # client tool 6種の登録（e-Stat系4＋分析系2）
│   │   └── server-tools.js     # サーバー側ツール定義（web検索/取得/コード実行、トグルで有効化）
│   ├── data/
│   │   ├── dataset-store.js    # 取得データの管理（メモリ + IndexedDB + localStorage）
│   │   ├── analysis-store.js   # 分析結果ログの管理（メモリ + IndexedDB + localStorage）
│   │   └── idb.js              # IndexedDB ラッパ（datasets / analyses ストア）
│   ├── test-harness/       # ?debug=true 用のシナリオ定義・判定・内蔵フィクスチャ
│   │   ├── scenarios.js        # シナリオ＋判定（isSubsequence/evaluateScenario）
│   │   └── fixtures.js         # 内蔵テストデータと期待値
│   └── utils/export.js     # CSV/JSON/Markdown/分析ログ 出力
└── test/                   # node --test 用テスト
```

各レイヤの責務と相互依存は [architecture.md](./architecture.md) を参照してください。
