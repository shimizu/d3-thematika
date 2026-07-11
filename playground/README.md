# d3-thematika AI プレイグラウンド

GeoJSONをアップロードして自然言語で指示すると、AIエージェントがd3-thematikaの描画コードを生成し、プレビューで確認できるブラウザ完結型の実験環境です。完成した地図は index.html / style.css / script.js / データ一式のzipとしてエクスポートできます。

AIエージェントの仕組み（Claude Messages APIへのclient tool useループ、APIキーのlocalStorage管理）は [e-Stat-Web-AI-Agent](https://github.com/shimizu/e-Stat-Web-AI-Agent) を踏襲しています。バックエンドは持ちません。

## 起動

```bash
npm run playground
```

ビルド後にサーバーが起動し、`http://localhost:3001/playground/` が自動で開きます。

> **Note**: `npm run dev` は `site/` のみを配信するため、プレイグラウンドは表示できません。必ず `npm run playground` を使用してください。

## 使い方

1. **API設定** — 画面右上の「API設定」からClaude APIキーを入力する（[platform.claude.com](https://platform.claude.com/) で取得）。キーはこのブラウザのlocalStorageにのみ保存される。共有端末では使用後に「キーを削除」すること
2. **データ** — 左上のデータパネルにGeoJSONファイルをアップロード（ファイル選択またはドラッグ&ドロップ）。アップロード時に D3 互換へ自動変換される（ワインディング順序の反転 + 空座標の除去。`scripts/fix-geojson-winding.js --d3` と同じ変換）。プレビューもエクスポートも変換済みデータを使う
3. **チャット** — 作りたい地図を日本語で指示する（例:「都道府県を人口で5階級のコロプレスに。タイトルと凡例付きで」）。エージェントがデータを確認し、コードを生成してプレビューで動作確認し、エラーがあれば自己修正する
4. **微調整** — 生成されたコードは中央のエディタ（HTML/CSS/JS）で手動編集できる。「実行」または `Ctrl+Enter` でプレビューを更新。追加の変更をチャットで指示することもできる（エージェントは手動編集後のコードを読んでから修正する）
5. **エクスポート** — 「エクスポート」で自己完結のzipをダウンロード。解凍して `npx serve .` で配信すればプレビューと同一の地図が表示される

## 画面構成

| ペイン | 内容 |
|--------|------|
| 左 | データパネル（アップロード・一覧）+ チャット（実行ログ折りたたみ付き） |
| 中央 | HTML / CSS / JS エディタ（タブ切替） |
| 右 | プレビュー / コンソール（タブ切替） |

## アーキテクチャ

```
playground/
  index.html / playground.css   # UI
  js/
    app.js                      # 結線点（ストア生成・イベント配線）
    agent/                      # エージェント中核（e-Stat-Web-AI-Agentから移植）
      claude-client.js          #   Claude Messages API（リトライ・プロンプトキャッシュ）
      runtime.js                #   client tool useループ
      tool-registry.js          #   ツール定義と実装の1対1管理
      compaction.js             #   会話履歴の縮約
      conversation-store.js     #   会話のlocalStorage永続化
      system-prompt.js          #   コード規約 + docs/d3-thematika_llm.md 連結
    tools/register-tools.js     # ツール5種: list_data / inspect_data / get_code / update_code / render_preview
    data-store.js               # アップロードGeoJSONの管理（要約+変換後検証）
    geojson-normalize.js        # D3互換への自動変換（ワインディング反転+空座標除去）
    preview.js                  # iframe実行（fetch shim・コンソール捕捉・SVG統計）
    export.js                   # 無圧縮zip生成
```

- 生成コードはプレビューでもエクスポート後でも `d3.json('./data/<name>')` でデータを読む。プレビューでは fetch shim がアップロードデータで解決するため、コードが同一のまま動く
- `render_preview` ツールがコンソールエラーとSVG要素統計をエージェントへ返すため、エラー時は自己修正ループが回る
- 会話・エディタ内容・アップロードデータ・APIキーはlocalStorageに保存され、リロード後も復元される
