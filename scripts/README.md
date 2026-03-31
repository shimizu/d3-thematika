# scripts/

d3-thematika 開発用のユーティリティスクリプト集です。

## セットアップ

一部のスクリプトは独自の依存関係を持っています。

```bash
cd scripts
npm install
```

## スクリプト一覧

### start-playground.mjs

プレイグラウンドの開発サーバーを起動し、ブラウザを自動で開きます。

```bash
node scripts/start-playground.mjs
```

- ポート 3001 で `serve` を起動
- 1.5秒後に `http://localhost:3001/playground/` をブラウザで開く
- macOS / Windows / Linux に対応

### check-geojson-winding.js

GeoJSON ファイルのワインディング順序（リングの回転方向）をチェックします。D3.js と GeoJSON 仕様（RFC7946）では期待する順序が異なるため、描画の問題を事前に検出できます。

```bash
node scripts/check-geojson-winding.js <geojson-file>
```

**出力内容:**
- GeoJSON 仕様準拠かどうか
- D3.js 互換かどうか
- 問題がある場合の修正方法

### fix-geojson-winding.js

GeoJSON ファイルのワインディング順序を修正します。`@turf/rewind` を使用します。

```bash
# D3.js 用に修正（デフォルト）
node scripts/fix-geojson-winding.js <geojson-file> --d3

# GeoJSON 仕様準拠に修正
node scripts/fix-geojson-winding.js <geojson-file> --geojson
```

**オプション:**

| オプション | 説明 |
|-----------|------|
| `--d3` | D3.js 用に修正（外側:CW、内側:CCW）。デフォルト |
| `--geojson` | GeoJSON 仕様準拠に修正（外側:CCW、内側:CW） |
| `--backup` | 修正前のファイルを `.bak` としてバックアップ |
| `--dry-run` | 実際の修正は行わず変更内容のみ表示 |
| `--pretty` | JSON を整形して保存 |

**依存関係:** 初回実行前に `npm install @turf/rewind` が必要です。
