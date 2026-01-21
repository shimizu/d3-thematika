---
name: d3-thematika
description: D3.jsベースの主題図作成ライブラリの使用ガイド。レイヤー選択、パラメータ設定、ベストプラクティス。地図作成、GeoJSON可視化について。
---

# d3-thematika スキルガイド

## 概要

d3-thematikaは、D3.jsを使用してスタティックな主題図を作成するためのレイヤーベースライブラリです。

### 設計思想

- **スタティック地図専用**: パンやズーム機能は持たない
- **D3.js活用**: CSS/SVGエフェクトを適用しやすい設計
- **レイヤーベース**: 複数レイヤーを重ねて地図を構築
- **Immutableパターン**: 状態変更は新インスタンス作成で対応

## 基本ワークフロー

```javascript
// 1. Mapインスタンスを作成
const map = new Thematika.Map({
  container: '#map',
  width: 800,
  height: 600,
  projection: d3.geoNaturalEarth1()
});

// 2. レイヤーを追加
const layer = new Thematika.GeojsonLayer({
  data: geojsonData,
  attr: { fill: '#f0f0f0', stroke: '#333' }
});
map.addLayer('countries', layer);
```

## レイヤー選択ガイド

| 用途 | レイヤー | 説明 |
|------|---------|------|
| ポリゴン/ライン描画 | GeojsonLayer | GeoJSONデータの基本表示 |
| ポイント（円形） | PointCircleLayer | 円形マーカー |
| ポイント（シンボル） | PointSymbolLayer | d3.symbol形状 |
| ポイント（注釈） | PointAnnotationLayer | 引き出し線付きテキスト |
| ポイント（ラベル） | PointTextLayer | テキストラベル |
| 3Dスパイク | PointSpikeLayer | 棒グラフ風表現 |
| 接続線 | LineConnectionLayer | 直線/弧/スムース接続 |
| エッジバンドリング | LineEdgeBundlingLayer | フォースシミュレーション集約 |
| ライン上テキスト | LineTextLayer | パス上テキスト配置 |
| 画像オーバーレイ | ImageLayer | 地理座標に画像配置 |
| 経緯線 | GraticuleLayer | グリッド線 |
| 凡例 | LegendLayer | D3スケール連携凡例 |
| 地球アウトライン | OutlineLayer | 球体境界線 |

## 重要な設計方針

### Immutableパターン

setterメソッドによる動的な状態変更は禁止（setProjection除く）。

```javascript
// ❌ 禁止パターン（存在しない）
// layer.setRadius(10);

// ✅ 推奨パターン: 新インスタンス作成
const newLayer = new Thematika.PointCircleLayer({
  data: data,
  r: 10,
  attr: { fill: '#ff0000' }
});
```

### UI変更時の再描画

```javascript
function draw() {
  // 既存の地図を削除
  d3.select('#map').selectAll('*').remove();

  // UIの状態を取得
  const radiusValue = document.getElementById('radius-slider').value;

  // 新しい設定で地図を再作成
  const map = new Thematika.Map({...});
  const layer = new Thematika.PointCircleLayer({
    data: data,
    r: Number(radiusValue),
    attr: { fill: '#ff0000' }
  });
  map.addLayer('points', layer);
}

// UI変更時に再描画
document.getElementById('radius-slider').addEventListener('change', draw);
```

### イベントハンドリングなし

レイヤークラスには`on()`メソッドがありません。インタラクティブ機能が必要な場合はアプリケーション側で実装してください。

## UMDビルドでの注意点

ブラウザで使用する場合（UMDビルド）:

```html
<script src="https://d3js.org/d3.v7.min.js"></script>
<script src="thematika.umd.js"></script>
<script>
  // 必ず Thematika.ClassName 形式でアクセス
  const map = new Thematika.Map({...});
  const layer = new Thematika.GeojsonLayer({...});

  // ❌ destructuring禁止
  // const { Map, GeojsonLayer } = Thematika;
</script>
```

## 動的スタイリング

属性には固定値または関数を指定可能:

```javascript
const layer = new Thematika.GeojsonLayer({
  data: geojsonData,
  attr: {
    fill: (d, i) => d.properties.value > 100 ? '#ff0000' : '#0000ff',
    stroke: '#333',
    strokeWidth: (d, i) => i % 2 === 0 ? 2 : 1
  }
});
```

## エフェクト適用

```javascript
// フィルター定義を作成
const shadowFilter = Thematika.createDropShadow({
  id: 'shadow',
  dx: 2,
  dy: 2,
  stdDeviation: 2
});

// Mapのdefsオプションで適用
const map = new Thematika.Map({
  container: '#map',
  width: 800,
  height: 600,
  projection: d3.geoNaturalEarth1(),
  defs: [shadowFilter]
});

// レイヤーでフィルターを参照
const layer = new Thematika.GeojsonLayer({
  data: geojsonData,
  attr: {
    fill: '#f0f0f0',
    filter: shadowFilter.url()  // "url(#shadow)"
  }
});
```

## 関連ドキュメント

- [APIリファレンス](./reference.md) - 全レイヤー・ユーティリティの詳細
- [コード例集](./examples.md) - ユースケース別サンプルコード

## 型安全性

TypeScriptで使用する場合、LayerAttrとLayerStyleでジェネリック型を活用:

```typescript
import { GeojsonLayer, LayerAttr } from 'd3-thematika';

const attr: LayerAttr<GeoJSON.Feature> = {
  fill: (d) => d.properties?.color || '#ccc'
};

const layer = new GeojsonLayer({
  data: geojsonData,
  attr
});
```
