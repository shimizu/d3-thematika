# ツール仕様（Claude API に提供する tools）

このドキュメントは、エージェント（Claude Messages API）へ `tools` として渡しているツールの一覧と詳細をまとめたものです。各ツールの入力スキーマ・返却内容・実装上の制約・関連する設計上の防御策を記載します。

ツールは大きく 2 系統あります。

| 系統 | 実行場所 | 登録元 | 備考 |
|---|---|---|---|
| **クライアントツール（6種）** | ブラウザ（ローカル） | `src/tools/register-tools.js` → `ToolRegistry` | `tool_use` を受けて `runAgent` がローカル実装を実行し `tool_result` を返す |
| **サーバーツール（最大3種）** | Anthropic 側 | `src/tools/server-tools.js` → `buildServerTools` | ローカル実装を持たず、画面トグルで有効化したものだけ `tools` 配列へ連結 |

> tool use ループの全体挙動・コンテキスト肥大の抑制方針は [architecture.md](./architecture.md) を参照。新しいツールの追加手順は [extending.md](./extending.md) を参照。

---

## ツールが Claude へ渡るまで

1. `createAppToolRegistry(datasetStore, analysisStore, { estatAppId })`（`src/tools/register-tools.js`）が **クライアントツール6種を `ToolRegistry` に登録**する。`estatAppId` はクロージャで束縛される（appId 変更時に `App.jsx` の `useMemo` でレジストリ再生成）。
2. `runAgent`（`src/agent/runtime.js`）が API 呼び出しのたびに `tools: toolRegistry.definitions()` を送る（`runtime.js:64`）。
3. `App.jsx` の `callModel` クロージャが、`request.tools`（=クライアント定義）へ `buildServerTools({ webSearch, webFetch, codeExecution })` の結果を**連結**して `callClaude` へ渡す（`App.jsx:548-562`）。
4. `stop_reason === "tool_use"` の間、ローカルツールは**逐次**実行され、結果は `tool_result` として会話へ積まれる。サーバーツールは Anthropic 側で実行される。

### コンテキスト肥大に対する多重防御（ツールに関わる部分）

- `fetch_stats_data` / `analyze_dataset` / `execute_analysis_javascript` は**全データを LLM へ返さない**。生データはストアへ保存し、識別子＋要約＋サンプルのみを返す。
- ツール結果は一律 `TOOL_RESULT_CHAR_CAP = 8000` 文字で打ち切り（`runtime.js`）。
- 会話履歴の古い `tool_result` 本文はコンパクションでプレースホルダ化（`src/agent/compaction.js`）。

関連定数（`src/tools/register-tools.js`）:

| 定数 | 値 | 用途 |
|---|---|---|
| `LLM_SAMPLE_ROWS` | 5 | `fetch_stats_data` が返すサンプル行数 |
| `LLM_RESULT_ROWS` | 50 | 分析系ツールが返す結果行の上限 |

---

## クライアントツール

### 1. `search_stats_tables`

e-Stat の統計表をキーワード・政府統計コード・調査年月で検索する。**分析対象の `statsDataId` を特定する最初の段階**で使う。

- **実装**: `searchStatsTables`（`src/tools/estat-client.js`）→ e-Stat `getStatsList`
- **入力スキーマ**:

| プロパティ | 型 | 必須 | 説明 |
|---|---|---|---|
| `searchWord` | string | - | 統計表の検索キーワード |
| `statsCode` | string | - | 政府統計コード |
| `surveyYears` | string | - | 調査年月。公式形式は `yyyy` / `yyyymm` / `yyyymm-yyyymm`。利便性のため `yyyy-yyyy` も受け付ける（pattern 検証あり） |
| `limit` | integer (1–100) | - | 取得件数（未指定時は実装側で 30） |
| `startPosition` | integer (≥1) | - | 前回検索が返した `nextKey`。初回は指定しない |

- **返却**: `{ count, total, nextKey, tables[] }`。`tables[]` は `{ statsDataId, title, cycle, surveyDate, updated, rows }`。`title` は統計名・表題・表名を `" / "` 連結。
- **補足**: `surveyYears` は `yyyy-yyyy` を公式形式の `yyyy01-yyyy12` に正規化（`normalizeSurveyYears`）。`explanationGetFlg: "N"` で説明文を抑制。

### 2. `get_stats_metadata`

指定統計表の次元・分類コード・地域/時間コード・単位を取得する。**データ取得前に必ず実行し、コードを推測せず確認する**。

- **実装**: `getStatsMetadata`（`src/tools/estat-client.js`）→ e-Stat `getMetaInfo`
- **入力スキーマ**:

| プロパティ | 型 | 必須 | 説明 |
|---|---|---|---|
| `statsDataId` | string | ✓ | 対象統計表 ID |
| `query` | string | - | コードまたは名称で絞り込む検索文字列（日本語ロケールで小文字化して部分一致） |
| `limitPerDimension` | integer (1–100) | - | 次元ごとの項目数上限（未指定時は実装側で 30） |

- **返却**: `{ statsDataId, dimensions[] }`。各 dimension は `{ paramId, name, itemCount, matchedCount, items[] }`、`items[]` は `{ code, name, level, unit, parentCode, addInf }`。`query` 指定時は一致項目のみを `limitPerDimension` 件まで返す。

### 3. `fetch_stats_data`

確認済みの分類コードで統計データを取得し、ブラウザ内 Dataset Store へ保存する。返却 `datasetId` を後続分析に使う。

- **実装**: `fetchStatsData`（`src/tools/estat-client.js`）→ e-Stat `getStatsData` を `NEXT_KEY` が続く限りページング取得（`PAGE_SIZE = 100000`）。取得後 `datasetStore.add(dataset)` で保存。
- **入力スキーマ**:

| プロパティ | 型 | 必須 | 説明 |
|---|---|---|---|
| `statsDataId` | string | ✓ | 対象統計表 ID |
| `filters` | object | ✓ | `cdCat01` / `cdArea` / `cdTimeFrom` / `lvCat01` 等の e-Stat API フィルタ。値は string か number |
| `maxRecords` | integer (1–500000) | - | 取得上限（未指定時 500000）。到達でページング停止し `truncated: true` |

- **返却（LLM へ）**: `{ datasetId, statsDataId, title, recordCount, columns, measures, sample, truncated }`。**全レコードは返さず** `sample` は先頭 `LLM_SAMPLE_ROWS`(=5) 行のみ。
- **正規化**: `normalizeRecord` が `$` を数値 `value`（空/null は `null`）へ、`@xxx` を次元コード列へ、分類名を `{dimension}_name` 列へ展開。`measures` は `tab`（無ければ `cat02`）を計測キーとして `{ code, name, unit }` を収集。
- **フィルタ仕様**: 公式APIでは事項ごとに `lv<事項>` / `cd<事項>` / `cd<事項>From` / `cd<事項>To` を指定する。`cd` は単一コードまたはカンマ区切り最大100個。同一事項で `lv` と `cd`、または `cd` と `From/To` を併用すると AND 条件。

### 4. `inspect_dataset`

Dataset Store 保存済みデータの列・件数・サンプル・指定列の distinct 値を確認する。大量の生データを取得せず、分析前の構造確認に使う。

- **実装**: `datasetStore.inspect(datasetId, input)`（`src/data/dataset-store.js`）
- **入力スキーマ**:

| プロパティ | 型 | 必須 | 説明 |
|---|---|---|---|
| `datasetId` | string | ✓ | 対象データセット ID |
| `sampleSize` | integer (0–20) | - | 返すサンプル行数 |
| `distinctColumn` | string | - | distinct 値を集計する列名 |

### 5. `analyze_dataset`

保存済み全レコードに対して**決定論的な固定集計**を行う。合計・平均・group-by・ランキング・前年比・distinct・単位混在検査を正確に計算する。**数値を回答する前に必ず使い、サンプル行から全体値を推測しない**。

- **実装**: `runAnalysis`（`src/analysis/index.js`）が `operation` を純粋関数へディスパッチ（`src/analysis/operations.js`）。結果は `AnalysisResultStore` へ記録し `analysisId` を発行。
- **入力スキーマ**:

| プロパティ | 型 | 必須 | 説明 |
|---|---|---|---|
| `datasetId` | string | ✓ | `fetch_stats_data` が返した ID |
| `operation` | string (enum) | ✓ | 下表の操作名 |
| `groupBy` | string[] | - | `group_sum`/`group_average`/`year_over_year` の集計キー列 |
| `valueColumn` | string | - | 集計対象の数値列（既定 `value`） |
| `column` | string | - | `distinct` の対象列 |
| `yearColumn` | string | - | `year_over_year` の年を含む列（既定 `time`） |
| `unitColumn` | string | - | `validate_measure` の単位列（既定 `unit`） |
| `measureColumn` | string | - | `validate_measure` で併せて確認する計測値列（任意） |
| `sort` | "asc"\|"desc" | - | group 集計の並び順（既定 `desc`） |
| `direction` | "asc"\|"desc" | - | `ranking` の方向（`desc`=上位、`asc`=下位） |
| `limit` | integer (≥1) | - | 結果件数の上限 |

- **`operation`（`SUPPORTED_OPERATIONS`）**:

| operation | 内容 | 主な結果列 |
|---|---|---|
| `summary` | 件数・欠損数・min・max・sum・average | `count, missing, min, max, sum, average` |
| `group_sum` | `groupBy` 単位の合計 | `…groupBy, sum, count` |
| `group_average` | `groupBy` 単位の平均 | `…groupBy, average, count` |
| `ranking` | 値の上位/下位ランキング（既定 limit 20） | `rank, …labels, value` |
| `year_over_year` | 年（列先頭4桁）ごとの合計と前年差分・増減率 | `…groupBy, year, value, previousValue, diff, rate` |
| `distinct` | 指定列の distinct 値と件数（件数降順） | `value, count` |
| `validate_measure` | 単位/計測値の混在検査（複数種で警告） | `column, distinctCount, values` |

- **返却（LLM へ）**: `{ analysisId, datasetId, operation, sourceRecordCount, parameters, resultColumns, rows, rowCount, truncatedRows, warnings, computedAt }`。`rows` は先頭 `LLM_RESULT_ROWS`(=50) 件まで、超過時 `truncatedRows: true`。全行はストアに残る。
- **共通挙動**: 列欠損・件数超過・年解釈失敗・単位混在などは `warnings` に積む（処理は止めない）。欠損値（null/空文字/非有限数）は集計から除外。

### 6. `execute_analysis_javascript`

固定の `analyze_dataset` で表現できない高度な分析を、**隔離された使い捨て Web Worker 上で JavaScript として実行**する。まず `analyze_dataset` で足りるか検討し、必要な場合のみ使う。

- **実装**: `runAnalysisCode`（`src/analysis/analysis-runner.js`）が Worker（`analysis-worker.js`）でコードを実行。結果は `AnalysisResultStore` へ記録。
- **コード形式**: `function analyze({ records, columns, metadata, datasets, args }) { return { columns, rows, notes }; }`
  - `records` / `columns` / `metadata` は主 `datasetId` のデータ。
  - 複数データセットを比較する場合は `datasetIds` を指定し、`datasets[datasetId].records` を参照する。
  - **先頭行に分析の目的を日本語コメント（例 `// 目的: ...`）で必ず記述**する。分析ログのエクスポート時の識別に使われる。
- **入力スキーマ**:

| プロパティ | 型 | 必須 | 説明 |
|---|---|---|---|
| `datasetId` | string | ✓ | `fetch_stats_data` が返した ID |
| `datasetIds` | string[] | - | 同じJS分析で参照する保存済みデータセットID配列。省略時は `datasetId` のみ |
| `code` | string | ✓ | `analyze` を定義する JS。先頭行に目的コメント必須 |
| `args` | object | - | `analyze` へ渡す追加引数（任意） |

- **返却（LLM へ）**: `{ analysisId, datasetId, operation: null, sourceRecordCount, parameters, resultColumns, rows, rowCount, truncatedRows, warnings, computedAt, status, durationMs, error? }`。`status` は `success` / `rejected` / `timeout` / `error`。**コード全文は LLM へ返さない**。
- **安全制約（多重防御）**:

| 防御 | 実装 | 既定値 |
|---|---|---|
| 実行前トークン検査 | `inspectCode`（`src/analysis/code-guard.js`） | `fetch`/`WebSocket`/`XMLHttpRequest`/`EventSource`/`importScripts`/動的 `import`/`indexedDB`/`localStorage`/`sessionStorage`/`postMessage` を拒否 |
| 入力件数上限 | `runAnalysisCode` | `maxInputRecords = 200000`。`datasetIds` 指定時は全データセットの合算件数 |
| 実行タイムアウト | 使い捨て Worker をタイムアウトで terminate | `timeoutMs = 5000` |
| 出力サイズ上限 | UTF-8 バイト数で検査 | `maxOutputBytes = 1,000,000` |
| 出力の JSON 互換性 | `JSON.parse(JSON.stringify(...))` で関数/undefined/循環を排除 | - |

  > 文字列検査は誤操作の早期検出にすぎず、主防御は使い捨て Worker・CSP・タイムアウト・データ受け渡し制限。ネットワーク/ストレージ API は使用不可。

---

## サーバーツール（Anthropic 側で実行）

`src/tools/server-tools.js` の `SERVER_TOOL_DEFS` に宣言。**ローカルハンドラを持たない**ため `ToolRegistry` には登録せず、`App.jsx` の `callModel` で `tools` 配列へ連結する。画面トグルで個別に有効化でき、有効化したものだけが送られる。

| キー | `type`（GA版型文字列） | `name` | トグルの localStorage キー |
|---|---|---|---|
| `webSearch` | `web_search_20260209` | `web_search` | `estat-agent.tools.webSearch` |
| `webFetch` | `web_fetch_20260209` | `web_fetch` | `estat-agent.tools.webFetch` |
| `codeExecution` | `code_execution_20260120` | `code_execution` | `estat-agent.tools.codeExecution` |

- **組み立て**: `buildServerTools({ webSearch, webFetch, codeExecution })` が **固定順（webSearch → webFetch → codeExecution）** で配列化する。出力順を固定することで、同じトグルなら同じ配列となり**プロンプトキャッシュのプレフィックス安定性**を保つ。
- 詳細はそれぞれ Anthropic のサーバーツール（web search / web fetch / code execution）の仕様に従う。

---

## 関連ファイル

| ファイル | 役割 |
|---|---|
| `src/tools/register-tools.js` | クライアントツール6種の定義＋ハンドラ登録 |
| `src/agent/tool-registry.js` | 定義と実装を 1 対 1 管理する `ToolRegistry` |
| `src/tools/estat-client.js` | e-Stat API 呼び出し・正規化・ページング |
| `src/analysis/index.js` / `operations.js` | 固定分析のディスパッチと純粋関数群 |
| `src/analysis/analysis-runner.js` / `analysis-worker.js` / `code-guard.js` | 隔離 JS 実行と事前検査 |
| `src/tools/server-tools.js` | サーバーツール宣言とトグル連結 |
| `src/agent/runtime.js` | tool use ループ・結果文字数キャップ |
</content>
</invoke>
