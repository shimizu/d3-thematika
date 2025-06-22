# GeojsonLayer

GeoJSONデータを地図上に表示するためのレイヤークラスです。ポリゴン、ライン、ポイントなどの地理空間データを美しく描画し、豊富なスタイルオプションとインタラクティブ機能を提供します。

## 基本的な使い方

```typescript
import { GeojsonLayer } from 'd3-thematika';

// 基本的なGeoJSONレイヤー
const geojsonData = await d3.json('data/countries.geojson');

const worldLayer = new GeojsonLayer({
  data: geojsonData,
  attr: {
    fill: '#e0e0e0',
    stroke: '#333',
    strokeWidth: 0.5,
    opacity: 0.8
  }
});

// 地図に追加
map.addLayer('world', worldLayer);
```

## 初期化オプション

### 必須オプション

| プロパティ | 型 | 説明 |
|------------|-----|------|
| `data` | `GeoJSON.FeatureCollection \| GeoJSON.Feature[]` | GeoJSONデータ（FeatureCollectionまたはFeature配列） |

### オプション設定

| プロパティ | 型 | デフォルト | 説明 |
|------------|-----|------------|------|
| `style` | `LayerStyle` | - | レイヤーのスタイル設定 |
| `attr` | `LayerStyle` | - | レイヤーの属性設定（`style`のエイリアス、優先される） |

## スタイル設定（LayerStyle）

### 基本スタイルオプション

| プロパティ | 型 | 説明 |
|------------|-----|------|
| `fill` | `string \| function` | 塗りつぶし色 |
| `stroke` | `string \| function` | 境界線の色 |
| `strokeWidth` | `number \| function` | 境界線の幅 |
| `strokeDasharray` | `string \| function` | 境界線の破線パターン |
| `opacity` | `number \| function` | 透明度（0-1） |
| `filter` | `string \| function` | SVGフィルター |
| `className` | `string` | 追加のCSSクラス名 |

### 静的スタイル

```typescript
const regionLayer = new GeojsonLayer({
  data: geojsonData,
  attr: {
    fill: '#4CAF50',
    stroke: '#2E7D32',
    strokeWidth: 1,
    opacity: 0.7
  }
});
```

### 動的スタイル（関数）

```typescript
// プロパティに基づく動的スタイリング
const populationLayer = new GeojsonLayer({
  data: geojsonData,
  attr: {
    fill: (feature) => {
      const population = feature.properties.population;
      if (population > 1000000) return '#d32f2f';
      if (population > 100000) return '#f57c00';
      return '#388e3c';
    },
    stroke: '#333',
    strokeWidth: (feature) => {
      return feature.properties.importance === 'high' ? 2 : 0.5;
    },
    opacity: 0.8
  }
});
```

### D3スケールとの組み合わせ

```typescript
// カラースケールを使用
const colorScale = d3.scaleSequential(d3.interpolateViridis)
  .domain([0, 100]);

const choroplethLayer = new GeojsonLayer({
  data: geojsonData,
  attr: {
    fill: (feature) => colorScale(feature.properties.value),
    stroke: '#fff',
    strokeWidth: 0.5,
    opacity: 0.9
  }
});
```

## データの管理

### GeoJSONデータの形式

#### FeatureCollection形式
```typescript
const featureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[[lng, lat], [lng, lat], ...]]
      },
      properties: {
        name: '地域名',
        population: 1000000,
        category: 'urban'
      }
    }
  ]
};

const layer = new GeojsonLayer({
  data: featureCollection,
  attr: { fill: '#blue' }
});
```

#### Feature配列形式
```typescript
const features = [
  {
    type: 'Feature',
    geometry: { /* ... */ },
    properties: { /* ... */ }
  },
  // ... more features
];

const layer = new GeojsonLayer({
  data: features, // 自動的にFeatureCollectionに変換される
  attr: { fill: '#green' }
});
```

### データの動的更新

```typescript
// 新しいGeoJSONデータに更新
const newData = await d3.json('data/updated-regions.geojson');
layer.updateData(newData);

// データを取得
const currentData = layer.getData();
console.log(currentData.features.length);
```

## インタラクティブ機能

### イベントハンドリング

```typescript
// クリックイベント
layer.on('click', (event, feature) => {
  console.log('クリックされた地域:', feature.properties.name);
  console.log('人口:', feature.properties.population);
});

// マウスオーバー
layer.on('mouseover', (event, feature) => {
  // ツールチップを表示
  showTooltip(feature.properties.name, [event.pageX, event.pageY]);
});

// マウスアウト
layer.on('mouseout', () => {
  hideTooltip();
});
```

### ホバーエフェクト

```typescript
const interactiveLayer = new GeojsonLayer({
  data: geojsonData,
  attr: {
    fill: '#e0e0e0',
    stroke: '#333',
    strokeWidth: 0.5,
    opacity: 0.8
  }
});

// ホバー時のスタイル変更
interactiveLayer.on('mouseover', function(event, feature) {
  d3.select(event.target)
    .style('fill', '#ff6b6b')
    .style('stroke-width', 2);
});

interactiveLayer.on('mouseout', function(event, feature) {
  d3.select(event.target)
    .style('fill', '#e0e0e0')
    .style('stroke-width', 0.5);
});
```

## 投影法との連携

### 投影法の設定

```typescript
// 投影法を設定（通常は地図クラスが自動で行う）
const projection = d3.geoMercator()
  .scale(150)
  .translate([width / 2, height / 2]);

layer.setProjection(projection);
```

### 投影法の更新

```typescript
// 新しい投影法に変更
const newProjection = d3.geoAlbers()
  .scale(200)
  .translate([width / 2, height / 2]);

layer.updateProjection(newProjection);
```

## 使用例

### 基本的な世界地図

```typescript
// 世界地図の表示
const worldData = await d3.json('data/world-110m.geojson');

const worldLayer = new GeojsonLayer({
  data: worldData,
  attr: {
    fill: '#f0f0f0',
    stroke: '#999',
    strokeWidth: 0.5,
    opacity: 1
  }
});

map.addLayer('world', worldLayer);
```

### コロプレス地図

```typescript
// 人口密度に基づくコロプレス地図
const populationData = await d3.json('data/population-by-country.geojson');

// カラースケールの設定
const colorScale = d3.scaleQuantize()
  .domain([0, 1000]) // 人口密度の範囲
  .range(['#fff7ec', '#fee8c8', '#fdd49e', '#fdbb84', '#fc8d59', '#ef6548', '#d7301f', '#b30000']);

const populationLayer = new GeojsonLayer({
  data: populationData,
  attr: {
    fill: (feature) => {
      const density = feature.properties.density || 0;
      return colorScale(density);
    },
    stroke: '#fff',
    strokeWidth: 0.5,
    opacity: 0.9
  }
});

// ツールチップ機能
populationLayer.on('mouseover', (event, feature) => {
  const tooltip = d3.select('body').append('div')
    .attr('class', 'tooltip')
    .style('position', 'absolute')
    .style('background', 'rgba(0,0,0,0.8)')
    .style('color', 'white')
    .style('padding', '8px')
    .style('border-radius', '4px')
    .style('pointer-events', 'none');
    
  tooltip.html(`
    <strong>${feature.properties.name}</strong><br>
    人口密度: ${feature.properties.density} 人/km²
  `)
  .style('left', (event.pageX + 10) + 'px')
  .style('top', (event.pageY - 10) + 'px');
});

populationLayer.on('mouseout', () => {
  d3.selectAll('.tooltip').remove();
});

map.addLayer('population', populationLayer);
```

### 複数レイヤーの組み合わせ

```typescript
// 背景レイヤー（国境）
const backgroundLayer = new GeojsonLayer({
  data: countryData,
  attr: {
    fill: '#f8f9fa',
    stroke: '#dee2e6',
    strokeWidth: 1,
    opacity: 1
  }
});

// 都市レイヤー（ポイント）
const cityLayer = new GeojsonLayer({
  data: cityData,
  attr: {
    fill: (feature) => {
      const population = feature.properties.population;
      return population > 1000000 ? '#e31a1c' : '#fd8d3c';
    },
    stroke: '#333',
    strokeWidth: 1,
    opacity: 0.8
  }
});

// 道路レイヤー（ライン）
const roadLayer = new GeojsonLayer({
  data: roadData,
  attr: {
    fill: 'none',
    stroke: (feature) => {
      const type = feature.properties.highway;
      return type === 'primary' ? '#ff4444' : '#888888';
    },
    strokeWidth: (feature) => {
      const type = feature.properties.highway;
      return type === 'primary' ? 3 : 1;
    },
    opacity: 0.7
  }
});

// レイヤーを順番に追加
map.addLayer('background', backgroundLayer);
map.addLayer('roads', roadLayer);
map.addLayer('cities', cityLayer);
```

### 時系列データの可視化

```typescript
// 年ごとのデータを切り替え
const timeSeriesData = {
  2020: await d3.json('data/2020.geojson'),
  2021: await d3.json('data/2021.geojson'),
  2022: await d3.json('data/2022.geojson')
};

const timeLayer = new GeojsonLayer({
  data: timeSeriesData[2020],
  attr: {
    fill: (feature) => colorScale(feature.properties.value),
    stroke: '#fff',
    strokeWidth: 0.5,
    opacity: 0.8
  }
});

// 年を切り替える関数
function updateYear(year) {
  timeLayer.updateData(timeSeriesData[year]);
}

map.addLayer('timeseries', timeLayer);
```

## CSSスタイリング

### クラスベースのスタイリング

```typescript
const styledLayer = new GeojsonLayer({
  data: geojsonData,
  attr: {
    className: 'custom-region',
    fill: (feature) => feature.properties.category === 'special' ? '#ff6b6b' : '#4ecdc4'
  }
});
```

```css
/* CSS */
.custom-region {
  transition: all 0.3s ease;
}

.custom-region:hover {
  stroke-width: 3px !important;
  filter: brightness(1.1);
}

.cartography-feature {
  cursor: pointer;
}
```

## パフォーマンス最適化

### 大容量データの処理

```typescript
// 単純化されたGeoJSONを使用
const simplifiedData = await d3.json('data/world-50m.geojson'); // 110mより詳細

// レベル・オブ・ディテール（LOD）の実装例
function getDataByZoomLevel(zoomLevel) {
  if (zoomLevel < 3) return worldData110m;
  if (zoomLevel < 6) return worldData50m;
  return worldData10m;
}

// ズームレベルに応じてデータを切り替え
map.on('zoom', (zoomLevel) => {
  const appropriateData = getDataByZoomLevel(zoomLevel);
  worldLayer.updateData(appropriateData);
});
```

### 条件付きレンダリング

```typescript
const conditionalLayer = new GeojsonLayer({
  data: geojsonData,
  attr: {
    fill: (feature) => {
      // 小さな地域は非表示
      const area = feature.properties.area;
      return area < 1000 ? 'transparent' : '#4CAF50';
    },
    stroke: (feature) => {
      const area = feature.properties.area;
      return area < 1000 ? 'transparent' : '#333';
    }
  }
});
```

## エラーハンドリング

### データ検証

```typescript
function validateGeojsonData(data) {
  if (!data) {
    throw new Error('GeoJSONデータが提供されていません');
  }
  
  if (Array.isArray(data)) {
    return data.every(feature => feature.type === 'Feature');
  }
  
  return data.type === 'FeatureCollection' && Array.isArray(data.features);
}

try {
  const geojsonData = await d3.json('data/regions.geojson');
  
  if (!validateGeojsonData(geojsonData)) {
    throw new Error('無効なGeoJSONデータ形式です');
  }
  
  const layer = new GeojsonLayer({
    data: geojsonData,
    attr: { fill: '#blue' }
  });
  
  map.addLayer('regions', layer);
} catch (error) {
  console.error('GeoJSONレイヤーの作成に失敗しました:', error);
}
```

## 注意事項

- GeoJSONデータは有効な形式である必要があります（FeatureCollectionまたはFeature配列）
- 大容量のGeoJSONファイルはパフォーマンスに影響する可能性があります
- 動的スタイル関数は各フィーチャーごとに実行されるため、重い処理は避けてください
- イベントリスナーは適切に管理し、不要になったら削除してください
- 投影法の変更時は自動的に再描画されますが、大量のデータでは処理時間がかかる場合があります

## 関連項目

- [Map](../map.md) - 基本的な地図の作成方法
- [LegendLayer](./legend-layer.md) - 凡例の表示
- [D3 Geographic Projections](https://d3js.org/d3-geo) - D3地理投影法の詳細
- [GeoJSON Specification](https://geojson.org/) - GeoJSON形式の仕様