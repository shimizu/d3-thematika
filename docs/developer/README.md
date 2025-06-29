# 開発者ドキュメント

d3-thematikaライブラリの開発に関するドキュメントです。

## 目次

- [アーキテクチャ](./architecture.md) - ライブラリの全体構造

## クイックスタート

### 開発環境セットアップ

```bash
# リポジトリをクローン
git clone https://github.com/shimizu/d3-thematika.git
cd d3-thematika

# 依存関係をインストール
npm install

# 開発サーバーを起動
npm run dev
```

### ディレクトリ構造

```
src/
├── index.ts                    # メインエントリーポイント
├── cartography.ts             # メインクラス
├── types.ts                   # 型定義
├── core/                      # コア機能
│   └── layer-manager.ts       # レイヤー管理
├── layers/                    # レイヤー種別
│   ├── base-layer.ts          # 基底レイヤークラス
│   ├── geojson-layer.ts       # GeoJSONレイヤー
│   ├── outline-layer.ts       # アウトラインレイヤー
│   └── graticule-layer.ts     # 経緯線レイヤー
└── utils/                     # ユーティリティ
    ├── effect-utils.ts        # SVGエフェクトユーティリティ
    └── tests.ts               # デバッグ・テスト機能
```

## ライブラリの目的

- bertin.jsに代わるスタティックな主題図作成ライブラリ
- D3.jsの機能をフル活用
- CSS/SVGエフェクトを適用しやすい設計
- パン・ズーム機能は持たない
- 豊富な主題図表現をサポート

## 設計原則

1. **モジュラー設計**: 機能別にクリーンに分離
2. **拡張性**: 新しいレイヤータイプを簡単に追加可能
3. **TypeScript重視**: 型安全性を最優先
4. **D3.js活用**: D3のパワーを最大限利用
5. **後方互換性**: 既存APIの互換性を維持