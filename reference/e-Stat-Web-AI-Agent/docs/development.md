# 開発・ビルド・デプロイ

## 必要環境

- Node.js 20.19 以降、または 22.12 以降（Vite 8 の要件）
- npm

## セットアップ

```bash
npm install
```

e-Stat アプリケーションIDと Claude APIキーは `.env` ではなく、起動後に画面の
「API設定」で入力します（どちらも localStorage に保存）。ビルド時に埋め込む共通IDは
ありません。

## コマンド

| コマンド | 内容 |
|---|---|
| `npm run dev` | Vite 開発サーバー（HMR）。`vite.config.js` で port 3000 を指定（使用中なら自動で次のポート） |
| `npm run build` | 本番ビルド（`dist/` を生成）。`index.html` へ CSP の meta を注入 |
| `npm run preview` | ビルド成果物のローカルプレビュー |
| `npm test` | 全テスト（Node 標準の `node --test`） |

### 単一テストの実行

```bash
node --test test/runtime.test.js
```

### デバッグモード（エージェントのツール利用検証）

`http://localhost:3000/?debug=true` でアクセスすると、統計分析チャットの代わりに **デバッグパネル**が表示され、
実APIキー（本番と共通の `estat-agent.apiKey`）でシナリオを実行してツール利用を観測・判定できます。
e-Stat 系シナリオ（疎通確認・取得）は `estat-agent.estatAppId` の入力も必要です。
仕組みは [architecture.md](./architecture.md) の「デバッグハーネス」を参照。シナリオの追加は [extending.md](./extending.md)。

## e-Stat アプリケーションID（ユーザー入力）

- ビルド時の埋め込み（旧 `VITE_ESTAT_APP_ID` / `src/config.js`）は廃止しました。
- 利用者が画面の「API設定」で入力し、localStorage（`estat-agent.estatAppId`）へ保存します。
- `App.jsx` が `createAppToolRegistry(datasetStore, analysisStore, { estatAppId })` で appId を
  ツールへクロージャ束縛し（`estatAppId` 変更時に `useMemo` でレジストリ再生成）、
  `src/tools/estat-client.js` の各関数が options 経由で受け取ります。
- 未入力時は e-Stat 系ツール（検索・取得・疎通確認）を実行せず、画面で入力を案内します。

## Claude APIキー

- アプリには埋め込みません。画面右上の「API設定」から**利用者が入力**します。
- localStorage へ保存。「キー削除」で APIキーのみ消去可能。設定項目とキーの対応:

  | 設定 | localStorage キー | 既定 |
  |---|---|---|
  | Claude APIキー | `estat-agent.apiKey` | （空） |
  | モデル | `estat-agent.model` | `claude-sonnet-4-6` |
  | max_tokens | `estat-agent.maxTokens` | `16000` |
  | Web検索（サーバー側ツール） | `estat-agent.tools.webSearch` | `false` |
  | Webページ取得（サーバー側ツール） | `estat-agent.tools.webFetch` | `false` |
  | コード実行（サーバー側ツール） | `estat-agent.tools.codeExecution` | `false` |

- `src/agent/claude-client.js` が `x-api-key` と `anthropic-dangerous-direct-browser-access: true`
  ヘッダを付けてブラウザから直接 Messages API を呼びます。プロンプトキャッシュと
  一時障害（429/500/529）の再試行も担います（[architecture.md](./architecture.md) 参照）。
- 既定モデルは `App.jsx` の `DEFAULT_MODEL`（現状 `claude-sonnet-4-6`）、既定 max_tokens は `DEFAULT_MAX_TOKENS`（16000）。
- サーバー側ツール（Web検索 / Webページ取得 / コード実行）はAnthropic側で実行されます。
  既定はオフで、Web検索・コード実行は別途課金されます。

## ビルドとデプロイ

```bash
npm run build   # dist/ を生成
```

- `vite.config.js` で `base: "./"` を設定済みのため、ビルド出力のアセット参照は
  `./assets/...`（相対パス）になります。**任意の階層（サブディレクトリ）に配置しても動作**します。
- `dist/` を静的ファイルとして任意のホスティングへ配置するだけです（サーバーサイド処理は不要）。
- 動作確認の例:
  ```bash
  npm run preview
  # もしくはサブパス配置を再現
  # dist/ を任意のサブディレクトリに置いて静的配信し、アセットが404にならないか確認
  ```

## テスト方針

- `node --test` のみで完結し、ブラウザを必要としません。
- ブラウザAPI依存（localStorage / IndexedDB / fetch）は、ストアの注入や no-op フォールバックで
  吸収しているため、純粋なロジックを検証できます。
- DOM操作を伴う処理（`downloadText` など）は単体テスト対象外です。
- lint ツールは未導入です。

### テスト一覧

| ファイル | 検証対象 |
|---|---|
| `test/runtime.test.js` | tool use 反復、`is_error` 返却、反復上限、終了条件分岐、`assistant_text` 通知、結果切り詰め、`pause_turn` 継続 |
| `test/claude-client.test.js` | systemのcache_control包み、max_tokens上書き、429/529の再試行と上限、4xx即エラー、APIキー未設定 |
| `test/server-tools.test.js` | トグル→定義配列の組み立て（固定順・空配列・type/name存在） |
| `test/estat-client.test.js` | クエリ構築、年範囲正規化、HTTPエラー、検索/メタ要約、NEXT_KEYページングと名称結合 |
| `test/dataset-store.test.js` | add/list/inspect(distinct)、変更通知 |
| `test/conversation-store.test.js` | setMessages/復元、clear、subscribe |
| `test/compaction.test.js` | 古い tool_result の縮約、直近保持、非破壊 |
| `test/export.test.js` | CSV生成（RFC4180エスケープ・欠損）、ファイル名サニタイズ |
| `test/system-prompt.test.js` | 基本プロンプト + スキル連結、スキル差し替え |
| `test/tool-registry.test.js` | register/definitions/execute、未登録ツール拒否 |
| `test/analysis.test.js` | 固定分析の各操作（合計/group-by/平均/ランキング/前年比/distinct/単位混在）と `runAnalysis` |
| `test/analysis-store.test.js` | AnalysisResultStore の add/list/get、採番、available、永続化、subscribe |
| `test/analysis-runner.test.js` | 隔離JS実行：正常/例外/タイムアウト/出力上限/入力上限/実行前検査、code-guard |
| `test/register-tools.test.js` | analyze_dataset / execute_analysis_javascript の登録・記録・要約返却 |
| `test/scenarios.test.js` | デバッグハーネスの判定（部分列一致・status・custom・各シナリオ） |
| `test/fixtures.test.js` | 内蔵フィクスチャの期待値整合（参照実装で再計算 + `runUserCode` 二重確認） |

現在 `npm test` は全105件パス。
