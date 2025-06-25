# レイヤーアクセスとgetLayerGroup()

## 概要

d3-thematikaライブラリは、**初期設定以降に描画された地図を動的に変更する機能を持ちません**。スタイルや設定は、レイヤー作成時にのみ指定可能です。

## ライブラリの設計方針

### 提供していない機能
```javascript
// ❌ このような動的更新メソッドは提供していません
layer.setColor('red');
layer.setOpacity(0.5);
layer.updateStyle({ fill: 'blue' });
```

### 基本的な使用方法
```javascript
// ✅ レイヤー作成時にすべての設定を指定
const layer = new Thematika.GeojsonLayer({
  data: geojsonData,
  style: {
    fill: 'red',
    opacity: 0.5,
    stroke: '#333'
  }
});
map.addLayer('my-layer', layer);
```

## getLayerGroup()メソッド

### 目的

`getLayerGroup()`メソッドは、レイヤーのD3セレクションに直接アクセスするために提供されています。これにより、ライブラリが提供していない高度なD3操作を実行できます。

### 基本的な使用方法

```javascript
// レイヤーを作成・追加
const layer = new Thematika.GeojsonLayer({
  data: geojsonData,
  style: { fill: 'blue' }
});
map.addLayer('countries', layer);

// レイヤーグループのD3セレクションを取得
const layerGroup = layer.getLayerGroup();

// 子要素にアクセス
const paths = layerGroup.selectAll('path');
const circles = layerGroup.selectAll('circle');
```

## 動的な地図更新が必要な場合

それでも動的に地図のスタイルを変更したい場合は、`getLayerGroup()`メソッドを使用してD3セレクションに直接アクセスできます：

### 例1: 特定の要素のハイライト

```javascript
const layer = new Thematika.GeojsonLayer({
  data: geojsonData,
  style: { fill: 'blue' }
});
map.addLayer('countries', layer);

// 特定の国をハイライト
function highlightCountry(countryName) {
  const layerGroup = layer.getLayerGroup();
  
  layerGroup.selectAll('path')
    .style('fill', d => {
      return d.properties.name === countryName ? 'red' : 'blue';
    });
}
```

### 例2: インタラクティブなホバー効果

```javascript
function addHoverEffect() {
  const layerGroup = layer.getLayerGroup();
  
  layerGroup.selectAll('path')
    .on('mouseover', function(event, d) {
      d3.select(this).style('fill', 'orange');
    })
    .on('mouseout', function(event, d) {
      d3.select(this).style('fill', 'blue');
    });
}
```

### 例3: 動的なスタイル変更

```javascript
function changeLayerOpacity(opacity) {
  const layerGroup = layer.getLayerGroup();
  layerGroup.style('opacity', opacity);
}

function changeStrokeWidth(width) {
  const layerGroup = layer.getLayerGroup();
  layerGroup.selectAll('path').style('stroke-width', width);
}
```

## 利点と注意事項

### ライブラリ設計の利点
- **シンプルさ**: 動的な状態管理が不要で、APIが分かりやすい
- **予測可能性**: 作成時の設定がそのまま維持される
- **一貫性**: すべてのレイヤーで同じパターンを使用

### getLayerGroup()の利点
- **柔軟性**: D3の全機能にアクセス可能
- **拡張性**: ライブラリが提供していない機能を実装可能
- **インタラクティブ性**: ホバー効果やクリックイベントを追加可能

### 注意事項

1. **一時的な変更**: `getLayerGroup()`による変更は、レイヤーが再作成されると失われます
2. **責任**: D3による直接操作は、ユーザーの責任で行ってください
3. **型安全性**: TypeScriptを使用している場合、適切な型キャストが必要な場合があります

## まとめ

d3-thematikaは、レイヤー作成時にすべての設定を指定する設計を採用しています。動的な変更が必要な場合は、`getLayerGroup()`メソッドを使用してD3セレクションに直接アクセスし、必要な操作を実装してください。