# 機能追加ガイド

代表的な拡張作業を「触るファイル」と「手順」で示します。
共通原則として、**LLMの会話履歴に大量データを入れない**（要約とIDだけ返す）こと、
**UIとエージェント中核を分離する**ことを守ってください（[architecture.md](./architecture.md)）。

## 1. ツールを追加する

エージェントが使える新しいツール（client tool）を増やす場合。

触るファイル: `src/tools/register-tools.js`（必要なら新規の実装モジュール、`test/tool-registry.test.js` を参考にテスト）

手順:
1. ツール定義オブジェクトを作る（Anthropic の tool 仕様 = `name` / `description` / `input_schema`）。
   `description` には「いつ使うか」を具体的に書く（モデルの選択精度に直結）。
2. 実装関数（handler）を書く。`(input, context) => result` の形。`context` には `signal` 等が入る。
3. `createAppToolRegistry` の中で `.register(定義, handler)` を追加する。
4. **戻り値は要約に絞る**。大きなデータはストアへ保存し、IDと要約だけ返す
   （`fetch_stats_data` が `datasetStore.add()` 後に要約を返す実装が参考）。

`ToolRegistry`（`src/agent/tool-registry.js`）は定義と実装を同じ名前で1対1管理し、
重複登録や未登録実行を防ぎます。`definitions()` がそのままLLMへ渡されます。

## 2. スキルを追加・差し替える

特定分野の手順知識・判断基準をLLMへ与える場合（例: 人口・物価など別統計分野）。

触るファイル: `src/agent/skills/`（新規スキル）、`src/agent/system-prompt.js`、`test/system-prompt.test.js`

手順:
1. `src/agent/skills/<分野>.js` にスキル本文（Markdown文字列）を `export` する。
   `jp-trade-stats.js` を雛形に、「手順 / 統計表の選び方 / コードの確認方法 / 計測の固定 / 出典」を記述。
2. `composeSystemPrompt(skills)` に渡すスキル配列へ加える。MVPでは
   既定が `[JP_TRADE_STATS_SKILL]`。複数渡すと `---` で連結される。
3. スキルは「ツールの使い方」を教えるもの。新しい実行能力が要るならツール追加（上記1）も併せて行う。

将来的な拡張余地: 依頼内容に応じたスキル自動選択、参照資料の遅延読み込み（`composeSystemPrompt` の
引数設計がその入口）。

## 3. 対応モデルを変更する

触るファイル: `src/App.jsx`（`DEFAULT_MODEL`）、`src/components/ApiSettings.jsx`

- 既定モデルは `App.jsx` の `DEFAULT_MODEL`。
- モデル指定は現状 `ApiSettings.jsx` の**自由入力テキスト**。プルダウンにしたい場合は
  ここに選択肢（`<select>`）を実装し、`onModelChange` を維持する。
- モデルIDは `claude-client.js` がそのままAPIへ渡すため、有効なモデルIDであれば動作する。

## 4. エクスポート形式を追加する

触るファイル: `src/utils/export.js`、`src/App.jsx`（`handleExportDataset`）、`src/components/DatasetPanel.jsx`

既存ユーティリティを再利用する:
- `recordsToCsv(columns, records)` … RFC4180準拠のCSV文字列（欠損は空文字）
- `sanitizeFilename(name, fallback)` … ファイル名の禁則文字を `_` へ
- `downloadText(filename, text, mimeType)` … Blob化してダウンロード発火

手順:
1. `export.js` に新フォーマットの整形関数を追加（必要なら）。
2. `handleExportDataset(id, format)` に分岐を追加し、`downloadText` で保存。
3. `DatasetPanel.jsx` のボタン群に `onExport(dataset.id, "<format>")` を追加。
   既存の `.export-button` クラスを付けると見た目（緑・ダウンロードアイコン）が揃う。

レポート（Markdown）の保存は `handleExportReport` / ChatPanel 側の「レポートをダウンロード」ボタン。
分析ログのエクスポートは `handleExportAnalysis` / `AnalysisPanel.jsx`（JSON/CSV/JS、整形は `analysisToJson`）が担う。

## 5. ループ・トークン制御を調整する

| 調整したい項目 | 場所 |
|---|---|
| 最大反復回数 | `src/agent/runtime.js` の `DEFAULT_MAX_ITERATIONS`（既定30） |
| tool_result の文字数上限 | `src/agent/runtime.js` の `TOOL_RESULT_CHAR_CAP`（既定8000） |
| 会話履歴で残す直近件数 | `src/agent/compaction.js` の `COMPACT_KEEP_RECENT_MESSAGES`（既定8） |
| 1回の生成トークン上限 | `App.jsx` の `DEFAULT_MAX_TOKENS`（既定16000、API設定で変更可）／`claude-client.js` の `maxTokens` 既定 |
| 一時障害の再試行回数 | `src/agent/claude-client.js` の `DEFAULT_MAX_RETRIES`（既定3、対象は429/500/529） |
| LLMへ返すサンプル行数 | `src/tools/register-tools.js` の `LLM_SAMPLE_ROWS`（既定5） |
| 1回の統計取得上限 | `fetch_stats_data` の `maxRecords`（input、上限500000） |

これらはトークン消費・APIコスト・応答品質のトレードオフに直結します。変更時は
`test/runtime.test.js` / `test/compaction.test.js` を確認してください。

## 6. サーバー側ツールを追加する

Anthropic側で実行されるツール（client tool とは別系統）を増やす場合。e-Stat系ツールと違い
ローカルハンドラは不要で、定義を tools 配列へ連結するだけで動きます。

触るファイル: `src/tools/server-tools.js`、`src/App.jsx`、`src/components/ApiSettings.jsx`、`test/server-tools.test.js`

手順:
1. `SERVER_TOOL_DEFS` に `{ type, name }` を追加し、`buildServerTools` の分岐に加える（**順序は固定**に保つ＝
   プロンプトキャッシュのプレフィックス安定性のため）。
2. `App.jsx` にトグルの state と localStorage 永続化（`estat-agent.tools.<名前>`）、`handleSaveSettings` への保存、
   `callModel` の `buildServerTools(...)` 引数、`ApiSettings` への props を追加。
3. `ApiSettings.jsx` の「サーバー側ツール」`fieldset` にチェックボックスを追加。
4. 中断（`pause_turn`）は `runtime.js` で既に継続対応済み。新たな対応は不要。
5. ツールが結果ファイルやストリームを返す種類の場合、現状は実行ログ・UIへ反映しない方針（最終回答にのみ反映）。
   UIへ出すならレスポンスの該当ブロック（`server_tool_use` / `*_tool_result`）のパースを別途実装する。

> 注意: 型文字列（例 `code_execution_20260120`）はモデル/ベータの状況で更新され得ます。実呼び出しで
> 400（ベータヘッダ要求等）が出る場合は `claude-client.js` に `anthropic-beta` ヘッダ付与が必要になることがあります。

## 7. 新しい統計分野へ対応する

e-Stat の別の政府統計（別 `statsCode`）を扱う場合:

1. 上記2の手順でその分野のスキルを追加（対象の `statsCode`、表の選び方、コードの探し方を明記）。
2. `src/tools/estat-client.js` の正規化は**分野非依存**（取得したメタ情報の名称を基準に
   コードを名称へ結合する）設計です。`tab`/`cat01` 等の意味を固定していないため、
   多くの分野はツール追加なしで対応できます。
3. 必要なら検索/取得のデフォルト（`limit`、`maxRecords` 等）をツール定義側で調整。

## 8. 固定分析の操作を追加する

`analyze_dataset` に新しい集計操作（例: 中央値・構成比・ピボット）を増やす場合。

触るファイル: `src/analysis/operations.js`、`src/analysis/index.js`、`src/tools/register-tools.js`、`test/analysis.test.js`

手順:
1. `operations.js` に**純粋関数**を追加する。シグネチャは `(records, params) => { resultColumns, rows, warnings }`。
   同一入力→同一出力を守り、不正な列や空配列は例外でなく `warnings` へ積む（既存関数が雛形）。
2. `index.js` の `OPERATIONS` 表に `operation名: 関数` を追加（`SUPPORTED_OPERATIONS` に自動で載る）。
3. `register-tools.js` の `ANALYZE_DATASET` 入力スキーマ（`operation` の enum や必要パラメータ）を更新。
4. `test/analysis.test.js` に正常系・欠損・境界のテストを追加。

> LLMへ返すのは結果表の先頭 `LLM_RESULT_ROWS`(=50) 行までに絞られる（`register-tools.js`）。全行は `AnalysisResultStore` に保存される。

JS実行（`execute_analysis_javascript`）側の制限値（タイムアウト/入出力上限）は
`src/analysis/analysis-runner.js` の定数で調整。実行前検査の禁止トークンは `src/analysis/code-guard.js`。

## 9. デバッグシナリオを追加する

`?debug=true` のハーネスに新しい検証シナリオを追加する場合。

触るファイル: `src/test-harness/scenarios.js`（必要なら `fixtures.js`）、`test/scenarios.test.js`

手順:
1. `SCENARIOS` 配列へシナリオを追加。種別に応じて持たせるフィールドが異なる:
   - e-Stat依存: `prompt`（固定文）。
   - 保存データ依存: `requiresDataset: true` ＋ `buildPrompt(datasetId)`。
   - 内蔵データ: `seedDataset`（`fixtures.js` のデータ）＋ `buildPrompt(datasetId)`。実行前に一時投入され、終了後に削除される。
   - 疎通確認: `directPing: true`（`callClaude` を直接叩く）。
2. `expect` に `tools`（順序付き部分列）・`status`・`custom(ctx)` を定義。`custom` は
   `{ toolCalls, result, datasets, analyses }` を受け取り `{ ok, detail }` を返す。数値の正しさは
   `collectNumbers` / `approxIncludes` で結果表(rows)や最終回答と照合できる。
3. 内蔵データを使うなら `fixtures.js` に既知データと**事前計算した期待値**を足し、`test/fixtures.test.js` で
   参照実装による再計算と一致を確認（ドリフト防止）。
4. `test/scenarios.test.js` に判定の pass/fail を偽 `ctx` で検証するテストを追加。
