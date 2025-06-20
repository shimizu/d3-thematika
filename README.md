# d3-Cartgraphy

D3.jsを使用した地図作成（cartography）ライブラリです。

## インストール

```bash
npm install d3-cartography
```

## 使用方法

### UMD版（ブラウザ）

```html
<!-- D3.js CDN -->
<script src="https://d3js.org/d3.v7.min.js"></script>
<!-- d3-Cartgraphy -->
<script src="./dist/cartography.umd.js"></script>

<script>
  const map = new Cartography.Cartography({
    container: '#map',
    width: 800,
    height: 600,
    projection: 'naturalEarth1'
  });
  
  map.addLayer('base', {
    data: geoJsonData,
    style: {
      fill: '#f8f9fa',
      stroke: '#dee2e6',
      strokeWidth: 1
    }
  });
</script>
```

### ES Modules

```javascript
import { Cartography } from 'd3-cartography';

const map = new Cartography({
  container: '#map',
  width: 800,
  height: 600,
  projection: 'naturalEarth1'
});

map.addLayer('base', {
  data: geoJsonData,
  style: {
    fill: '#f8f9fa',
    stroke: '#dee2e6',
    strokeWidth: 1
  }
});
```

## 開発

### セットアップ

```bash
git clone https://github.com/shimizu/d3-cartography.git
cd d3-cartography
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
- `cartography.umd.js` - UMD版
- `cartography.esm.js` - ES Modules版  
- `cartography.cjs.js` - CommonJS版

## API

### Cartography(options)

地図インスタンスを作成します。

#### options

- `container` (string): マップを描画するDOM要素のセレクタ
- `width` (number): マップの幅
- `height` (number): マップの高さ
- `projection` (string): 投影法の種類

### addLayer(name, config)

レイヤーを追加します。

#### config

- `data` (GeoJSON): 地理データ
- `style` (object): スタイル設定
  - `fill` (string): 塗りつぶし色
  - `stroke` (string): 境界線の色
  - `strokeWidth` (number): 境界線の幅

## ライセンス

ISC