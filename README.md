# d3-thematika

> ⚠️ **開発版 (v0.0.1-alpha)**: このライブラリは現在開発中です。APIは予告なく変更される可能性があります。

D3.jsを使用した主題図作成（thematika）ライブラリです。レイヤーベースの柔軟な設計により、美しい静的主題図を簡単に作成できます。

## 🚧 現在の状態

- **バージョン**: 0.0.1-alpha
- **ステータス**: 開発中 / 実験的
- **安定性**: 破壊的変更の可能性あり

### ⚠️ 注意事項

- このライブラリは活発に開発中のため、APIは安定していません
- プロダクション環境での使用は推奨されません
- バグや未実装機能が存在する可能性があります
- ドキュメントは不完全な場合があります

## ✨ 主な特徴

- 📊 **モジュール化されたレイヤー設計**: 目的別に整理されたレイヤー（Geo, Point, Line, Raster, Utils）を組み合わせて柔軟に地図を構築
- 🏗️ **堅牢なアーキテクチャ**: LayerManagerによるライフサイクル管理と、拡張性の高いBaseLayer設計
- 🛡️ **TypeScriptによる型安全性**: ジェネリクスを活用した厳格な属性・スタイル定義により、開発時のエラーを低減
- 🎨 **SVGベースの高精彩表現**: D3.jsの機能をフル活用し、フィルター、テクスチャ、ハッチングなどの高度な視覚効果を容易に適用
- 🌏 **多様な投影法サポート**: D3-geoがサポートするあらゆる投影法に対応し、動的な投影切り替えも可能
- 📱 **レスポンシブ対応**: コンテナサイズに合わせた動的なリサイズと、地図のフィット機能を搭載

## インストール

```bash
npm install d3-thematika
```



## 使用方法

### UMD版（ブラウザ）

```html
<!-- D3.js CDN -->
<script src="https://d3js.org/d3.v7.min.js"></script>
<!-- d3-thematika -->
<script src="./dist/thematika.umd.js"></script>

<script>
  //geojsonデータの読み込み
  const geojson =  await d3.json("geojson/world.geojson");


  // D3.jsの投影法を使用して地図の投影を設定
  const projection = d3.geoEqualEarth()
      .fitExtent([[0, 0], [width, height]], geojson);

        
  const map = new Thematika.Map({
      container: '#map',
      width: width,
      height: height,
      defs: [texture, effect], 
      projection: projection
  });

  // GeojsonLayerインスタンスを作成
  const worldLayer = new Thematika.GeojsonLayer({
      data: geojson,                
      attr: { 
          fill:'#f8f9fa', 
          stroke: '#1a3d1f',
          strokeWidth: 0.8,
          opacity: 0.9,
      }
  });

  // レイヤーを追加
  map.addLayer('world_layer', worldLayer);


</script>
```

### ES Modules

```javascript
import { Map, GeojsonLayer } from 'd3-thematika';
import * as d3 from 'd3';

// GeoJSONデータの読み込み
const geojson = await d3.json("geojson/world.geojson");

// D3.jsの投影法を使用して地図の投影を設定
const projection = d3.geoEqualEarth()
    .fitExtent([[0, 0], [width, height]], geojson);

// 地図インスタンスを作成
const map = new Map({
    container: '#map',
    width: width,
    height: height,
    projection: projection
});

// GeojsonLayerインスタンスを作成
const worldLayer = new GeojsonLayer({
    data: geojson,
    attr: {
        fill: '#f8f9fa',
        stroke: '#1a3d1f',
        strokeWidth: 0.8,
        opacity: 0.9,
    }
});

// レイヤーを追加
map.addLayer('world_layer', worldLayer);
```

## 開発

### セットアップ

```bash
git clone https://github.com/shimizu/d3-thematika.git
cd d3-thematika
npm install
```

### 開発サーバー

```bash
npm run dev
```

開発サーバーが `http://localhost:3000/index.html` で起動します。

### ビルド

```bash
npm run build
```

ビルドファイルは `dist/` フォルダに出力されます：
- `thematika.umd.js` - UMD版
- `thematika.esm.js` - ES Modules版  
- `thematika.cjs.js` - CommonJS版


## 🤝 コントリビューション

バグ報告、機能リクエスト、プルリクエストを歓迎します！詳細は[CONTRIBUTING.md](CONTRIBUTING.md)をご覧ください。

### 問題を報告する

- [Issue Tracker](https://github.com/shimizu/d3-thematika/issues)
- バグ報告の際は、再現手順と環境情報を含めてください

## 📝 ライセンス

ISC License - 詳細は[LICENSE](LICENSE)ファイルをご覧ください。

## 🔗 関連リンク

- [GitHub Repository](https://github.com/shimizu/d3-thematika)
- [Examples Gallery](https://shimizu.github.io/d3-thematika/examples/)
- [D3.js Documentation](https://d3js.org/)

## ⚡ ロードマップ

### v0.1.0 (予定)
- [ ] 基本的なレイヤータイプの安定化
- [ ] APIドキュメントの充実
- [ ] パフォーマンス最適化
- [ ] より多くのサンプル追加

### 将来的な機能
- インタラクティブ機能の強化
- アニメーションAPI
- プラグインシステム
- TypeScript型定義の改善

---

**注**: このプロジェクトは個人的な実験プロジェクトとして開始されました。フィードバックや提案は[Issues](https://github.com/shimizu/d3-thematika/issues)でお待ちしています。
