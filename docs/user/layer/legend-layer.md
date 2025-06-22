# LegendLayer

地図上に美しい凡例を表示するためのレイヤークラスです。D3スケールに基づいて自動的に凡例を生成し、様々な表示形式とカスタマイズオプションを提供します。

## 基本的な使い方

```typescript
import { LegendLayer } from 'd3-thematika';

// 基本的な序数スケールの凡例
const colorScale = d3.scaleOrdinal()
  .domain(['都市', '農村', '工業地域'])
  .range(['#ff0000', '#00ff00', '#0000ff']);

const legendLayer = new LegendLayer({
  scale: colorScale,
  position: { top: 20, left: 20 },
  title: '土地利用'
});

// 地図に追加
map.addLayer('legend', legendLayer);
```

## 初期化オプション

### 必須オプション

| プロパティ | 型 | 説明 |
|------------|-----|------|
| `scale` | `SupportedScale` | D3スケール関数（序数、連続、閾値、連続色スケール） |
| `position` | `LegendPosition` | 凡例の位置（ピクセル座標） |

### オプション設定

| プロパティ | 型 | デフォルト | 説明 |
|------------|-----|------------|------|
| `title` | `string` | - | 凡例のタイトル |
| `orientation` | `'vertical' \| 'horizontal'` | `'vertical'` | 配置方向 |
| `itemSpacing` | `number` | `20` | アイテム間のスペース（ピクセル） |
| `fontSize` | `number` | `12` | フォントサイズ |
| `symbolType` | `LegendSymbolType` | 自動推論 | シンボルの種類 |
| `symbolSize` | `SymbolSize` | `{ fixed: 16 }` | シンボルのサイズ設定 |
| `sizeScale` | `ScaleLinear<number, number>` | - | サイズスケール |
| `overlapping` | `boolean` | `false` | 重ね表示モード |
| `showBackground` | `boolean` | `true` | 背景ボックスの表示 |
| `enableDrag` | `boolean` | `true` | ドラッグ機能の有効化 |

## シンボルタイプ

### cell（セル）
矩形のシンボルを表示します。カテゴリカルデータに適しています。

```typescript
const legendLayer = new LegendLayer({
  scale: colorScale,
  position: { top: 20, left: 20 },
  symbolType: 'cell'
});
```

### circle（円）
円形のシンボルを表示します。量的データやサイズスケールに適しています。

```typescript
const legendLayer = new LegendLayer({
  scale: colorScale,
  position: { top: 20, left: 20 },
  symbolType: 'circle'
});
```

### line（線）
線のシンボルを表示します。線の太さや種類を表現する際に使用します。

```typescript
const legendLayer = new LegendLayer({
  scale: colorScale,
  position: { top: 20, left: 20 },
  symbolType: 'line'
});
```

### gradient（グラデーション）
連続的なグラデーションバーを表示します。連続スケールに適しています。

```typescript
const colorScale = d3.scaleLinear()
  .domain([0, 100])
  .range(['#ffffff', '#ff0000']);

const legendLayer = new LegendLayer({
  scale: colorScale,
  position: { top: 20, left: 20 },
  symbolType: 'gradient'
});
```

## サイズスケール機能

### 基本的なサイズスケール

```typescript
// 色スケール
const colorScale = d3.scaleOrdinal()
  .domain(['小', '中', '大'])
  .range(['#ffcccc', '#ff6666', '#ff0000']);

// サイズスケール
const sizeScale = d3.scaleLinear()
  .domain([0, 1, 2])
  .range([5, 15, 30]); // 円の場合は半径、セルの場合は面積

const sizeLegend = new LegendLayer({
  scale: colorScale,
  sizeScale: sizeScale,
  symbolType: 'circle',
  position: { top: 200, left: 20 },
  title: 'サイズ可変凡例'
});
```

### 重ね表示モード

サイズスケールを使用する際に、美しい重ね表示を実現できます。

```typescript
const sizeLegend = new LegendLayer({
  scale: colorScale,
  sizeScale: sizeScale,
  symbolType: 'circle',
  position: { top: 200, left: 20 },
  title: 'サイズ可変凡例',
  overlapping: true // 重ね表示モードを有効化
});
```

#### 重ね表示モードの特徴
- シンボルがボトム揃えで美しく重なる
- 各シンボルの中心からラベルへのガイドライン
- 枠線のみのプロフェッショナルなデザイン
- 円とセルタイプで利用可能

## 配置とレイアウト

### 縦方向配置（デフォルト）

```typescript
const legendLayer = new LegendLayer({
  scale: colorScale,
  position: { top: 20, left: 20 },
  orientation: 'vertical',
  itemSpacing: 25
});
```

### 横方向配置

```typescript
const legendLayer = new LegendLayer({
  scale: colorScale,
  position: { top: 20, left: 20 },
  orientation: 'horizontal',
  itemSpacing: 80
});
```

サイズスケール使用時の横方向配置では、シンボルとラベルが自動的にボトム揃えされます。

## 背景とスタイリング

### 背景ボックスのカスタマイズ

```typescript
const legendLayer = new LegendLayer({
  scale: colorScale,
  position: { top: 20, left: 20 },
  showBackground: true,
  backgroundStyle: {
    fill: '#f8f9fa',
    stroke: '#dee2e6',
    strokeWidth: 1,
    opacity: 0.95,
    rx: 6,
    ry: 6,
    padding: 12
  }
});
```

### 背景スタイルオプション

| プロパティ | 型 | デフォルト | 説明 |
|------------|-----|------------|------|
| `fill` | `string` | `'#ffffff'` | 背景色 |
| `stroke` | `string` | `'#cccccc'` | 境界線の色 |
| `strokeWidth` | `number` | `1` | 境界線の幅 |
| `opacity` | `number` | `0.9` | 透明度 |
| `rx` | `number` | `4` | 角丸の半径（X方向） |
| `ry` | `number` | `4` | 角丸の半径（Y方向） |
| `padding` | `number` | `8` | パディング |

## 動的な操作

### スケールの更新

```typescript
// スケールを更新
const newScale = d3.scaleOrdinal()
  .domain(['新カテゴリ1', '新カテゴリ2'])
  .range(['#blue', '#green']);

legendLayer.updateScale(newScale);
```

### 位置の変更

```typescript
// 位置を変更
legendLayer.updatePosition({ top: 100, left: 200 });
```

### 背景の切り替え

```typescript
// 背景の表示/非表示
legendLayer.updateBackgroundVisibility(false);

// 背景スタイルの更新
legendLayer.updateBackgroundStyle({
  fill: '#f0f0f0',
  opacity: 0.8
});
```

## 使用例

### 完全な実装例

```typescript
// データセットアップ
const geojsonData = await d3.json('data/regions.geojson');

// カラースケール
const colorScale = d3.scaleOrdinal()
  .domain(['都市部', '郊外', '農村'])
  .range(['#e31a1c', '#ff7f00', '#33a02c']);

// 地図レイヤー
const regionLayer = new GeojsonLayer({
  data: geojsonData,
  attr: {
    fill: (d) => colorScale(d.properties.type),
    stroke: '#333',
    strokeWidth: 0.5
  }
});

// 凡例レイヤー
const legendLayer = new LegendLayer({
  scale: colorScale,
  position: { top: 30, left: 30 },
  title: '地域分類',
  orientation: 'vertical',
  symbolType: 'cell',
  fontSize: 14,
  itemSpacing: 22,
  showBackground: true,
  backgroundStyle: {
    fill: '#ffffff',
    stroke: '#ddd',
    opacity: 0.95,
    padding: 15,
    rx: 5
  }
});

// 地図に追加
map.addLayer('regions', regionLayer);
map.addLayer('legend', legendLayer);
```

### サイズスケール付き凡例

```typescript
// 人口密度データの可視化
const densityScale = d3.scaleSequential(d3.interpolateYlOrRd)
  .domain([0, 1000]);

const sizeScale = d3.scaleLinear()
  .domain([0, 1000])
  .range([5, 25]); // 半径

const densityLegend = new LegendLayer({
  scale: densityScale,
  sizeScale: sizeScale,
  position: { top: 50, left: 250 },
  title: '人口密度（人/km²）',
  symbolType: 'circle',
  overlapping: true, // 美しい重ね表示
  orientation: 'vertical',
  fontSize: 12
});

map.addLayer('density-legend', densityLegend);
```

## 注意事項

- `position`は絶対座標（ピクセル）で指定します
- サイズスケールは`circle`と`cell`タイプでのみ有効です
- 重ね表示モード（`overlapping`）はサイズスケール使用時のみ適用されます
- ドラッグ機能はデフォルトで有効ですが、`enableDrag: false`で無効化できます
- 大量のカテゴリを持つスケールの場合、適切な`itemSpacing`の調整が推奨されます

## 関連項目

- [Map](../map.md) - 基本的な地図の作成方法
- [GeojsonLayer](./geojson-layer.md) - GeoJSONデータの表示
- [D3 Scales](https://d3js.org/d3-scale) - D3スケールの詳細