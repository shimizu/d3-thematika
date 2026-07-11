# 保守・制約・トラブルシューティング

## 既知の制約（仕様として理解しておく点）

1. **e-Stat アプリケーションIDはユーザー入力**
   利用者が画面の「API設定」で入力し localStorage（`estat-agent.estatAppId`）へ保存する。
   ビルド時の埋め込み共通IDは持たない。未入力では e-Stat 系ツールは実行されない。
2. **リロード直後はダウンロード不可の瞬間がある**
   生レコードは IndexedDB から非同期復元（ハイドレート）されるため、復元完了までは
   `available:false` となりCSV/JSONボタンが無効。完了すると自動で有効化される。
   別ブラウザ・別端末・IndexedDBクリア後は生レコードが無く、再取得が必要。
3. **localStorage の quota**
   会話履歴と要約を localStorage に保存する。大規模な履歴では quota 超過し得るが、
   保存失敗してもメモリ保持は継続する設計（`#persist` は例外を握りつぶす）。
4. **1回の統計取得は `maxRecords` 上限（最大500000）**
   超大規模な取得は途中で打ち切られ、`truncated` フラグが立つ。
5. **サーバー側ツールは別途課金・低速になりうる**
   Web検索・コード実行はAnthropic側で実行され、利用料が別途かかる。コード実行は実コード実行を伴うため
   応答までに時間が掛かる。既定はすべてオフ（オプトイン）。中断時は `pause_turn` 分岐で継続する。
   結果は最終回答にのみ反映し、実行ログには出さない方針。
6. **プロンプトキャッシュは無言で外れることがある**
   `system` を `cache_control` 付きで送るが、プレフィックス長がモデルの最小キャッシュ長（Sonnet 4.6 で約2048トークン）
   未満だと無言で非キャッシュになる（無害）。サーバー側ツールのトグルやモデル変更でも tools/prefix が変わりキャッシュは破棄される。
7. **隔離JS実行（`execute_analysis_javascript`）には上限がある**
   実行時間5秒・入力件数・出力サイズの上限を超えると `timeout` / `rejected` / `error` を返す（`analysis-runner.js`）。
   実行前検査（`code-guard.js`）の禁止トークン（`fetch`/`localStorage` 等）は誤操作の早期検出で、安全性の主担保は
   使い捨てWorker・CSP・タイムアウト・データ受け渡し制限の側。Worker へ APIキー/DOM/storage は渡さない。
8. **CSP は本番ビルドのみ**
   `connect-src` を Anthropic / e-Stat に限定する CSP は `vite.config.js` のプラグインがビルド時の `index.html` に注入する。
   開発（`npm run dev`）では Vite/HMR のインライン script と干渉するため適用されない。外部通信の遮断を厳密に確認するなら
   `npm run build` 後の成果物で検証する。
9. **分析ログ（AnalysisResultStore）もリロードで一時的に available:false**
   DatasetStore と同様、本体（結果表・コード）は IndexedDB から非同期復元される。復元前はエクスポート不可。
   localStorage キーは `estat-agent.analyses`。

## エラー処理の考え方

ツール実行時の失敗は例外でエージェントを止めず、`is_error: true` の tool_result として
モデルへ返します。モデルが条件を修正して再試行できるようにするためです。

| 状況 | tool_result | エージェントの想定動作 |
|---|---|---|
| 統計表が見つからない | 検索条件と0件 | 検索語・対象年を変更 |
| メタ情報に目的コードが無い | 次元一覧・検索結果 | 別の表を選択 |
| e-Statパラメータエラー | APIのステータスとメッセージ | フィルタを修正 |
| データ0件 | 使用条件 | コード・期間を修正 |
| 計測値が混在 | distinct値と警告 | 金額/数量/月などを固定 |
| 反復上限到達 | 中間結果・実行履歴 | ツール無しで1回だけ要約回答（`iteration_limit`） |

## トラブルシューティング

- **ダウンロードボタンが押せない**
  リロード直後ならハイドレート完了を待つ。別端末/別ブラウザ/履歴クリア後は生レコードが
  無いため、同じ依頼で再取得する。`DatasetStore.list()` の `available` を確認。
- **「Claude APIキーが設定されていません」**
  「API設定」からキーを入力。localStorage（`estat-agent.apiKey`）に保存される。
- **e-Stat APIエラー**
  `estat-client.js` の `unwrapResponse` が `RESULT.STATUS` を検証し、`ERROR_MSG` を投げる。
  実行ログ（ExecutionLog）の「ツール失敗」行でメッセージを確認できる。
- **CORS / ネットワーク**
  e-Statは `Access-Control-Allow-Origin: *` を返すため通常のfetchで動作。
  Claude APIは `anthropic-dangerous-direct-browser-access` ヘッダで直叩きしている。
  ブラウザやプロキシのCORSポリシー変更に注意。
- **Claude API が遅い / 429・529 が出る**
  `claude-client.js` が 429/500/529 を指数バックオフで最大3回（`Retry-After` 優先）再試行する。
  再試行中は待機が入るため応答が遅く見えることがある。上限超過時はエラーメッセージを表示。
- **コード実行ツールで 400（ベータヘッダ要求）**
  サーバー側ツールの型文字列はモデル/ベータ状況で更新され得る。`code_execution_*` で 400 が出る場合は
  `claude-client.js` に `anthropic-beta` ヘッダ付与が必要なことがある（[extending.md](./extending.md) の節6参照）。
- **ビルドしたアプリでアセットが404**
  `vite.config.js` の `base:"./"` が効いているか確認（`dist/index.html` が `./assets/...` 参照）。
- **e-Stat 取得で「Failed to fetch」（HTTPステータスが出ない）**
  e-Stat 障害時（例: 502）のエラーページには CORS ヘッダが付かないため、ブラウザが CORS でブロックし
  HTTPステータスでなく「Failed to fetch」として表面化する。サーバー側か自分側かは
  `curl "https://api.e-stat.go.jp/rest/3.0/app/json/getStatsList?appId=<ID>&searchWord=輸入&limit=1"` で切り分ける
  （502 等なら e-Stat 側障害）。正常時は `Access-Control-Allow-Origin: *` を返す。
- **デバッグモード（`?debug=true`）でテストが失敗する**
  まず先頭の「Claude API 疎通確認」で Claude 到達とキー有効性を確認。次に e-Stat 依存（検索/取得）か、
  分析（集計/JS実行）かを切り分ける。集計・JS実行は内蔵データ版（`*-builtin`）が e-Stat 非依存で実走でき、
  結果の数値まで照合する。詳細は [architecture.md](./architecture.md) の「デバッグハーネス」。

## セキュリティ留意点

- **e-Stat IDは各利用者が自分のものを入力**。不正利用などが疑われる場合は、利用者が
  e-Stat 側で**アプリケーションIDを再発行**し、「API設定」で入力し直す（コード・再デプロイ不要）。
- **Claude APIキー・e-Stat appId はブラウザの localStorage に保存**。どちらも `ApiSettings.jsx`
  の各削除ボタンで消去できる。共有端末では使用後の削除を促す。Claude APIキーは利用者個人の
  秘匿情報、appId は秘匿情報ではないが共有端末では同様に削除を推奨。

## コミット規約

コミットメッセージは以下のプレフィックスを付ける:

`feat:` 機能追加 / `fix:` バグ修正 / `docs:` ドキュメント / `refactor:` リファクタリング /
`perf:` 性能改善 / `test:` テスト / `chore:` ビルド・ライブラリ等 / `style:` 見た目

## 変更時のチェックリスト

- [ ] 該当する `test/` を更新・追加し `npm test` が全通過する
- [ ] LLMへ大量データを返していないか（要約とIDに絞る）
- [ ] UIコンポーネントにエージェント処理/API呼び出しを直書きしていないか
- [ ] localStorage/IndexedDB アクセスが非ブラウザ環境でも壊れないか（try/catch・注入）
- [ ] `npm run build` が通り、`dist/index.html` のアセット参照が相対パスのままか
