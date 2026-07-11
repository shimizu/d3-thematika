# e-Stat 自律分析エージェント

## このプロジェクトについて

Claude APIを利用し、ブラウザだけで動作するAIエージェント。バックエンドは持たず、
LLMへのclient tool useループ、e-Stat APIの呼び出し、データの分析・保存まで、
すべてフロントエンド（React + Vite）で完結する。

利用者が自然言語で依頼すると、エージェントが政府統計総合窓口（e-Stat）のWeb APIから
統計データを取得し、ブラウザ内の決定論的な分析ツールで集計・検算したうえで、その結果を
根拠に回答する。手順（統計表検索→メタ情報確認→データ取得→確認→分析→出力）は
エージェントが自律的に判断して実行する。

## 主な機能

- **自律的なツール利用** — エージェントが結果やエラーを確認しながら、必要なツールを
  選択して反復実行する（client tool useループ）
- **e-Stat連携** — 統計表検索、メタ情報取得、統計データ取得（`NEXT_KEY`継続取得・
  コードと名称の正規化）
- **コンテキスト肥大の抑制** — 大量レコードは会話履歴に入れず Dataset Store に保存し、
  LLMには要約とサンプル数行のみを返す。必要時に `inspect_dataset` で参照する
- **決定論的な分析基盤**
  - `analyze_dataset` … 合計・group-by・平均・ランキング・前年比・distinct・
    単位混在検査の固定分析
  - `execute_analysis_javascript` … 生成したJavaScriptを使い捨てWeb Workerで隔離実行
    （タイムアウト／入出力上限／実行前検査／CSP）
  - 分析結果は AnalysisResultStore に記録し、JSON/CSV/JS でエクスポートできる
- **ブラウザ内データ管理** — メモリ + IndexedDB + localStorage の二段永続化、
  データセット一覧・実行ログ、CSV・JSON・Markdown出力
- **開発用デバッグハーネス**（`?debug=true`） — 実APIでエージェントのツール利用を
  観測・判定する

設計の詳細・拡張方法・運用は [docs/](./docs/) を参照。

## 開発

必要環境:

- Node.js 20.19以降、または22.12以降
- npm

依存関係をインストールする:

```bash
npm install
```

開発サーバーを起動する:

```bash
npm run dev
```

テストと本番ビルド:

```bash
npm test
npm run build
```

ブラウザで利用する際は、画面の「API設定」から利用者自身のClaude APIキーと
e-Stat アプリケーションID（https://www.e-stat.go.jp/api/ で発行）を入力する。
どちらもこのブラウザのlocalStorageに保存され、リロード後も復元される。

## APIと認証情報の扱い

### e-Stat API

e-Stat APIのアプリケーションIDは、ブラウザからAPIリクエストを送る際にリクエストへ
含める必要がある。

このアプリケーションIDは、Claude APIキーと同様に利用者が画面の「API設定」で入力し、
このブラウザのlocalStorage（`estat-agent.estatAppId`）に保存して使う。バンドルへの
埋め込みや全利用者共通のIDは持たない。各利用者が自分のIDを
[e-Stat API](https://www.e-stat.go.jp/api/)で発行して使うため、利用量・利用制限・
IDの停止といった影響は各利用者ごとに分離される。

IDが未入力のときは、e-Stat 系のツール（検索・取得・疎通確認）は実行せず、画面で
入力を案内する。なお appId は秘匿情報ではないが、保存先のブラウザを共有する場合は
「削除」で消去できる。

### Claude API

Claude APIキーはアプリケーションに埋め込まず、利用者がブラウザでアクセスした際に
入力する。e-Stat APIのアプリケーションIDとは異なり、Claude APIキーは利用者個人の
秘匿情報として扱う。

ブラウザへ保存する場合は、保存先、削除方法、第三者が同じブラウザを操作した場合の
リスクを画面上で明示する。
