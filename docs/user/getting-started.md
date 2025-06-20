# はじめに

d3-Cartgraphyライブラリの基本的な使い方を学びましょう。

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

// 地図インスタンスを作成
const map = new Cartography({
    container: '#map',    // 描画先のDOM要素
    width: 800,          // 地図の幅
    height: 600,         // 地図の高さ
    projection: 'naturalEarth1'  // 投影法
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

// レイヤーを追加
map.addLayer('countries', {
    data: worldData,
    style: {
        fill: '#e8f4f8',
        stroke: '#2c3e50',
        strokeWidth: 0.5,
        opacity: 1
    }
});
```

## 投影法の選択

d3-Cartgraphyは複数の投影法をサポートしています：

```javascript
// Natural Earth I (推奨)
const map1 = new Cartography({
    container: '#map1',
    width: 800,
    height: 600,
    projection: 'naturalEarth1'
});

// メルカトル図法
const map2 = new Cartography({
    container: '#map2',
    width: 800,
    height: 600,
    projection: 'mercator'
});

// 正射図法（地球儀風）
const map3 = new Cartography({
    container: '#map3',
    width: 800,
    height: 600,
    projection: 'orthographic'
});

// 正距円筒図法
const map4 = new Cartography({
    container: '#map4',
    width: 800,
    height: 600,
    projection: 'equirectangular'
});
```

## スタイルの設定

### 基本的なスタイル

```javascript
map.addLayer('countries', {
    data: worldData,
    style: {
        fill: '#3498db',        // 塗りつぶし色
        stroke: '#2c3e50',      // 境界線の色
        strokeWidth: 1,         // 境界線の幅
        opacity: 0.8,           // 透明度
        className: 'country'    // CSSクラス名
    }
});
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
map.addLayer('ocean', {
    data: oceanData,
    style: {
        fill: '#3498db',
        stroke: 'none'
    }
});

// 国境レイヤー
map.addLayer('countries', {
    data: countryData,
    style: {
        fill: '#e8f4f8',
        stroke: '#2c3e50',
        strokeWidth: 0.5
    }
});

// 都市レイヤー
map.addLayer('cities', {
    data: cityData,
    style: {
        fill: '#e74c3c',
        stroke: '#c0392b',
        strokeWidth: 1
    }
});
```

## レイヤーの操作

```javascript
// レイヤーの表示/非表示
map.setLayerVisibility('cities', false);  // 非表示
map.setLayerVisibility('cities', true);   // 表示

// レイヤーの削除
map.removeLayer('cities');

// レイヤーのスタイル更新
map.updateLayerStyle('countries', {
    fill: '#95a5a6'
});

// 描画順序の変更
map.setLayerZIndex('countries', 10);
```

## 地図のサイズ変更

```javascript
// レスポンシブ対応
window.addEventListener('resize', () => {
    const container = document.getElementById('map');
    const width = container.offsetWidth;
    const height = container.offsetHeight;
    
    map.resize(width, height);
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

## 次のステップ

基本的な地図が作成できたら、以下のドキュメントを参照してください：

- [API リファレンス](./api-reference.md) - 詳細なAPI仕様
- [主題図の作成](./thematic-maps.md) - データ可視化の手法
- [スタイリング](./styling.md) - 高度なスタイリング技法
- [チュートリアル](./tutorials/) - 実践的な例