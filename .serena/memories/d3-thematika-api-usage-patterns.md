# d3-thematika API使用パターンメモリー

## 基本的な使用方法

### 1. 地図の初期化
```javascript
// UMDビルドの場合
const map = new Thematika.Map({
  container: '#map',
  width: 800,
  height: 600,
  projection: 'mercator', // または d3.geoProjection オブジェクト
  fitBounds: geojsonData  // オプション: 自動的に境界に合わせる
});

// ESMの場合
import { Map } from 'd3-thematika';
const map = new Map({ /* options */ });
```

### 2. レイヤーの追加パターン

#### GeoJSONレイヤー
```javascript
const geojsonLayer = new Thematika.GeojsonLayer('layer-id', {
  data: geojsonData,
  style: {
    fill: '#4285F4',
    stroke: '#333',
    'stroke-width': 1,
    opacity: 0.8
  },
  attr: {
    class: 'country-layer'
  }
});
map.addLayer('countries', geojsonLayer);
```

#### ポイントレイヤー
```javascript
// 円マーカー
const circleLayer = new Thematika.PointCircleLayer('circles', {
  data: pointsGeoJSON,
  radius: d => d.properties.value * 2,
  style: {
    fill: d => colorScale(d.properties.category)
  }
});

// シンボルマーカー
const symbolLayer = new Thematika.PointSymbolLayer('symbols', {
  data: pointsGeoJSON,
  symbol: d => d.properties.type,
  size: 20
});

// テキストラベル
const textLayer = new Thematika.PointTextLayer('labels', {
  data: pointsGeoJSON,
  text: d => d.properties.name,
  style: {
    'font-size': '12px',
    'text-anchor': 'middle'
  }
});
```

#### ラインレイヤー
```javascript
// 接続線
const connectionLayer = new Thematika.LineConnectionLayer('connections', {
  data: connectionsData, // {source: [lon, lat], target: [lon, lat]}[]
  arcHeight: 0.2,
  style: {
    stroke: '#FF6B6B',
    'stroke-width': 2
  }
});

// エッジバンドリング
const bundlingLayer = new Thematika.LineEdgeBundlingLayer('bundles', {
  data: connectionsData,
  bundlingStrength: 0.8
});
```

#### その他のレイヤー
```javascript
// 画像レイヤー
const imageLayer = new Thematika.ImageLayer('raster', {
  src: 'path/to/image.png',
  bounds: [[west, south], [east, north]],
  opacity: 0.7
});

// 経緯線グリッド
const graticuleLayer = new Thematika.GraticuleLayer('grid', {
  step: [10, 10], // 経度、緯度のステップ
  style: {
    stroke: '#ddd',
    'stroke-dasharray': '2,2'
  }
});

// 凡例
const legendLayer = new Thematika.LegendLayer('legend', {
  items: [
    { color: '#FF0000', label: 'High' },
    { color: '#00FF00', label: 'Low' }
  ],
  position: { x: 20, y: 20 }
});
```

### 3. レイヤー操作

```javascript
// 可視性の切り替え
map.setLayerVisibility('layer-id', false);

// z-indexの変更
map.setLayerZIndex('layer-id', 10);

// レイヤーの削除
map.removeLayer('layer-id');

// 全レイヤーのクリア
map.clearAllLayers();

// レイヤーIDの取得
const layerIds = map.getLayerIds();
```

### 4. 投影法の変更

```javascript
// 組み込み投影法名
map.setProjection('orthographic');

// D3投影法オブジェクト
map.setProjection(d3.geoAlbersUsa());

// 境界に合わせる
map.fitBounds(geojsonData);
```

### 5. エクスポート

```javascript
// SVGとして保存
map.saveSVG('map.svg');

// PNGとして保存
await map.savePNG('map.png', {
  scale: 2  // 解像度倍率
});
```

### 6. エフェクトの適用

```javascript
import { createDropShadow, createBloom } from 'd3-thematika/utils';

// 影効果
const shadowId = createDropShadow(map.getSVG(), {
  dx: 2,
  dy: 2,
  blur: 3
});
layer.style.filter = `url(#${shadowId})`;

// ブルーム効果
const bloomId = createBloom(map.getSVG(), {
  intensity: 1.5,
  radius: 4
});
```

### 7. カラーパレットの使用

```javascript
import { recommendPalette, generateOptimizedPalette } from 'd3-thematika/utils';

// パレット推奨
const palette = recommendPalette({
  dataType: 'categorical',
  count: 5,
  colorBlindSafe: true
});

// 最適化パレット生成
const optimized = generateOptimizedPalette(
  baseColors,
  targetCount,
  { ensureColorBlindSafe: true }
);
```

## 重要な実装パターン

### Immutableパターンでの更新
```javascript
// ❌ 避けるべき（削除済みメソッド）
layer.setStyle({ fill: 'red' });

// ✅ 推奨: 新しいインスタンスを作成
function updateMap() {
  // 既存の地図を削除
  d3.select('#map').selectAll('*').remove();
  
  // 新しい設定で再作成
  const map = new Thematika.Map({ /* ... */ });
  const layer = new Thematika.GeojsonLayer('id', {
    data: data,
    style: { fill: newColor }
  });
  map.addLayer('layer', layer);
}
```

### examples/でのUI連動パターン
```javascript
function draw() {
  // UIの状態を取得
  const showGrid = document.getElementById('grid').checked;
  const opacity = document.getElementById('opacity').value;
  
  // 地図を再描画
  d3.select('#map').selectAll('*').remove();
  
  const map = new Thematika.Map({ /* ... */ });
  
  if (showGrid) {
    map.addLayer('grid', new Thematika.GraticuleLayer('grid'));
  }
  
  const layer = new Thematika.GeojsonLayer('main', {
    data: data,
    style: { opacity: opacity }
  });
  map.addLayer('main', layer);
}

// UIイベントリスナー
document.getElementById('grid').addEventListener('change', draw);
document.getElementById('opacity').addEventListener('input', draw);
```

## テスト時の使用パターン

```javascript
// Mapのモック
const mockSvg = d3.select(document.body).append('svg');
const mockGroup = mockSvg.append('g');
const mockProjection = d3.geoMercator();

// レイヤーのテスト
const layer = new GeojsonLayer('test', { data: testData });
layer.setProjection(mockProjection);
layer.render(mockGroup, mockProjection);

// レンダリング結果の確認
expect(mockGroup.selectAll('path').size()).toBe(featureCount);
```