# はじめに

d3-cartographyライブラリの基本的な使い方を学びましょう。

## インストール

### NPMを使用する場合

```bash
npm install d3-cartography d3-geo d3-selection
```

### CDNを使用する場合

```html
<script src="https://d3js.org/d3.v7.min.js"></script>
<script src="https://unpkg.com/d3-cartography/dist/cartography.umd.js"></script>
```

## 基本的な地図の作成

### 1. HTMLの準備

```html
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <title>My First Map</title>
    <style>
        #map {
            border: 1px solid #ccc;
        }
    </style>
</head>
<body>
    <div id="map"></div>
</body>
</html>
```

### 2. JavaScriptで地図を作成

```javascript
// ES Modulesを使用する場合
import { Cartography } from 'd3-cartography';

// UMDを使用する場合
// const { Cartography } = window.Cartography;

// D3投影法を設定
const projection = d3.geoNaturalEarth1()
    .fitExtent([[0, 0], [800, 600]], worldData);

// 地図インスタンスを作成
const map = new Cartography({
    container: '#map',    // 描画先のDOM要素
    width: 800,          // 地図の幅
    height: 600,         // 地図の高さ
    projection: projection  // D3投影法オブジェクト
});
```

### 3. レイヤーを追加

```javascript
// GeoJSONデータを準備（例：世界の国境）
const worldData = {
    "type": "FeatureCollection",
    "features": [
        // ... GeoJSONフィーチャー
    ]
};

// GeojsonLayerインスタンスを作成
const worldLayer = new Cartography.GeojsonLayer({
    data: worldData,
    style: {
        fill: '#e8f4f8',
        stroke: '#2c3e50',
        strokeWidth: 0.5,
        opacity: 1
    }
});

// レイヤーを地図に追加
map.addLayer('countries', worldLayer);
```

## 投影法の選択

d3-cartographyは複数の投影法をサポートしています：

```javascript
// Natural Earth I (推奨)
const projection1 = d3.geoNaturalEarth1()
    .fitExtent([[0, 0], [800, 600]], worldData);
const map1 = new Cartography({
    container: '#map1',
    width: 800,
    height: 600,
    projection: projection1
});

// メルカトル図法
const projection2 = d3.geoMercator()
    .fitExtent([[0, 0], [800, 600]], worldData);
const map2 = new Cartography({
    container: '#map2',
    width: 800,
    height: 600,
    projection: projection2
});

// 正射図法（地球儀風）
const projection3 = d3.geoOrthographic()
    .fitExtent([[0, 0], [800, 600]], worldData);
const map3 = new Cartography({
    container: '#map3',
    width: 800,
    height: 600,
    projection: projection3
});

// Equal Earth図法
const projection4 = d3.geoEqualEarth()
    .fitExtent([[0, 0], [800, 600]], worldData);
const map4 = new Cartography({
    container: '#map4',
    width: 800,
    height: 600,
    projection: projection4
});
```

## スタイルの設定

### 基本的なスタイル

```javascript
const countryLayer = new Cartography.GeojsonLayer({
    data: worldData,
    style: {
        fill: '#3498db',        // 塗りつぶし色
        stroke: '#2c3e50',      // 境界線の色
        strokeWidth: 1,         // 境界線の幅
        opacity: 0.8,           // 透明度
        className: 'country'    // CSSクラス名
    }
});
map.addLayer('countries', countryLayer);
```

### CSSでのスタイリング

```css
.country {
    transition: fill 0.3s ease;
}

.country:hover {
    fill: #e74c3c !important;
}
```

## 複数レイヤーの管理

```javascript
// 背景レイヤー（海）
const oceanLayer = new Cartography.GeojsonLayer({
    data: oceanData,
    style: {
        fill: '#3498db',
        stroke: 'none'
    }
});
map.addLayer('ocean', oceanLayer);

// 国境レイヤー
const countryLayer = new Cartography.GeojsonLayer({
    data: countryData,
    style: {
        fill: '#e8f4f8',
        stroke: '#2c3e50',
        strokeWidth: 0.5
    }
});
map.addLayer('countries', countryLayer);

// 都市レイヤー
const cityLayer = new Cartography.GeojsonLayer({
    data: cityData,
    style: {
        fill: '#e74c3c',
        stroke: '#c0392b',
        strokeWidth: 1
    }
});
map.addLayer('cities', cityLayer);
```

## レイヤーの操作

```javascript
// レイヤーの表示/非表示
map.getLayer('cities').setVisible(false);  // 非表示
map.getLayer('cities').setVisible(true);   // 表示

// レイヤーの削除
map.removeLayer('cities');

// レイヤーのスタイル更新
map.getLayer('countries').setStyle({
    fill: '#95a5a6'
});

// 描画順序の変更
map.getLayer('countries').setZIndex(10);
```

## 地図のサイズ変更

```javascript
// レスポンシブ対応
window.addEventListener('resize', () => {
    // リサイズ時は地図を再作成する方法を推奨
    const container = document.getElementById('map');
    const width = container.offsetWidth;
    const height = container.offsetHeight;
    
    // 地図を再作成
    createMap(width, height);
});
```

## エラーハンドリング

```javascript
try {
    const map = new Cartography({
        container: '#map',
        width: 800,
        height: 600,
        projection: 'naturalEarth1'
    });
    
    map.addLayer('countries', {
        data: worldData,
        style: { fill: '#3498db' }
    });
} catch (error) {
    console.error('地図の作成に失敗しました:', error);
}
```

## 特殊レイヤーの使用

### OutlineLayer（アウトラインレイヤー）

投影法の境界線を描画し、他のレイヤーをクリップする機能を提供します。

```javascript
// アウトラインレイヤー（クリップ機能付き）
const outlineLayer = new Cartography.OutlineLayer({
    createClipPath: true,  // クリップパスを作成
    style: {
        fill: 'none',
        stroke: '#333',
        strokeWidth: 2
    }
});
map.addLayer('outline', outlineLayer);
```

### GraticuleLayer（経緯線レイヤー）

経緯線網（グラティキュール）を描画します。

```javascript
// 経緯線レイヤー
const graticuleLayer = new Cartography.GraticuleLayer({
    step: [15, 15],  // 15度間隔
    style: {
        fill: 'none',
        stroke: '#ddd',
        strokeWidth: 0.5,
        opacity: 0.7
    }
});
map.addLayer('graticule', graticuleLayer);
```

## 次のステップ

基本的な地図が作成できたら、以下のドキュメントを参照してください：

- [デバッグ](./debug.md) - 座標変換テストやデバッグ機能