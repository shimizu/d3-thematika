# d3-thematika コード例集

## 基本的な地図作成

### シンプルな世界地図

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://d3js.org/d3.v7.min.js"></script>
  <script src="thematika.umd.js"></script>
</head>
<body>
  <div id="map"></div>
  <script>
    async function draw() {
      const geojson = await d3.json("./geojson/world.geojson");

      const map = new Thematika.Map({
        container: '#map',
        width: 800,
        height: 600,
        projection: d3.geoNaturalEarth1()
          .scale(150)
          .translate([400, 300])
      });

      // 世界地図レイヤー
      const worldLayer = new Thematika.GeojsonLayer({
        data: geojson,
        attr: {
          fill: '#e8e8e8',
          stroke: '#333333',
          strokeWidth: 0.5
        }
      });
      map.addLayer('world', worldLayer);

      // 経緯線レイヤー
      const graticuleLayer = new Thematika.GraticuleLayer({
        step: [15, 15],
        attr: {
          stroke: '#cccccc',
          strokeWidth: 0.3
        }
      });
      map.addLayer('graticule', graticuleLayer);
    }

    draw();
  </script>
</body>
</html>
```

---

## ポイントデータの可視化

### 円形ポイント（固定サイズ）

```javascript
const circleLayer = new Thematika.PointCircleLayer({
  data: pointsGeojson,
  r: 5,
  attr: {
    fill: '#ff6b6b',
    stroke: '#d63031',
    strokeWidth: 1,
    opacity: 0.8
  }
});
map.addLayer('points', circleLayer);
```

### 円形ポイント（動的サイズ）

```javascript
const circleLayer = new Thematika.PointCircleLayer({
  data: pointsGeojson,
  r: (feature, index) => {
    // 人口に基づいて半径を計算
    const population = feature.properties.population || 0;
    return Math.sqrt(population / 1000000) + 2;
  },
  attr: {
    fill: (d, i) => {
      // 地域によって色を変える
      const region = d.properties.region;
      const colors = {
        'Asia': '#74b9ff',
        'Europe': '#55efc4',
        'Africa': '#ffeaa7'
      };
      return colors[region] || '#dfe6e9';
    },
    stroke: '#2d3436',
    strokeWidth: 0.5
  }
});
map.addLayer('cities', circleLayer);
```

### シンボルポイント

```javascript
const symbolLayer = new Thematika.PointSymbolLayer({
  data: pointsGeojson,
  symbolType: (feature, index) => {
    // カテゴリに応じてシンボル形状を変える
    const category = feature.properties.category;
    switch (category) {
      case 'airport': return d3.symbolTriangle;
      case 'port': return d3.symbolDiamond;
      case 'station': return d3.symbolSquare;
      default: return d3.symbolCircle;
    }
  },
  size: 100,
  attr: {
    fill: '#e17055',
    stroke: '#d63031',
    strokeWidth: 1
  }
});
map.addLayer('symbols', symbolLayer);
```

### 3Dスパイク

```javascript
const spikeLayer = new Thematika.PointSpikeLayer({
  data: dataGeojson,
  length: (feature, index) => {
    // データ値に応じてスパイクの長さを決定
    return feature.properties.value * 0.5;
  },
  direction: 'up',
  attr: {
    fill: '#0984e3',
    stroke: '#0652DD',
    strokeWidth: 0.5,
    opacity: 0.7
  }
});
map.addLayer('spikes', spikeLayer);
```

---

## ラインデータの可視化

### 直線接続

```javascript
const connectionLayer = new Thematika.LineConnectionLayer({
  data: routesGeojson,  // LineString/MultiLineString
  lineType: 'straight',
  attr: {
    stroke: '#00b894',
    strokeWidth: 2,
    opacity: 0.8
  }
});
map.addLayer('routes', connectionLayer);
```

### アーク（弧）接続

```javascript
const arcLayer = new Thematika.LineConnectionLayer({
  data: flightRoutesGeojson,
  lineType: 'arc',
  arcHeight: 0.4,
  endArrow: true,
  arrowSize: 8,
  attr: {
    stroke: (d, i) => {
      // 距離に応じて色を変える
      const distance = d.properties.distance;
      return distance > 5000 ? '#e74c3c' : '#3498db';
    },
    strokeWidth: 1.5,
    opacity: 0.7
  }
});
map.addLayer('flights', arcLayer);
```

### スムース接続

```javascript
const smoothLayer = new Thematika.LineConnectionLayer({
  data: pathGeojson,
  lineType: 'smooth',
  smoothType: 'curveCatmullRom',
  attr: {
    stroke: '#6c5ce7',
    strokeWidth: 3,
    strokeDasharray: '5,3'
  }
});
map.addLayer('path', smoothLayer);
```

### エッジバンドリング

```javascript
const bundlingLayer = new Thematika.LineEdgeBundlingLayer({
  data: networkGeojson,
  strength: 0.85,
  attr: {
    stroke: '#fd79a8',
    strokeWidth: 0.5,
    opacity: 0.6
  }
});
map.addLayer('network', bundlingLayer);
```

---

## コロプレスマップ（色分け地図）

```javascript
// カラースケールを作成
const colorScale = d3.scaleQuantize()
  .domain([0, 100])
  .range(['#f7fbff', '#c6dbef', '#6baed6', '#2171b5', '#084594']);

const choroplethLayer = new Thematika.GeojsonLayer({
  data: geojson,
  attr: {
    fill: (d) => {
      const value = d.properties.value || 0;
      return colorScale(value);
    },
    stroke: '#333',
    strokeWidth: 0.5
  }
});
map.addLayer('choropleth', choroplethLayer);

// 凡例を追加
const legendLayer = new Thematika.LegendLayer({
  scale: colorScale,
  position: { top: 20, left: 20 },
  title: 'Value',
  symbolType: 'cell',
  orientation: 'vertical'
});
map.addLayer('legend', legendLayer);
```

---

## エフェクトの適用

### ドロップシャドウ

```javascript
const shadowFilter = Thematika.createDropShadow({
  id: 'shadow',
  dx: 2,
  dy: 2,
  stdDeviation: 3,
  floodColor: '#000000',
  floodOpacity: 0.3
});

const map = new Thematika.Map({
  container: '#map',
  width: 800,
  height: 600,
  projection: d3.geoNaturalEarth1(),
  defs: [shadowFilter]
});

const layer = new Thematika.GeojsonLayer({
  data: geojson,
  attr: {
    fill: '#74b9ff',
    stroke: '#0984e3',
    filter: shadowFilter.url()  // "url(#shadow)"
  }
});
map.addLayer('countries', layer);
```

### ブルームエフェクト

```javascript
const bloomFilter = Thematika.createBloom({
  id: 'bloom',
  intensity: 5,
  threshold: 0.7,
  color: '#ffffff'
});

const map = new Thematika.Map({
  container: '#map',
  width: 800,
  height: 600,
  projection: d3.geoOrthographic(),
  defs: [bloomFilter]
});

const pointLayer = new Thematika.PointCircleLayer({
  data: citiesGeojson,
  r: 3,
  attr: {
    fill: '#ffeaa7',
    filter: bloomFilter.url()
  }
});
map.addLayer('cities', pointLayer);
```

### プリセットフィルター

```javascript
// プリセットフィルターを使用
const sepiaFilter = Thematika.FilterPresets.sepia();
const grayscaleFilter = Thematika.FilterPresets.grayscale();

const map = new Thematika.Map({
  container: '#map',
  width: 800,
  height: 600,
  projection: d3.geoNaturalEarth1(),
  defs: [sepiaFilter, grayscaleFilter]
});
```

### クリップパス

```javascript
const clipPolygon = Thematika.createClipPolygon({
  id: 'clip-region',
  polygon: regionGeojson,
  projection: projection
});

const map = new Thematika.Map({
  container: '#map',
  width: 800,
  height: 600,
  projection: projection,
  defs: [clipPolygon]
});

const layer = new Thematika.GeojsonLayer({
  data: worldGeojson,
  attr: {
    fill: '#74b9ff',
    clipPath: clipPolygon.url()
  }
});
map.addLayer('clipped', layer);
```

---

## 凡例の作成

### カテゴリカル凡例

```javascript
const colorScale = d3.scaleOrdinal()
  .domain(['Category A', 'Category B', 'Category C'])
  .range(['#e74c3c', '#3498db', '#2ecc71']);

const legendLayer = new Thematika.LegendLayer({
  scale: colorScale,
  position: { top: 20, left: 20 },
  title: 'Categories',
  symbolType: 'cell',
  orientation: 'vertical',
  itemSpacing: 25,
  fontSize: 12
});
map.addLayer('legend', legendLayer);
```

### サイズ凡例

```javascript
const sizeScale = d3.scaleLinear()
  .domain([0, 100])
  .range([5, 30]);

const colorScale = d3.scaleOrdinal()
  .domain([0, 100])
  .range(['#3498db']);

const legendLayer = new Thematika.LegendLayer({
  scale: colorScale,
  sizeScale: sizeScale,
  position: { top: 20, left: 20 },
  title: 'Population',
  symbolType: 'circle',
  overlapping: true  // 重ね表示モード
});
map.addLayer('legend', legendLayer);
```

### グラデーション凡例

```javascript
const colorScale = d3.scaleSequential()
  .domain([0, 100])
  .interpolator(d3.interpolateViridis);

const legendLayer = new Thematika.LegendLayer({
  scale: colorScale,
  position: { top: 20, left: 20 },
  title: 'Temperature',
  symbolType: 'gradient',
  width: 200,
  height: 20,
  orientation: 'horizontal'
});
map.addLayer('legend', legendLayer);
```

---

## UI変更時の再描画パターン

### 投影法切り替え

```javascript
let map;
let currentProjection = d3.geoNaturalEarth1();

function draw() {
  // 既存の地図をクリア
  d3.select('#map').selectAll('*').remove();

  // 投影法を設定
  currentProjection
    .scale(150)
    .translate([400, 300]);

  // 新しい地図を作成
  map = new Thematika.Map({
    container: '#map',
    width: 800,
    height: 600,
    projection: currentProjection
  });

  // レイヤーを追加
  const layer = new Thematika.GeojsonLayer({
    data: geojson,
    attr: { fill: '#e8e8e8', stroke: '#333' }
  });
  map.addLayer('world', layer);
}

// 投影法セレクトボックスの変更時
document.getElementById('projection-select').addEventListener('change', function(e) {
  const projectionName = e.target.value;
  switch (projectionName) {
    case 'mercator':
      currentProjection = d3.geoMercator();
      break;
    case 'orthographic':
      currentProjection = d3.geoOrthographic();
      break;
    default:
      currentProjection = d3.geoNaturalEarth1();
  }
  draw();
});

// 初期描画
draw();
```

### スライダーによる動的変更

```javascript
let currentRadius = 5;

function draw() {
  d3.select('#map').selectAll('*').remove();

  const map = new Thematika.Map({
    container: '#map',
    width: 800,
    height: 600,
    projection: d3.geoNaturalEarth1()
  });

  const circleLayer = new Thematika.PointCircleLayer({
    data: pointsGeojson,
    r: currentRadius,
    attr: {
      fill: '#ff6b6b',
      stroke: '#d63031'
    }
  });
  map.addLayer('points', circleLayer);
}

// スライダー変更時
document.getElementById('radius-slider').addEventListener('input', function(e) {
  currentRadius = Number(e.target.value);
  document.getElementById('radius-value').textContent = currentRadius;
  draw();
});

draw();
```

---

## SVG/PNGエクスポート

```javascript
// SVGとして保存
document.getElementById('download-svg').addEventListener('click', function() {
  map.saveSVG('my-map');
});

// PNGとして保存
document.getElementById('download-png').addEventListener('click', function() {
  map.savePNG('my-map');
});
```

---

## カラーパレットの使用

```javascript
// 色覚障害対応パレットを推奨
const recommendations = Thematika.recommendPalette('categorical', 5, true);
const bestPalette = recommendations[0].palette;

// 指定クラス数に最適化
const colors = Thematika.generateOptimizedPalette(bestPalette, 5);

// コロプレスマップに適用
const colorScale = d3.scaleOrdinal()
  .domain(['A', 'B', 'C', 'D', 'E'])
  .range(colors);
```
