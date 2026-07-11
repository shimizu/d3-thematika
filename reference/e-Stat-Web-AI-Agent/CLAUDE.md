# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

e-Stat（政府統計総合窓口）のWeb APIから統計データを取得する、**ブラウザ完結型のAIエージェント**。バックエンドは持たず、Claude Messages APIへのclient tool useループと e-Stat API 呼び出しをすべてブラウザのフロントエンド（React + Vite）で行う。利用者が自然言語で依頼すると、エージェントが統計表検索→メタ情報確認→データ取得→確認→出力という手順を自律的に実行する。

取得後は、ブラウザ内の決定論的な分析ツール（固定集計＋隔離JavaScript実行）で集計・検算し、その結果を根拠に回答する。

開発者向けの詳細は `docs/`、背景は `README.md` を参照。

## コマンド

```bash
npm install        # 依存インストール（Node.js 20.19+ または 22.12+）
npm run dev        # Vite開発サーバー
npm run build      # 本番ビルド
npm test           # 全テスト（node --test、ブラウザ不要）
node --test test/runtime.test.js   # 単一テストファイルの実行
```

テストは Node 標準の `node --test` で動く。ブラウザ依存（localStorage / IndexedDB / fetch）は各モジュールが注入可能になっているか安全にno-opするため、テストでは実ブラウザAPIなしで純粋なロジックを検証できる。lintツールは未導入。

## アーキテクチャの要点

### レイヤ分離（最重要）

UI（React）とエージェント中核は厳密に分離されている。`src/components/` は表示と入力のみを担当し、推論・ツール実行・データ管理・API呼び出しは `src/agent/`・`src/tools/`・`src/data/` のプレーンなJSモジュールが行う。**コンポーネント内にエージェント処理やAPI呼び出しを直接書かない。**

`src/App.jsx` が唯一の結線点で、モジュール群（`DatasetStore` / `ConversationStore` / `ToolRegistry`）をモジュールスコープでインスタンス化し（`App.jsx:25-27`）、`runAgent` へ `callClaude` と `toolRegistry` を注入する。

### tool useループ（`src/agent/runtime.js`）

`runAgent` がエージェントの心臓部。API呼び出し（`callModel`）とツール実装（`toolRegistry`）を**注入**で受け取り、ブラウザ非依存でテスト可能にしている。中核の挙動：

- `stop_reason === "tool_use"` の間、ツールを**逐次**実行し `tool_result` を会話へ積んでループ。Dataset Store等の状態に依存するため呼び出し順は維持する。
- ツール例外は握りつぶさず `is_error: true` のtool_resultとしてモデルへ返し、モデルが条件を修正して再試行できるようにする（エージェント全体は止めない）。
- `stop_reason` に応じて `completed` / `truncated` / `refused` / `aborted` / `iteration_limit` を返す。
- 反復上限（`DEFAULT_MAX_ITERATIONS = 30`）到達時は、ツール無しでもう一度だけ呼んで取得済み情報の要約回答を作る。
- ループ中の各段階で `onEvent` を発火。`assistant_text` イベントはチャットへ「途中経過」として表示、それ以外は実行ログへ流す（`App.jsx` の onEvent ハンドラ）。

### コンテキスト肥大の抑制（ここが設計の肝）

大量の統計データを**LLMの会話履歴に入れない**ことが全体方針。具体的には3層で守る：

1. **`fetch_stats_data` は要約だけ返す**（`src/tools/register-tools.js`）。全レコードは Dataset Store に保存し、LLMには `datasetId`・列名・サンプル数行（`LLM_SAMPLE_ROWS = 5`）だけを返す。詳細が要るときモデルは `inspect_dataset` を呼ぶ。
2. **tool result の文字数上限**（`runtime.js` の `TOOL_RESULT_CHAR_CAP = 8000`）で一律に打ち切る。
3. **会話履歴のコンパクション**（`src/agent/compaction.js`）。直近 `COMPACT_KEEP_RECENT_MESSAGES = 8` 件以外の古い tool_result 本文をプレースホルダへ置換。tool_use と tool_result のブロック対応・IDは保持するため整合性は崩れない。

### Dataset Store（`src/data/dataset-store.js` + `src/data/idb.js`）

取得データのブラウザ内ストア。二段構えの永続化：

- **生レコード** → IndexedDB（`estat-agent` DB の `datasets` ストア）。容量が大きいため。
- **要約**（タイトル・件数・列など）→ localStorage（`estat-agent.datasets`）。初回描画の高速化用。

同期APIを保ちつつ、コンストラクタで `#hydrate()`（IndexedDBから生レコードを非同期復元）を呼ぶ。`list()` が返す `available` フラグは「生レコードがメモリに在るか」を示し、リロード直後はfalse→ハイドレート完了で `#notify()`→true に戻る（ダウンロードボタンの活性はこれに連動）。`idb.js` は IndexedDB 不在環境で安全にno-opする。

### 状態の永続化とストア注入パターン

`DatasetStore` と `ConversationStore` はどちらも `constructor({ storage })` でストレージを注入可能にし、未指定時のみ `globalThis.localStorage` を try/catch で解決する。Claude API はステートレスなため、会話継続は `ConversationStore` が保持する Anthropic 形式 messages 配列を毎回送り直すことで実現する（`App.jsx` が `runAgent` の戻り `messages` を `conversationStore.setMessages` へ書き戻す）。

### ツール定義（`src/tools/register-tools.js` + `src/agent/tool-registry.js`）

`ToolRegistry` がツールの**定義（LLMへ渡すスキーマ）と実装を同じ名前で1対1管理**し、定義と実行のずれを防ぐ。`createAppToolRegistry(datasetStore, analysisStore)` で client tool 6種を登録する：e-Stat系4種（`search_stats_tables` / `get_stats_metadata` / `fetch_stats_data` / `inspect_dataset`）と、分析系2種（`analyze_dataset` = `src/analysis/` の固定分析、`execute_analysis_javascript` = 使い捨てWeb Workerでの隔離JS実行）。分析結果は `AnalysisResultStore`（`src/data/analysis-store.js`）へ記録し `analysisId` で参照する。新ツール追加時は「定義オブジェクト + handler」をここに `.register()` する。

開発用に、`?debug=true` で表示されるデバッグハーネス（`src/test-harness/` + `src/components/DebugPanel.jsx`）があり、実APIでエージェントのツール利用を観測・判定できる。詳細は `docs/architecture.md` の「デバッグハーネス」。

### e-Stat API クライアント（`src/tools/estat-client.js`）

e-Stat は `Access-Control-Allow-Origin: *` を返すため**JSONPではなく通常のJSON fetch**で呼ぶ（`createEstatQuery` は callback 引数を任意で受けるがJSON fetchでは付けない）。`getStatsData` は `RESULT_INF.NEXT_KEY` がある限り `startPosition` を進めて全ページ取得し、`maxRecords` 到達で停止。取得後にコードと名称を結合して正規化する。

### スキルとシステムプロンプト（`src/agent/system-prompt.js`）

`composeSystemPrompt(skills)` が `BASE_SYSTEM_PROMPT` に分野別スキル（現状は `jp-trade-stats`、貿易統計の手順知識）を連結する。MVPでは貿易統計スキルを常時適用。将来の複数スキル・自動選択の入口として配列で受ける設計。

## 設定・認証

- **e-Stat アプリケーションID** はバンドルに埋め込まず、利用者が画面の「API設定」で入力し localStorage（`estat-agent.estatAppId`）へ保存する（Claude APIキーと同じ扱い）。`App.jsx` が `createAppToolRegistry(datasetStore, analysisStore, { estatAppId })` でツールへ appId をクロージャ束縛し（`estatAppId` 変更時に `useMemo` でレジストリ再生成）、`estat-client.js` の各関数が options 経由で受け取る。未入力時は e-Stat 系ツール（検索・取得・疎通確認）は実行せず、画面で入力を案内する。秘匿情報ではないが、従来の「全利用者共通の埋め込みID」は廃止した（`.env` の `VITE_ESTAT_APP_ID` と `src/config.js` も削除済み）。
- **Claude APIキー** は埋め込まず、利用者が画面の「API設定」で入力し localStorage（`estat-agent.apiKey`）へ保存。`claude-client.js` は `anthropic-dangerous-direct-browser-access: true` ヘッダでブラウザ直叩きする。デフォルトモデルは `claude-sonnet-4-6`（`App.jsx`）。

## コミット規約

コミットメッセージはプレフィックスを付ける：`feat:` / `fix:` / `docs:` / `refactor:` / `perf:` / `test:` / `chore:` / `style:`。
