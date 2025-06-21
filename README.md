# d3-thematika

D3.jsを使用した主題図作成（thematika）ライブラリです。

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
  const map = new Thematika.Thematika({
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
import { Thematika } from 'd3-thematika';

const map = new Thematika({
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

## API

### Thematika(options)

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