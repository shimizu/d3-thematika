# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

d3-thematika は D3.js ベースの静的主題図（thematic map）作成 TypeScript ライブラリ。SVG を出力し、CSS や SVG エフェクトを自由に適用できる。パン・ズームなどのインタラクション機能は意図的に持たない。

詳細な API リファレンスは `docs/d3-thematika_llm.md`（LLM 向け完全リファレンス）を参照。

## コマンド

```bash
npm run build          # Rollup ビルド（dist/ に cjs / esm / umd を出力、UMD は site/js/ にもコピー）
npm run dev            # watch ビルド + 開発サーバー（site/ を http://localhost:3000 で配信、livereload 付き）
npm run typecheck      # tsc --noEmit
npm run playground     # ビルド後、プレイグラウンドを http://localhost:3001/playground/ で起動
npm run preview:site   # site/ を静的配信のみ
npm run deploy         # gh-pages で site/ をデプロイ
```

- テストフレームワークは未導入（test スクリプトなし）。動作確認は `npm run dev` で site/ のサンプル、または playground で行う。
- `scripts/` 配下のユーティリティ（GeoJSON ワインディング検査・修正、COG→PNG 変換など）は独自の package.json を持つ。使用前に `cd scripts && npm install`。

## アーキテクチャ

階層構造: `Map`（src/thematika.ts）→ `LayerManager`（src/core/layer-manager.ts）→ 各レイヤー。

- **Map**: コンテナに SVG を生成し、投影法・defs（テクスチャ/フィルター）・背景を設定して LayerManager に描画コンテキストを渡す。
- **LayerManager**: `addLayer(id, layer)` で投影法の注入・zIndex 採番・render 呼び出し・ライフサイクル管理を行う。
- **BaseLayer**（src/layers/core/base-layer.ts）: 全レイヤーの抽象基底クラス。ジェネリクス `<TAttr, TStyle>` で属性・スタイルを型付けし、`render()` をサブクラスが実装する。
- レイヤーは目的別ディレクトリに分類: `src/layers/geo/`（geojson, graticule, outline）、`point/`、`line/`、`raster/`（image）、`text/`、`utils/`（legend）。
- 公開 API はすべて `src/index.ts` から export する。新しいレイヤーやユーティリティを追加したら必ずここに追記する。
- `src/utils/` に effect / texture / gis / tile / color-palette などのユーティリティ群。`src/vendor/` は textures ライブラリの同梱版。

### ビルド構成

Rollup（rollup.config.js）が `src/index.ts` を入力に cjs / esm / umd の3形式を出力。`d3-geo` / `d3-selection` / `d3-force` / `d3-shape` / `d3-contour` は external で、UMD ではグローバル `d3` にマップされる。UMD のグローバル名は `Thematika`。

## 設計方針（必ず守ること）

- **Immutable パターン**: レイヤーの状態変更は新しいインスタンス作成で対応する。`setXxx()` による動的な状態変更メソッドは追加禁止（`setProjection()` のみ例外）。設定変更が必要な場合は地図全体を再作成する。
- **イベントハンドリングなし**: レイヤークラスに `on()` や D3 イベントリスナーを実装しない。インタラクティブ機能はアプリケーション側の責務。
- **UMD 使用時は destructuring 禁止**: サンプルコードでは `Thematika.Map` のように名前空間経由でアクセスする（`const { Map } = Thematika` は NG）。

## GeoJSON のワインディング順序

D3.js は GeoJSON 仕様（RFC7946）と逆のリング順序を期待する（外側リング: CW、内側: CCW）。CCW のポリゴンを `fitExtent` 等に渡すと「全世界」として扱われ描画が壊れる。

```bash
node scripts/check-geojson-winding.js <file>   # 検査
node scripts/fix-geojson-winding.js <file> --d3  # D3 用に修正
```

## サンプルとプレイグラウンド

- `site/`: GitHub Pages に公開されるサンプルギャラリー。UMD ビルドを `site/js/thematika.umd.js` から読み込む。
- `playground/`: AI 地図生成プレイグラウンド。GeoJSON をアップロードして自然言語で指示すると、AI エージェント（Claude Messages API へのブラウザ完結 client tool use ループ）が d3-thematika の描画コードを生成・自己修正し、zip でエクスポートできる。エージェント中核は `playground/js/agent/`、ツール定義は `playground/js/tools/register-tools.js`（構成の詳細は playground/README.md）。API キーは利用者が画面から入力し localStorage 保存（埋め込み禁止）。
- `docs/`: TypeDoc の生成物。手動編集しない。
