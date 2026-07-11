# アーキテクチャ

## 設計の基本方針

1. バックエンドを持たず、ブラウザ上で処理を完結させる
2. LLMをツール操作エージェントとして使う（client tool use）
3. 大量の統計データはLLMの会話履歴に入れず、ブラウザ内ストアで管理する
4. **UI（React）とエージェント中核（`src/agent`/`src/tools`/`src/data`）を分離する**

最後の点が最重要です。`src/components/` は表示と入力だけを担当し、推論・ツール実行・
データ管理・API呼び出しは React に依存しないプレーンなJSモジュールが行います。
**コンポーネント内にエージェント処理やAPI呼び出しを直接書かないでください。**

## 結線点：App.jsx

`src/App.jsx` が唯一の結線点です。次の3つのストア/レジストリを**モジュールスコープ**で
1度だけ生成します（`App.jsx` 冒頭）。

```js
const datasetStore = new DatasetStore();
const analysisStore = new AnalysisResultStore();
const conversationStore = new ConversationStore();
const toolRegistry = createAppToolRegistry(datasetStore, analysisStore);
```

`App.jsx` の主な責務:

- React 状態の保持: `messages`(表示用バブル) / `logs`(実行ログ) / `datasets` / `analyses` / `isRunning` /
  `apiKey` / `model` / `maxTokens` / サーバー側ツールのトグル（`toolWebSearch` / `toolWebFetch` / `toolCodeExec`） /
  デバッグ用 `debugStates` / `debugDatasetId`
- `datasetStore.subscribe(setDatasets)` / `analysisStore.subscribe(setAnalyses)` で一覧をUIへ反映
- `handleSubmit` でエージェントを起動し、`onEvent` をログ/途中経過へ振り分ける
- エクスポート（`handleExportDataset` / `handleExportAnalysis` / `handleExportAllAnalyses` / `handleExportReport`）、
  中断（`handleAbort`）、新しい会話（`handleReset`）
- **デバッグハーネス**（`?debug=true` のときのみ）: `runDebugScenario` / `runAllDebugScenarios` / `handleDebugReset`
  （後述「デバッグハーネス」）

## データフロー

```text
ユーザー入力（ChatPanel）
   │ onSubmit(content)
   ▼
App.handleSubmit
   │  runAgent({ instruction, messages: conversationStore.getMessages(),
   │            system: composeSystemPrompt(),
   │            callModel: callClaude(apiKey, model, maxTokens, +有効なサーバー側ツール),
   │            toolRegistry, onEvent })
   ▼
runtime.runAgent  ── compactConversation(history) で古い履歴を縮約
   │
   ├─ callModel → callClaude → Anthropic Messages API
   │
   ├─ stop_reason==="tool_use" のあいだ:
   │     onEvent(assistant_text)            … 解説テキスト→「途中経過」バブル
   │     for 各 tool_use:
   │        onEvent(tool_start)
   │        toolRegistry.execute(name,input) → estat-client / datasetStore
   │        onEvent(tool_success | tool_error)
   │     tool_result[] を会話へ積んで継続
   │
   └─ 終了（end_turn 等）→ result.{status,content,messages}
   ▼
App: 結果を messages へ反映 + conversationStore.setMessages(result.messages)
   ▼
ExecutionLog（logs）/ DatasetPanel（datasets）/ ChatPanel（messages）が再描画
```

外部I/Oは2つだけ:
- **Claude Messages API** … `src/agent/claude-client.js`（`anthropic-dangerous-direct-browser-access` ヘッダでブラウザ直叩き）。
  プロンプトキャッシュ・一時障害の再試行も担う（後述「claude-client の付加機能」）
- **e-Stat API** … `src/tools/estat-client.js`（通常のJSON fetch。e-Statが `Access-Control-Allow-Origin: *` を返すためJSONP不要）

## tool use ループ（runtime.js）

`runAgent` はAPI呼び出し（`callModel`）とツール実装（`toolRegistry`）を**注入**で受け取り、
ブラウザ非依存で単体テストできます（`test/runtime.test.js`）。

主な制御値:

| 定数 | 値 | 意味 |
|---|---:|---|
| `DEFAULT_MAX_ITERATIONS` | 30 | ループ最大反復回数 |
| `TOOL_RESULT_CHAR_CAP` | 8000 | ツール結果をLLMへ返す際の文字数上限 |
| `maxTokens`（claude-client 既定） | 16000 | 1回の生成トークン上限。API設定で変更でき、`callModel` 経由で渡される |

`stop_reason` による戻り値の分岐:

| stop_reason | result.status | 備考 |
|---|---|---|
| tool_use | （継続） | ツールを逐次実行し tool_result を積んでループ |
| pause_turn | （継続） | サーバー側ツール（web検索等）がAnthropic側で中断。追加メッセージなしで同一履歴を再送して継続 |
| end_turn | `completed` | 最終回答 |
| max_tokens | `truncated` | 生成途中で打ち切り |
| refusal | `refused` | モデルが拒否 |
| （signal中断） | `aborted` | ユーザーが中断 |
| 反復上限到達 | `iteration_limit` | ツール無しで1回だけ要約回答を生成 |

> `pause_turn` 対応がないと、サーバー側ツールの中断が `default` 分岐で `stopped` 扱いになり処理が早期終了します。
> サーバー側ツールを有効化する場合の必須対応です。

ツール例外は握りつぶさず `is_error: true` の tool_result としてモデルへ返します。
これによりモデルが条件を修正して再試行でき、エージェント全体は止まりません。

### onEvent と実行ログ

`runtime` は各段階で `onEvent` を発火します。`App.jsx` の `describeEvent` がログ文へ変換します。

| event.type | ログ表示（例） | UIの扱い |
|---|---|---|
| `model_request` | Claudeへ第N回のリクエストを送信 | ExecutionLog |
| `model_response` | Claude応答: end_turn | ExecutionLog |
| `assistant_text` | （ログには出さない） | チャットに「途中経過」バブル |
| `tool_start` | ツール開始: search_stats_tables | ExecutionLog |
| `tool_success` | ツール完了: fetch_stats_data | ExecutionLog |
| `tool_error` | ツール失敗: get_stats_metadata - … | ExecutionLog |

実行中は「途中経過」の合間も処理が続いていることを示すため、チャット末尾に
スピナー（`isRunning` 連動）を表示します（`ChatPanel.jsx` / `app.css` の `.message-spinner`）。

## サーバー側ツール（Anthropic側で実行）

e-Stat系の4ツール（client tool）とは別に、Anthropic側で実行される**サーバー側ツール**を
API設定のトグルで有効化できます。利用者が選んだ統計分析を補助する用途です。

| ツール | type | 役割 |
|---|---|---|
| Web検索 | `web_search_20260209` | 最新情報・制度/定義の調査 |
| Webページ取得 | `web_fetch_20260209` | 指定URL/PDFの本文取得 |
| コード実行 | `code_execution_20260120` | Python実行による正確・大規模な計算 |

- 定義は `src/tools/server-tools.js` に集約。`buildServerTools({webSearch,webFetch,codeExecution})` が
  トグル状態から有効なツール定義の配列を**固定順**で返す（プロンプトキャッシュのプレフィックス安定性のため）。
- **ローカルハンドラを持たない**ため `ToolRegistry` には登録しない。`App.jsx` の `callModel` クロージャで
  `request.tools`（= `toolRegistry.definitions()`）へ連結して送る。実行はAnthropic側で完結する。
- 結果は最終回答にのみ反映し、実行ログには出さない（`server_tool_use` ブロックのパースは行わない方針）。
- 既定はすべてオフ（オプトイン）。Web検索・コード実行は**別途課金**される点に注意。
- 中断時の継続は上記 `pause_turn` 分岐で扱う。

## 分析基盤（固定分析・隔離JS実行）

取得データの**決定論的な集計・検算**を担う層。LLMに数値を暗算させず、ツールの計算結果を
根拠にするための仕組みです。client tool は2種:

| ツール | 実装 | 役割 |
|---|---|---|
| `analyze_dataset` | `src/analysis/operations.js` + `index.js` | 固定の集計操作を純粋関数で実行 |
| `execute_analysis_javascript` | `src/analysis/analysis-runner.js` + `analysis-worker.js` | 固定で表現できない分析を隔離Workerで実行 |

- **固定分析（`analyze_dataset`）**: `runAnalysis({records,operation,parameters})` が操作名で関数へ振り分ける。
  対応操作は `summary` / `group_sum` / `group_average` / `ranking` / `year_over_year` / `distinct` / `validate_measure`。
  すべて副作用のない純粋関数（同一入力→同一出力）で `test/analysis.test.js` が網羅。
- **隔離JS実行（`execute_analysis_javascript`）**: メイン側 `analysis-runner.js` が
  `datasetStore.get(datasetId)` のレコードを **structured clone で使い捨て Web Worker へ渡し**、
  生成 `analyze({records,columns,metadata,datasets,args})` を実行。`datasetIds` 指定時は複数データセットを
  `datasets[datasetId]` から参照できる。完了/失敗/タイムアウトのいずれでも `terminate()`。
  - 制限: 実行時間5秒・入力件数上限・出力サイズ上限・出力のJSON互換検証。
  - 実行前検査（`code-guard.js`）: `fetch`/`WebSocket`/`localStorage`/`indexedDB`/動的`import` 等の禁止トークンを拒否（補助策）。
  - Worker へは **APIキー・DOM・localStorage・IndexedDB を渡さない**。外部通信は本番ビルドのCSP（後述）でも遮断。
- **Claudeへ返すのは要約のみ**: 両ツールとも `datasetId`・`analysisId`・結果表（先頭 `LLM_RESULT_ROWS=50` 行）・
  警告だけを返し、全行や生成コード全文は会話履歴に入れない（[トークン抑制](#トークン肥大の抑制3層)の方針と同じ）。
- **CSP**: `vite.config.js` のプラグインが本番ビルドの `index.html` に
  `connect-src 'self' https://api.anthropic.com https://api.e-stat.go.jp` 等を注入し、隔離コードからの
  外部送信を遮断する（開発時=serve には注入しない。Vite/HMR のインライン script と干渉するため）。

分析結果は生データと別の `AnalysisResultStore`（後述）へ記録し、`analysisId` でレポートと紐付けできます。

## claude-client の付加機能（プロンプトキャッシュ・再試行）

`src/agent/claude-client.js` は素のfetchに加えて次を担う:

- **プロンプトキャッシュ**: `system`（文字列）を `cache_control: {type:"ephemeral"}` 付きの
  テキストブロックに包んで送る。レンダー順は tools → system のため、systemブロックの
  ブレークポイントで tools+system プレフィックスがまとめてキャッシュされ、反復呼び出しの入力コストを抑える。
- **一時障害の再試行**: HTTP 429 / 500 / 529 を指数バックオフで最大3回再試行（`Retry-After` ヘッダ優先）。
  待機中も `signal` を監視し、中断時は即 `AbortError`。4xx（429除く）は再試行せず即エラー。
- `maxTokens`・`maxRetries`・`fetchImpl` を引数で受け取り、テスト時に差し替え可能
  （`test/claude-client.test.js` がモックfetchで検証）。

## トークン肥大の抑制（3層）

大量の統計データを**LLMの会話履歴に入れない**ことが全体の肝です。

1. **`fetch_stats_data` は要約だけ返す**（`src/tools/register-tools.js`）
   全レコードは `datasetStore.add()` でストアに保存し、LLMには `datasetId`・列名・
   サンプル数行（`LLM_SAMPLE_ROWS = 5`）だけを返す。詳細が要るときモデルは `inspect_dataset` を呼ぶ。
2. **tool_result の文字数上限**（`runtime.js` の `TOOL_RESULT_CHAR_CAP = 8000`）で一律に打ち切る。
3. **会話履歴のコンパクション**（`src/agent/compaction.js`）
   直近 `COMPACT_KEEP_RECENT_MESSAGES = 8` 件以外の古い tool_result 本文をプレースホルダへ置換。
   tool_use と tool_result のブロック対応・IDは保持するため整合性は崩れない。元配列は非破壊。

## 状態管理と永続化

### DatasetStore（src/data/dataset-store.js + idb.js）

取得データのブラウザ内ストア。**二段構えの永続化**:

- **生レコード** → IndexedDB（DB `estat-agent` / ストア `datasets`）。容量が大きいため。
- **要約**（タイトル・件数・列など）→ localStorage（キー `estat-agent.datasets`）。初回描画の高速化用。

同期APIを保ちつつ、コンストラクタで `#hydrate()`（IndexedDBから生レコードを非同期復元）を呼ぶ。
`list()` が返す `available` フラグは「生レコードがメモリにあるか」を示し、リロード直後は
`false` → ハイドレート完了で `#notify()` → `true` に戻る（ダウンロードボタンの活性はこれに連動）。
`idb.js` はIndexedDB不在環境（Nodeテスト）で安全にno-opします。
`idb.js` は `DB_VERSION=2` で `datasets` と `analyses` の2ストアを持ち、`onupgradeneeded` で冪等に用意します。

主なメソッド: `add` / `get` / `list` / `inspect(id,{sampleSize,distinctColumn})` / `remove(id)` / `clear` / `subscribe`。
（`remove(id)` は単体削除。デバッグハーネスが一時投入したフィクスチャの後始末などに使う。）

### AnalysisResultStore（src/data/analysis-store.js）

分析結果ログのストア。`DatasetStore` と同じ二段構えの永続化:

- **本体**（パラメータ・結果表 `rows`・警告・JS実行コード全文）→ IndexedDB（ストア `analyses`）。
- **要約**（`analysisId` / `datasetId` / 種別 / 操作名またはコードハッシュ / 件数 / 成否 / 実行日時）→
  localStorage（キー `estat-agent.analyses`）。

`analyze_dataset` / `execute_analysis_javascript` の handler が `add({kind:"fixed"|"javascript", ...})` で記録し、
採番した `analysisId` をツール結果へ含めます。`list()` の `available` は本体がメモリにあるか（DatasetStore と同様）。
`AnalysisPanel` はこのストアを購読し、ログ単位の JSON/CSV、JS実行ログの `.js`（コード本文）、全ログ一括JSONを
エクスポートできます（整形は `src/utils/export.js` の `analysisToJson` ＋ `recordsToCsv`）。

### ConversationStore（src/agent/conversation-store.js）

Anthropic形式の messages 配列を localStorage（キー `estat-agent.conversation`）へ永続化。
Claude APIはステートレスなので、会話継続は**この配列を毎回送り直す**ことで実現します。
`App.jsx` は `runAgent` の戻り `messages` を `conversationStore.setMessages` へ書き戻します。

### ストア注入パターン

`DatasetStore` / `ConversationStore` はともに `constructor({ storage })` でストレージを
注入可能にし、未指定時のみ `globalThis.localStorage` を try/catch で解決します。
これによりテストや非ブラウザ環境でも動作します。

## スキルとシステムプロンプト

`src/agent/system-prompt.js` の `composeSystemPrompt(skills)` が `BASE_SYSTEM_PROMPT` に
分野別スキル（現状は `src/agent/skills/jp-trade-stats.js` の貿易統計手順知識）を `---` で連結します。
スキルは「ツールの使い方・判断基準」をLLMへ与えるもので、実行能力はツールが提供します。
複数スキル・自動選択への拡張余地として配列で受ける設計です（詳細は [extending.md](./extending.md)）。

## デバッグハーネス（?debug=true）

実APIで「エージェントが正しいツールを正しい順序で使えているか」を観測・検証する開発用機能。
本番と同じ `index.html` に `?debug=true` でアクセスしたときだけ有効になり、通常利用者には影響しません。

- `App.jsx` 冒頭の `IS_DEBUG`（`URLSearchParams` 判定）が真のとき、メイン列の `ChatPanel`（統計分析チャット）と
  サイドの `ExecutionLog`（実行ログ）を隠し、代わりに `DebugPanel` を表示する。APIキーは本番と共通（`estat-agent.apiKey`）。
- `runDebugScenario(scenario)` が**本番経路そのもの**（実 `callClaude`・共有ストア・実Worker）でシナリオを実行し、
  `onEvent` の `tool_start` 列を収集。`messages:[]` で実行するため会話履歴は汚さない。
- 判定（`src/test-harness/scenarios.js`）: `evaluateScenario` が「期待ツールの**順序付き部分列**一致（`isSubsequence`）」
  「終了状態」「`custom(ctx)`（数値の正しさ等）」を照合し pass/fail を返す。`ctx` には `toolCalls` / `result` /
  `datasets` / `analyses`（rows 含む完全ログ）が入る。
- シナリオの種別:
  - **e-Stat依存**（`prompt`）: 疎通確認・検索・取得。e-Stat 稼働が前提。
  - **保存データ依存**（`requiresDataset` + `buildPrompt(datasetId)`）: 取得済みデータセットを対象に集計/JS実行。
  - **内蔵データ**（`seedDataset` + `buildPrompt`）: `fixtures.js` の既知データを実行前に `datasetStore.add` で一時投入し、
    終了後 `datasetStore.remove` で後始末。e-Stat 非依存で、結果の数値を期待値と許容誤差で照合できる。
  - **疎通確認**（`directPing`）: `runAgent` を通さず `callClaude` を直接叩く軽量チェック。
- 「リセット」（赤ボタン）で `debugStates`・データセット・分析ログを一括クリア。
- 判定ロジック・フィクスチャ・期待値は `test/scenarios.test.js` / `test/fixtures.test.js` がネットワーク非依存で検証する
  （期待値は参照実装で再計算しドリフトを防止）。
