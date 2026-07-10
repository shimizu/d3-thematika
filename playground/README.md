# d3-thematika プレイグラウンド

d3-thematika のコードを書いてすぐに結果を確認できるブラウザベースの実験環境です。

## 使い方

### 起動

```bash
npm run playground
```

ビルド後にサーバーが起動し、`http://localhost:3001/playground/` が自動で開きます。

> **Note**: `npm run dev` は `site/` のみを配信するため、プレイグラウンドは表示できません。必ず `npm run playground` を使用してください。

### 画面構成

- **左パネル**: HTML / CSS / JS のエディタ（タブ切替）
- **右パネル**: プレビュー / コンソール（タブ切替）

### 操作

| 操作 | 方法 |
|------|------|
| コード実行 | 「実行」ボタン または `Ctrl+Enter` |
| テンプレート読込 | セレクトボックスから選択 →「読込」 |
| リセット | 「リセット」ボタン（編集内容を破棄し初期状態に戻す） |

- エディタの内容は `localStorage` に自動保存されます
- プレビュー内では `Thematika` と `d3` がグローバルに利用可能です
- `console.log()` の出力はコンソールタブに表示されます

## テンプレートの追加

### ディレクトリ構造

```
playground/templates/
  manifest.json        ← テンプレート一覧
  basic/
    index.html         ← プレビューのHTML本文
    style.css          ← プレビューのスタイル
    script.js          ← 実行されるJavaScript
  points/
  layout/
```

### 手順

1. `playground/templates/` に新しいディレクトリを作成

```bash
mkdir playground/templates/my-template
```

2. 3つのファイルを作成

- **index.html** — `<body>` 内に配置されるHTML
- **style.css** — プレビューに適用されるCSS
- **script.js** — トップレベル `await` が使用可能。`Thematika` と `d3` はグローバルで利用可能

3. `manifest.json` にエントリを追加

```json
[
  { "id": "basic", "label": "基本地図" },
  { "id": "my-template", "label": "マイテンプレート" }
]
```

`id` はディレクトリ名、`label` はセレクトボックスの表示名です。

### GeoJSONデータの参照

テンプレートのスクリプトからGeoJSONを読み込む場合は、以下のパスを使用します：

```javascript
const data = await d3.json('../site/geojson/world.geojson');
```
