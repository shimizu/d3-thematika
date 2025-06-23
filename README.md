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
    style: { 
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

## API

### Map(options)

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