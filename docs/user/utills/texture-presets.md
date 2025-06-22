# テクスチャプリセット

d3-thematikaでは、地図の地形や土地利用を表現するためのテクスチャパターンのプリセットを提供しています。

## 基本的な使い方

```javascript
import { TexturePresets } from 'd3-thematika';

// プリセットを使用してテクスチャを作成
const oceanTexture = TexturePresets.standardOcean();

// SVGのdefsにテクスチャを追加
svg.select('defs').call(oceanTexture);

// 要素にテクスチャを適用
layer.style('fill', oceanTexture.url());
```

## 利用可能なプリセット

### 海洋テクスチャ

#### `lightOcean`
軽い海のテクスチャ。浅い海域や湖の表現に適しています。

```javascript
const texture = TexturePresets.lightOcean();
// 背景色: 淡い青 (#e3f2fd)
// 線の色: 青 (#1976d2)
// 強度: 軽い
```

#### `standardOcean`
標準的な海のテクスチャ。一般的な海域の表現に適しています。

```javascript
const texture = TexturePresets.standardOcean();
// 背景色: 中間の青 (#bbdefb)  
// 線の色: 青 (#1976d2)
// 強度: 中間
```

#### `heavyOcean`
濃い海のテクスチャ。深い海域の表現に適しています。

```javascript
const texture = TexturePresets.heavyOcean();
// 背景色: 濃い青 (#90caf9)
// 線の色: 青 (#1976d2)
// 強度: 強い
```

### 森林テクスチャ

#### `sparseForest`
疎らな森林テクスチャ。まばらな森林地帯の表現に適しています。

```javascript
const texture = TexturePresets.sparseForest();
// 背景色: 淡い緑 (#e8f5e8)
// ドットの色: 緑 (#2e7d32)
// 密度: 疎ら
```

#### `standardForest`
標準的な森林テクスチャ。一般的な森林地帯の表現に適しています。

```javascript
const texture = TexturePresets.standardForest();
// 背景色: 中間の緑 (#c8e6c9)
// ドットの色: 緑 (#2e7d32)
// 密度: 中間
```

#### `denseForest`
密な森林テクスチャ。密集した森林地帯の表現に適しています。

```javascript
const texture = TexturePresets.denseForest();
// 背景色: 濃い緑 (#a5d6a7)
// ドットの色: 緑 (#2e7d32)
// 密度: 密集
```

### 地形テクスチャ

#### `desert`
砂漠テクスチャ。砂漠地帯や乾燥地域の表現に適しています。

```javascript
const texture = TexturePresets.desert();
// 背景色: クリーム色 (#fff8e1)
// パターンの色: オレンジ (#ff8f00)
// パターン: 波形
```

#### `mountain`
山岳テクスチャ。山地や高地の表現に適しています。

```javascript
const texture = TexturePresets.mountain();
// 背景色: ベージュ (#efebe9)
// パターンの色: 茶色 (#5d4037)
// パターン: 三角形
```

### 基本テクスチャ

#### `simpleDots`
シンプルなドットテクスチャ。汎用的な用途に使用できます。

```javascript
const texture = TexturePresets.simpleDots();
// 背景色: 白 (#ffffff)
// ドットの色: 黒 (#000000)
```

#### `simpleLines`
シンプルな線テクスチャ。汎用的な用途に使用できます。

```javascript
const texture = TexturePresets.simpleLines();
// 背景色: 白 (#ffffff)
// 線の色: 黒 (#000000)
// 方向: 斜め
```

## カスタムテクスチャの作成

プリセット以外にも、カスタムテクスチャを作成できます。

### ドットテクスチャ

```javascript
import { createDotsTexture } from 'd3-thematika';

const customDots = createDotsTexture({
  id: 'myDots',
  radius: 2,
  fill: '#ff0000',
  background: '#ffffff',
  size: 8
});
```

### 線テクスチャ

```javascript
import { createLinesTexture } from 'd3-thematika';

const customLines = createLinesTexture({
  id: 'myLines',
  orientation: ['vertical', 'horizontal'],
  stroke: '#0000ff',
  strokeWidth: 2,
  background: '#f0f0f0',
  size: 10
});
```

### パステクスチャ

```javascript
import { createPathsTexture } from 'd3-thematika';

const customPath = createPathsTexture({
  id: 'myPath',
  d: 'M 0,0 L 5,5 L 10,0 Z',
  size: 15,
  background: '#ffffff',
  fill: '#00ff00',
  stroke: '#008800',
  strokeWidth: 1
});
```

## 地形別テクスチャ関数

特定の地形表現のための専用関数も利用できます。

### 海洋テクスチャ

```javascript
import { createOceanTexture } from 'd3-thematika';

const customOcean = createOceanTexture({
  id: 'myOcean',
  intensity: 'medium'  // 'light', 'medium', 'heavy'
});
```

### 森林テクスチャ

```javascript
import { createForestTexture } from 'd3-thematika';

const customForest = createForestTexture({
  id: 'myForest',
  density: 'dense'  // 'sparse', 'medium', 'dense'
});
```

### 砂漠テクスチャ

```javascript
import { createDesertTexture } from 'd3-thematika';

const customDesert = createDesertTexture({
  id: 'myDesert'
});
```

### 山岳テクスチャ

```javascript
import { createMountainTexture } from 'd3-thematika';

const customMountain = createMountainTexture({
  id: 'myMountain'
});
```

## 使用例

### 地形に応じたテクスチャの適用

```javascript
import { Map, GeojsonLayer, TexturePresets } from 'd3-thematika';

const map = new Map({
  container: '#map',
  width: 800,
  height: 600,
  projection: d3.geoMercator()
});

// 各種テクスチャを作成
const oceanTexture = TexturePresets.standardOcean();
const forestTexture = TexturePresets.standardForest();
const desertTexture = TexturePresets.desert();

// SVGのdefsにテクスチャを追加
map.svg.select('defs')
  .call(oceanTexture)
  .call(forestTexture)
  .call(desertTexture);

// 海洋レイヤー
const oceanLayer = new GeojsonLayer({
  data: oceanData,
  style: {
    fill: oceanTexture.url(),
    stroke: '#1976d2',
    'stroke-width': 0.5
  }
});

// 森林レイヤー
const forestLayer = new GeojsonLayer({
  data: forestData,
  style: {
    fill: forestTexture.url(),
    stroke: '#2e7d32',
    'stroke-width': 0.3
  }
});

// 砂漠レイヤー  
const desertLayer = new GeojsonLayer({
  data: desertData,
  style: {
    fill: desertTexture.url(),
    stroke: '#ff8f00',
    'stroke-width': 0.3
  }
});

map.addLayer('ocean', oceanLayer);
map.addLayer('forest', forestLayer);
map.addLayer('desert', desertLayer);
```

### データ属性に基づくテクスチャの動的適用

```javascript
const landUseLayer = new GeojsonLayer({
  data: landUseData,
  style: (d) => {
    let texture;
    switch (d.properties.type) {
      case 'forest':
        texture = TexturePresets.standardForest();
        break;
      case 'ocean':
        texture = TexturePresets.standardOcean();
        break;
      case 'desert':
        texture = TexturePresets.desert();
        break;
      default:
        texture = null;
    }
    
    if (texture) {
      map.svg.select('defs').call(texture);
      return { fill: texture.url() };
    }
    return { fill: '#f0f0f0' };
  }
});
```

## texture.jsとの連携

d3-thematikaは内部でtexture.jsライブラリを使用しています。直接texture.jsの機能を使用することも可能です。

```javascript
import { textures } from 'd3-thematika';

// texture.jsの直接利用
const hexTexture = textures.hexagon()
  .size(8)
  .fill('#ff0000')
  .background('#ffffff');

svg.select('defs').call(hexTexture);
// 使用: .style('fill', hexTexture.url())
```

## 注意事項

- テクスチャは描画パフォーマンスに影響する場合があります
- 各テクスチャは一意のIDを持つ必要があります
- 小さいサイズのテクスチャは高解像度で表示される際にモアレが発生する可能性があります
- テクスチャの色は地図全体の配色と調和するように選択してください