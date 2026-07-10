# d3-thematika 完全リファレンス（LLM向け）

D3.jsベースの静的主題図（thematic map）作成ライブラリ。SVGを出力し、CSSやSVGエフェクトを自由に適用できる。パン・ズームなどのインタラクション機能は持たない。

## 目次

1. [基本概念と設計方針](#基本概念と設計方針)
2. [セットアップ](#セットアップ)
3. [Map クラス](#map-クラス)
4. [共通型定義](#共通型定義)
5. [レイヤー一覧と詳細](#レイヤー一覧と詳細)
6. [エフェクトユーティリティ](#エフェクトユーティリティ)
7. [テクスチャユーティリティ](#テクスチャユーティリティ)
8. [カラーパレット](#カラーパレット)
9. [分級ユーティリティ](#分級ユーティリティ)
10. [GISユーティリティ](#gisユーティリティ)
11. [タイルユーティリティ](#タイルユーティリティ)
12. [実用パターン集](#実用パターン集)

---

## 基本概念と設計方針

### Immutableパターン
レイヤーの状態変更は動的更新ではなく、新しいインスタンス作成で対応する。`setXxx()` メソッドによる動的な状態変更は禁止（`setProjection()` のみ例外）。設定変更が必要な場合は `draw()` 関数内で地図全体を再作成する。

### イベントハンドリングなし
レイヤークラスに `on()` メソッドやD3イベントリスナーは設定しない。インタラクティブ機能はアプリケーション側で実装する。

### レイヤーベースアーキテクチャ
Map → LayerManager → 各Layer という階層構造。レイヤーはz-index制御・表示/非表示切り替えが可能。

---

## セットアップ

### UMDビルド（ブラウザ）

```html
<!-- 必須: D3.js -->
<script src="https://d3js.org/d3.v7.min.js"></script>
<!-- ライブラリ本体 -->
<script src="thematika.umd.js"></script>

<script>
// UMDビルドでは Thematika 名前空間経由でアクセス
// ※ destructuring禁止: const { Map } = Thematika はNG
const map = new Thematika.Map({...});
const layer = new Thematika.GeojsonLayer({...});
</script>
```

**重要**: UMDビルドでは必ず `Thematika.ClassName` 形式でアクセスする。destructuringは使用不可。

### ESMビルド

```javascript
import { Map, GeojsonLayer } from 'd3-thematika';
```

### 外部依存（UMD使用時は別途読み込み必要）
- `d3-geo`, `d3-selection`, `d3-force`, `d3-shape`, `d3-contour`
- `@turf/turf` → グローバル `turf`
- `geotiff` → グローバル `GeoTIFF`

---

## Map クラス

主題図描画のメインオーケストレーター。SVG作成、投影法管理、レイヤー管理を行う。

### コンストラクタ

```typescript
new Map(options: ThematikaOptions)
```

```typescript
interface ThematikaOptions {
  container: string;           // CSSセレクタ（例: '#map'）
  width: number;               // 地図の幅（ピクセル）
  height: number;              // 地図の高さ（ピクセル）
  projection: GeoProjection;   // D3投影法オブジェクト
  defs?: any[];                // SVG定義（フィルター、テクスチャ等）のコールバック配列
  backgroundColor?: string;    // 背景色（デフォルト: '#ffffff'）
}
```

### メソッド一覧

| メソッド | 説明 |
|---------|------|
| `addLayer(id: string, layer: ILayer)` | レイヤーを追加 |
| `removeLayer(id: string)` | レイヤーを削除 |
| `setLayerVisibility(id: string, visible: boolean)` | レイヤーの表示/非表示切り替え |
| `setLayerZIndex(id: string, zIndex: number)` | レイヤーの描画順序変更 |
| `setProjection(projection: GeoProjection)` | 投影法を変更し全レイヤーを再描画 |
| `resize(width: number, height: number)` | 地図サイズを変更し全レイヤーを再描画 |
| `fitBounds(bounds: [minLng, minLat, maxLng, maxLat], padding?: number)` | 指定境界にフィット |
| `clearAllLayers()` | 全レイヤーを削除 |
| `getSVG(): SVGSVGElement` | SVG要素を取得 |
| `getProjection(): GeoProjection` | 現在の投影法を取得 |
| `getLayerManager(): LayerManager` | レイヤーマネージャーを取得 |
| `getSize(): [number, number]` | [width, height] を取得 |
| `getLayerIds(): string[]` | レイヤーID配列を取得 |
| `saveSVG(filename: string)` | SVGファイルとしてダウンロード |
| `savePNG(filename: string)` | PNGファイルとしてダウンロード |

---

## 共通型定義

### LayerAttr\<T\>

SVG属性の設定。全プロパティは固定値またはデータに応じた関数を受け取る。

```typescript
interface LayerAttr<T = any> {
  fill?: string | ((d: T, index?: number) => string);
  fillOpacity?: number | ((d: T, index?: number) => number);
  stroke?: string | ((d: T, index?: number) => string);
  strokeWidth?: number | ((d: T, index?: number) => number);
  strokeDasharray?: string | ((d: T, index?: number) => string);
  opacity?: number | ((d: T, index?: number) => number);
  filter?: string | ((d: T, index?: number) => string);
  clipPath?: string | ((d: T, index?: number) => string);
  className?: string;
}
```

### LayerStyle\<T\>

CSS style属性の設定。任意のCSSプロパティをキーに指定できる。

```typescript
interface LayerStyle<T = any> {
  [property: string]: string | number | ((d: T, index?: number) => string | number) | undefined;
}
```

### 属性適用の仕組み
- **固定値**（string/number）: レイヤーグループ（`<g>`要素）に適用
- **関数**（コールバック）: 個別の要素（`<path>`, `<circle>`等）にデータバインドで適用

---

## レイヤー一覧と詳細

全15種類のレイヤーを提供。全レイヤーは `BaseLayer` を継承し、`attr` と `style` オプションで見た目を制御する。

### 一覧

| カテゴリ | クラス名 | 用途 |
|---------|---------|------|
| Geo | `GeojsonLayer` | GeoJSONデータの描画 |
| Geo | `GraticuleLayer` | 経緯線グリッド |
| Geo | `OutlineLayer` | 地球アウトライン、クリップパス生成 |
| Raster | `ImageLayer` | 画像の投影変換表示 |
| Utils | `LegendLayer` | D3スケール連携凡例 |
| Point | `PointCircleLayer` | 円形ポイント |
| Point | `PointSymbolLayer` | d3.symbol シンボル |
| Point | `PointSpikeLayer` | 3Dスパイク表示 |
| Line | `LineConnectionLayer` | 直線・弧・スムージング接続 |
| Line | `LineTaperedLayer` | テーパーアーク型ポリゴン接続 |
| Line | `LineEdgeBundlingLayer` | エッジバンドリング |
| Text | `TextLayer` | テキストラベル（ポイント/ポリゴン重心配置） |
| Utils | `ScaleBarLayer` | 縮尺（スケールバー） |
| Utils | `TitleLayer` | タイトル・出典表記（ピクセル座標配置） |
| Utils | `NorthArrowLayer` | 方位記号（真北方向へ自動回転） |

---

### GeojsonLayer

GeoJSONデータをSVGパスとして描画する。

```typescript
new GeojsonLayer(options: GeojsonLayerOptions)
```

```typescript
interface GeojsonLayerOptions {
  data: GeoJSON.FeatureCollection | GeoJSON.Feature[];
  attr?: LayerAttr<GeoJSON.Feature>;
  style?: LayerStyle<GeoJSON.Feature>;
}
```

**使用例（UMD）:**
```javascript
const layer = new Thematika.GeojsonLayer({
  data: geojson,
  attr: {
    fill: (d, i) => colorScale(d.properties.value),
    stroke: '#333',
    'stroke-width': 0.5,
    opacity: 0.9
  }
});
map.addLayer('countries', layer);
```

---

### GraticuleLayer

経緯線（グラティキュール）を描画する。

```typescript
new GraticuleLayer(options?: GraticuleLayerOptions)
```

```typescript
interface GraticuleLayerOptions {
  attr?: LayerAttr;
  style?: LayerStyle;
  step?: [number, number];  // [経度間隔, 緯度間隔]（度）デフォルト: [10, 10]
  extent?: [[number, number], [number, number]];  // [[西端, 南端], [東端, 北端]]
}
```

**デフォルトattr:** `{ fill: 'none', stroke: '#cccccc', strokeWidth: 0.5, opacity: 0.7 }`

**使用例:**
```javascript
const graticule = new Thematika.GraticuleLayer({
  step: [15, 15],
  attr: { stroke: '#ddd', 'stroke-width': 0.3 }
});
map.addLayer('graticule', graticule);
```

---

### OutlineLayer

地球の輪郭を描画する。オプションでクリップパスを生成し、地図コンテンツを地球の形に切り抜ける。

```typescript
new OutlineLayer(options?: OutlineLayerOptions)
```

```typescript
interface OutlineLayerOptions {
  attr?: LayerAttr;
  style?: LayerStyle;
  createClipPath?: boolean;   // クリップパス生成（デフォルト: false）
  clipPathId?: string;         // クリップパスのID
}
```

**追加メソッド:**
- `getClipPathId(): string`
- `getClipPathUrl(): string` — `url(#id)` 形式の文字列を返す

**使用例:**
```javascript
const outline = new Thematika.OutlineLayer({
  createClipPath: true,
  clipPathId: 'earth-clip',
  attr: { fill: '#e8f4ff', stroke: '#333', 'stroke-width': 1.5 }
});
map.addLayer('outline', outline);
```

---

### ImageLayer

画像（衛星画像、地形データ等）を地図上に投影変換して表示する。Equirectangular投影法では高速直接描画、その他の投影法では再投影処理を行う。

```typescript
new ImageLayer(id: string, options: ImageLayerOptions)
```

**注意:** ImageLayerのみコンストラクタの第1引数に明示的なIDが必要。

```typescript
interface ImageLayerOptions {
  src: string;                              // 画像URL
  bounds: [number, number, number, number]; // [west, south, east, north]
  attr?: LayerAttr;
  style?: LayerStyle;
  showBboxMarkers?: boolean;                // 四隅マーカー表示（デフォルト: false）
}
```

**使用例:**
```javascript
const imageLayer = new Thematika.ImageLayer('satellite', {
  src: 'image.png',
  bounds: [120, 20, 150, 50],
  showBboxMarkers: false
});
map.addLayer('raster', imageLayer);
```

---

### LegendLayer

D3スケールと連携した凡例を自動生成する。ドラッグ移動対応。

```typescript
new LegendLayer(options: LegendLayerOptions)
```

```typescript
interface LegendLayerOptions {
  scale: SupportedScale;            // D3スケール（Ordinal, Sequential, Linear, Threshold）
  position: LegendPosition;         // { top: number, left: number }
  title?: string;                   // 凡例タイトル
  orientation?: 'vertical' | 'horizontal';  // デフォルト: 'vertical'
  itemSpacing?: number;             // アイテム間スペース（px）
  fontSize?: number;
  width?: number;
  height?: number;
  attr?: LayerAttr;
  style?: LayerStyle;
  symbolType?: LegendSymbolType;    // 'cell' | 'circle' | 'line' | 'gradient'
  symbolSize?: SymbolSize;          // { min?, max?, fixed? }
  sizeScale?: ScaleLinear<number, number>;  // circleタイプ用サイズスケール
  gradientSteps?: number;           // gradientタイプ用ステップ数
  enableDrag?: boolean;             // ドラッグ有効（デフォルト: false）
  showBackground?: boolean;         // 背景ボックス表示
  backgroundStyle?: LegendBackgroundStyle;
  overlapping?: boolean;            // 重ね表示モード（サイズスケール時のみ）
  labelFormat?: (value: any) => string;  // ラベルの数値フォーマット関数（例: d3.format(',.1f')）
}

type SupportedScale = ScaleOrdinal<any, string> | ScaleSequential<string>
  | ScaleLinear<number, string> | ScaleThreshold<number, string>
  | ScaleLinear<number, number>;

interface LegendBackgroundStyle {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  rx?: number;
  ry?: number;
  padding?: number;
}
```

**使用例:**
```javascript
const colorScale = d3.scaleOrdinal()
  .domain(['森林', '水域', '都市'])
  .range(['#2d6a4f', '#0077b6', '#e63946']);

const legend = new Thematika.LegendLayer({
  scale: colorScale,
  position: { top: 20, left: 20 },
  title: '土地利用',
  symbolType: 'cell',
  enableDrag: true,
  showBackground: true,
  backgroundStyle: { fill: '#fff', opacity: 0.9, rx: 4, padding: 10 }
});
map.addLayer('legend', legend);
```

---

### PointCircleLayer

GeoJSONデータを円形ポイントとして描画する。Pointジオメトリはそのまま、Polygon/LineStringは重心にプロットする。

```typescript
new PointCircleLayer(options: PointCircleLayerOptions)
```

```typescript
interface PointCircleLayerOptions {
  data: GeoJSON.FeatureCollection | GeoJSON.Feature[];
  attr?: LayerAttr<GeoJSON.Feature>;
  style?: LayerStyle<GeoJSON.Feature>;
  r?: number | ((feature: GeoJSON.Feature, index: number) => number);  // 半径（デフォルト: 5）
}
```

**使用例:**
```javascript
const circles = new Thematika.PointCircleLayer({
  data: cities,
  r: (d) => Math.sqrt(d.properties.population) / 100,
  attr: {
    fill: '#e63946',
    'fill-opacity': 0.6,
    stroke: '#fff',
    'stroke-width': 1
  }
});
map.addLayer('cities', circles);
```

---

### PointSymbolLayer

d3.symbolを使用したシンボル表示。

```typescript
new PointSymbolLayer(options: PointSymbolLayerOptions)
```

```typescript
interface PointSymbolLayerOptions {
  data: GeoJSON.FeatureCollection | GeoJSON.Feature[];
  attr?: LayerAttr<GeoJSON.Feature>;
  style?: LayerStyle<GeoJSON.Feature>;
  size?: number | ((feature: GeoJSON.Feature, index: number) => number);        // デフォルト: 64
  symbolType?: SymbolType | ((feature: GeoJSON.Feature, index: number) => SymbolType);  // デフォルト: symbolCross
}
```

**利用可能なシンボルタイプ:** `symbolCircle`, `symbolCross`, `symbolDiamond`, `symbolSquare`, `symbolStar`, `symbolTriangle`, `symbolWye`（d3-shapeからインポート）

**使用例:**
```javascript
const symbols = new Thematika.PointSymbolLayer({
  data: airports,
  size: 100,
  symbolType: d3.symbolStar,
  attr: { fill: '#ffd700', stroke: '#333' }
});
map.addLayer('airports', symbols);
```

---

### PointSpikeLayer

3Dスパイク（棒グラフ風）表示。データ値に応じた長さのスパイクを各ポイントに配置する。

```typescript
new PointSpikeLayer(options: PointSpikeLayerOptions)
```

```typescript
interface PointSpikeLayerOptions {
  data: GeoJSON.FeatureCollection | GeoJSON.Feature[];
  attr?: LayerAttr;
  style?: LayerStyle;
  length?: number | ((feature: GeoJSON.Feature, index: number) => number);  // デフォルト: 50
  direction?: 'up' | 'down' | 'left' | 'right';  // デフォルト: 'up'
}
```

スパイクの幅は長さの20%で自動計算される。

**使用例:**
```javascript
const spikes = new Thematika.PointSpikeLayer({
  data: earthquakes,
  length: (d) => d.properties.magnitude * 15,
  direction: 'up',
  attr: { fill: '#e63946', 'fill-opacity': 0.7, stroke: '#333', 'stroke-width': 0.5 }
});
map.addLayer('spikes', spikes);
```

---

### LineConnectionLayer

2点間をライン（直線・弧・スムージング曲線）で接続する。LineString/MultiLineString GeoJSONをサポート。

```typescript
new LineConnectionLayer(options: LineConnectionLayerOptions)
```

```typescript
interface LineConnectionLayerOptions {
  data: GeoJSON.Feature | GeoJSON.Feature[] | GeoJSON.FeatureCollection;
  attr?: LayerAttr<GeoJSON.Feature>;
  style?: LayerStyle<GeoJSON.Feature>;
  lineType?: 'straight' | 'arc' | 'smooth';  // デフォルト: 'straight'
  arcHeight?: number;                          // デフォルト: 0.3
  arcControlPoint?: ArcControlPointType;       // 'center' | 'weighted' | [number, number]
  arcOffset?: ArcOffsetType;                   // 'perpendicular' | 'north' | 'south' | 'east' | 'west' | [number, number]
  startArrow?: boolean;                        // デフォルト: false
  endArrow?: boolean;                          // デフォルト: false
  arrowSize?: number;                          // デフォルト: 10
  smoothType?: 'curveBasis' | 'curveCardinal' | 'curveCatmullRom' | 'curveLinear' | 'curveMonotoneX' | 'curveMonotoneY' | 'curveNatural' | 'curveStep' | 'curveStepAfter' | 'curveStepBefore';
}
```

**使用例:**
```javascript
// 弧状の接続線
const arcs = new Thematika.LineConnectionLayer({
  data: flightRoutes,
  lineType: 'arc',
  arcHeight: 0.4,
  endArrow: true,
  attr: { stroke: '#0077b6', 'stroke-width': 1.5, fill: 'none', opacity: 0.6 }
});
map.addLayer('routes', arcs);
```

---

### LineTaperedLayer

始点と終点をテーパー（太さが変化する）アーク型ポリゴンで接続する。LineStringの中間頂点は無視し、最初と最後の座標のみを使用する。fillベースの閉じたポリゴンで描画されるため、ストロークではなく塗りつぶしで色を指定する。

```typescript
new LineTaperedLayer(options: LineTaperedLayerOptions)
```

```typescript
interface LineTaperedLayerOptions {
  data: GeoJSON.Feature | GeoJSON.Feature[] | GeoJSON.FeatureCollection;
  attr?: LayerAttr<GeoJSON.Feature>;
  style?: LayerStyle<GeoJSON.Feature>;
  startSize?: number | ((d: GeoJSON.Feature, i: number) => number);  // デフォルト: 10
  endSize?: number | ((d: GeoJSON.Feature, i: number) => number);    // デフォルト: 2
  arcHeight?: number;                                                 // デフォルト: 0.3
  flipArc?: boolean | ((d: GeoJSON.Feature, i: number) => boolean);  // デフォルト: false
  startArrow?: boolean;                                               // デフォルト: false
  endArrow?: boolean;                                                 // デフォルト: false
  arrowSize?: number;                                                 // デフォルト: 10
  arrowWidth?: number;                                                // デフォルト: 端点サイズと同じ
}
```

**使用例:**

```javascript
// 基本的なテーパーライン（細→太）
const tapered = new Thematika.LineTaperedLayer({
  data: flightRoutes,
  startSize: 1,
  endSize: 8,
  arcHeight: 0.3,
  attr: { fill: '#ff6b6b', opacity: 0.6 }
});
map.addLayer('tapered', tapered);
```

```javascript
// 矢印付き＋フィーチャーごとにアーク方向を切り替え
const arrows = new Thematika.LineTaperedLayer({
  data: tradeRoutes,
  startSize: 2,
  endSize: 10,
  endArrow: true,
  arrowSize: 20,
  arrowWidth: 25,
  flipArc: (d, i) => d.properties.direction === 'south',
  attr: {
    fill: (d, i) => colorScale(d.properties.volume),
    opacity: 0.7
  }
});
```

```javascript
// コールバックでフィーチャーごとにサイズを変える
const dynamic = new Thematika.LineTaperedLayer({
  data: migrationData,
  startSize: (d, i) => d.properties.startPop / 1000,
  endSize: (d, i) => d.properties.endPop / 1000,
  attr: { fill: '#0077b6' }
});
```

---

### LineEdgeBundlingLayer

Force-directed simulationによるエッジバンドリング。多数のラインを視覚的に整理して表示する。

```typescript
new LineEdgeBundlingLayer(options: LineEdgeBundlingLayerOptions)
```

```typescript
interface LineEdgeBundlingLayerOptions {
  data: GeoJSON.Feature | GeoJSON.Feature[] | GeoJSON.FeatureCollection;
  attr?: LayerAttr<GeoJSON.Feature>;
  style?: LayerStyle<GeoJSON.Feature>;
  bundlingStrength?: number;      // 0-1（デフォルト: 0.85）
  forceStrength?: number;         // デフォルト: 20
  segmentSteps?: number | 'auto'; // 制御点の数（デフォルト: 'auto'）
  showControlPoints?: boolean;    // デフォルト: false
  showOriginalLines?: boolean;    // デフォルト: false
  animateForce?: boolean;         // デフォルト: true
  controlPointSize?: number;      // デフォルト: 3
  endpointSize?: number;          // デフォルト: 6
}
```

**使用例:**
```javascript
const bundling = new Thematika.LineEdgeBundlingLayer({
  data: connections,
  bundlingStrength: 0.85,
  attr: { stroke: '#0077b6', 'stroke-width': 0.8, fill: 'none', opacity: 0.4 }
});
map.addLayer('bundling', bundling);
```

---

### TextLayer

GeoJSONフィーチャーにテキストラベルを描画する。Pointはその座標に、ポリゴン/ラインは重心（面積/長さ加重）に配置される。投影範囲外のフィーチャーは描画されない。

```typescript
new TextLayer(options: TextLayerOptions)
```

```typescript
interface TextLayerOptions {
  data: GeoJSON.FeatureCollection | GeoJSON.Feature[];
  attr?: LayerAttr;
  style?: LayerStyle;
  // テキスト内容のプロパティ名または関数（デフォルト: 'name'）
  textProperty?: string | ((feature: GeoJSON.Feature, index: number) => string);
}
```

`paint-order: stroke` がデフォルト設定されているため、`attr` で `stroke` / `stroke-width` を指定するだけで文字の背面に縁取り（ハロー）が描画される。

**使用例:**
```javascript
const labels = new Thematika.TextLayer({
  data: geojson,
  textProperty: 'name',
  attr: {
    'font-size': 12,
    'text-anchor': 'middle',
    fill: '#333',
    stroke: '#fff',        // ハロー（縁取り）
    'stroke-width': 3
  }
});
map.addLayer('labels', labels);
```

---

### ScaleBarLayer

縮尺（スケールバー）をピクセル座標で配置する。配置位置での球面距離から実距離を計算し、1/2/5×10^n のキリの良い値に丸める。invert をサポートしない投影法では描画されない（警告）。

```typescript
new ScaleBarLayer(options?: ScaleBarLayerOptions)
```

```typescript
interface ScaleBarLayerOptions {
  position?: { top?: number; bottom?: number; left?: number; right?: number };
                          // デフォルト: { left: 20, bottom: 20 }
  maxWidth?: number;      // バーの最大幅px（デフォルト: 150）
  units?: 'km' | 'mi';    // デフォルト: 'km'
  segments?: number;      // バーの分割数（デフォルト: 4）
  barHeight?: number;     // バーの高さpx（デフォルト: 6）
  fontSize?: number;      // ラベルのフォントサイズ（デフォルト: 10）
  attr?: LayerAttr;
  style?: LayerStyle;
}
```

**使用例:**
```javascript
const scaleBar = new Thematika.ScaleBarLayer({
  position: { left: 20, bottom: 20 },
  maxWidth: 200,
  units: 'km'
});
map.addLayer('scalebar', scaleBar);
```

---

### TitleLayer

地図のタイトル・サブタイトル・出典表記をピクセル座標で配置する。TextLayerがGeoJSON座標を必要とするのに対し、画面座標で「左上にタイトル」「右下に出典」のような周辺要素を配置できる。

```typescript
new TitleLayer(options: TitleLayerOptions)
```

```typescript
interface TitleLayerOptions {
  title: string;                     // タイトル本文
  subtitle?: string;                 // サブタイトル
  position?: TitlePosition           // 'top-left' | 'top-center' | 'top-right' |
    | { top?: number; bottom?: number; left?: number; right?: number };
                                     // 'bottom-left' | 'bottom-center' | 'bottom-right'
                                     // またはピクセル座標（デフォルト: 'top-left'）
  margin?: number;                   // 地図端からの余白px（デフォルト: 16）
  fontSize?: number;                 // デフォルト: 20
  subtitleFontSize?: number;         // デフォルト: 12
  color?: string;                    // デフォルト: '#333333'
  haloColor?: string | null;         // ハロー色。nullでハローなし（デフォルト: '#ffffff'）
  attr?: LayerAttr;
  style?: LayerStyle;
}
```

**使用例:**
```javascript
// タイトル
map.addLayer('title', new Thematika.TitleLayer({
  title: '世界の人口分布',
  subtitle: '出典: Natural Earth (2023)',
  position: 'top-left'
}));

// 出典表記（右下に小さく）
map.addLayer('credit', new Thematika.TitleLayer({
  title: '© Natural Earth',
  position: 'bottom-right',
  fontSize: 10,
  color: '#666666'
}));
```

---

### NorthArrowLayer

方位記号（ノースアロー）を描画する。デフォルトでは配置位置における真北の方向を投影法から計算して回転する（正角図法では上向き、円錐図法などでは傾く）。

```typescript
new NorthArrowLayer(options?: NorthArrowLayerOptions)
```

```typescript
interface NorthArrowLayerOptions {
  position?: { top?: number; bottom?: number; left?: number; right?: number };
                            // デフォルト: { top: 20, right: 20 }
  size?: number;            // 記号のサイズpx（デフォルト: 40）
  color?: string;           // デフォルト: '#333333'
  showLabel?: boolean;      // 「N」ラベル表示（デフォルト: true）
  rotateToNorth?: boolean;  // 真北方向へ回転（デフォルト: true）
  attr?: LayerAttr;
  style?: LayerStyle;
}
```

**注意:** 真北が画面上で一定でない投影法（正距方位図法の全球表示など）では、記号の意味が場所によって変わる。全球図では非表示を推奨。

**使用例:**
```javascript
map.addLayer('north', new Thematika.NorthArrowLayer({
  position: { top: 20, right: 20 },
  size: 44
}));
```

---

## エフェクトユーティリティ

SVGフィルターを生成するファクトリ関数群。`Map`コンストラクタの `defs` オプションに渡すか、個別にSVG defsに追加する。

### 基本ユーティリティ

```typescript
// フィルターURL取得
getFilterUrl(filterId: string): string  // → "url(#filterId)"

// 複数フィルターの連鎖
chainFilters(filterIds: string[]): string  // → "url(#id1) url(#id2)"

// カスタムフィルターXML
createCustomFilter(id: string, filterContent: string)
```

### フィルターファクトリ一覧

全ファクトリはコールバック関数を返す。返り値には `.url()` メソッドが付与され、CSS filterプロパティに使用可能。

| ファクトリ | 説明 | 主要オプション |
|-----------|------|--------------|
| `createGaussianBlur(options)` | ガウシアンブラー | `id`, `stdDeviation` |
| `createDropShadow(options)` | ドロップシャドウ | `id`, `dx`, `dy`, `stdDeviation`, `floodColor`, `floodOpacity` |
| `createBloom(options)` | ブルームエフェクト | `id`, `intensity`, `threshold`, `color` |
| `createColorMatrix(options)` | 色行列変換 | `id`, `type`('saturate'\|'hueRotate'\|'luminanceToAlpha'\|'matrix'), `values` |
| `createGlow(options)` | 外側発光 | `id`, `stdDeviation`, `color`, `opacity` |
| `createEdgeDetect(options)` | 輪郭抽出 | `id` |
| `createInnerShadow(options)` | 内側シャドウ | `id`, `dx`, `dy`, `stdDeviation`, `color`, `opacity` |
| `createOutline(options)` | アウトライン | `id`, `radius`, `color`, `opacity` |
| `createNoise(options)` | フィルムグレイン/ノイズ | `id`, `baseFrequency`, `numOctaves`, `opacity` |
| `createClipPolygon(options)` | GeoJSONクリップパス | `id`, `polygon`, `projection` |

### FilterPresets（プリセット）

```typescript
Thematika.FilterPresets.lightBlur()         // stdDeviation: 2
Thematika.FilterPresets.strongBlur()        // stdDeviation: 8
Thematika.FilterPresets.standardDropShadow() // dx:2, dy:2, std:2, opacity:0.8
Thematika.FilterPresets.softDropShadow()    // dx:2, dy:2, std:4, opacity:0.2
Thematika.FilterPresets.standardBloom()     // intensity:4, threshold:0.8
Thematika.FilterPresets.strongBloom()       // intensity:8, threshold:0.6, color:#fff
Thematika.FilterPresets.grayscale()         // saturate: 0
Thematika.FilterPresets.hueRotate60()       // hueRotate: 60
Thematika.FilterPresets.sepia()             // セピア色行列
```

### 使用パターン

```javascript
// 方法1: Mapのdefsオプションに渡す
const shadowFilter = Thematika.createDropShadow({
  id: 'shadow', dx: 2, dy: 2, stdDeviation: 3
});

const map = new Thematika.Map({
  container: '#map',
  width: 800,
  height: 600,
  projection: d3.geoNaturalEarth1(),
  defs: [shadowFilter]  // コールバック配列
});

// レイヤーでフィルターを参照
const layer = new Thematika.GeojsonLayer({
  data: geojson,
  attr: { filter: shadowFilter.url() }  // "url(#shadow)"
});

// 方法2: プリセット使用
const bloom = Thematika.FilterPresets.standardBloom();
const map = new Thematika.Map({ ..., defs: [bloom] });
```

---

## テクスチャユーティリティ

textures.jsをラップしたテクスチャパターン生成。

### ファクトリ一覧

| ファクトリ | 説明 | 主要オプション |
|-----------|------|--------------|
| `createDotsTexture(options)` | ドットパターン | `id`, `size`, `background`, `fill`, `radius` |
| `createLinesTexture(options)` | 線パターン | `id`, `size`, `background`, `stroke`, `strokeWidth`, `orientation` |
| `createPathsTexture(options)` | カスタムパスパターン | `id`, `d`, `size`, `background`, `fill`, `stroke`, `strokeWidth` |
| `createOceanTexture(options)` | 海洋テクスチャ | `id`, `size`, `background`, `stroke`, `strokeWidth` |
| `createForestTexture(options)` | 森林テクスチャ | `id`, `size`, `background`, `fill`, `radius` |
| `createDesertTexture(options)` | 砂漠テクスチャ | `id`, `size`, `background`, `fill` |
| `createMountainTexture(options)` | 山岳テクスチャ | `id`, `size`, `background`, `fill` |

### TexturePresets

```typescript
Thematika.TexturePresets  // プリセットテクスチャ群（上記と同様の構造）
```

### 使用パターン

```javascript
const oceanTex = Thematika.createOceanTexture({
  id: 'ocean', size: 10, background: '#e8f4ff', stroke: '#b0d4f1'
});

const map = new Thematika.Map({
  ...,
  defs: [oceanTex]
});

const layer = new Thematika.GeojsonLayer({
  data: oceanData,
  attr: { fill: 'url(#ocean)' }  // テクスチャを塗りつぶしに使用
});
```

---

## カラーパレット

科学的に検証されたカラーパレットと色覚アクセシビリティ機能。

### パレットコレクション

```typescript
Thematika.ColorBrewerPalettes  // ColorBrewer: Set1, Set2, Set3, Blues, Greens, Oranges, YlOrRd, YlGnBu等
Thematika.ViridisPalettes      // viridis系: Viridis, Magma, Inferno, Plasma
Thematika.CARTOPalettes        // CARTO: Bold, Pastel等
Thematika.TailwindPalettes     // Tailwind CSS系
Thematika.AllPalettes          // 全パレットの統合
```

各パレットは `ColorPalette` 型：
```typescript
interface ColorPalette {
  name: string;
  type: 'categorical' | 'sequential' | 'diverging';
  colors: string[];
  colorBlindSafe: boolean;
  description?: string;
  maxClasses?: number;
}
```

### 関数

```typescript
// パレット推奨
recommendPalette(
  type: PaletteType,
  numClasses: number,
  requireColorBlindSafe?: boolean
): PaletteRecommendation[]

// 指定クラス数に最適化した色配列を生成
generateOptimizedPalette(
  palette: ColorPalette,
  numClasses: number
): string[]

// 色覚障害シミュレーション
simulateColorBlindness(
  color: string,
  type: 'protanopia' | 'deuteranopia' | 'tritanopia'
): string

// 色覚障害安全性チェック
checkColorBlindnessSafety(palette: string[]): boolean
```

### 使用パターン

```javascript
// カテゴリカルパレットの推奨を取得
const recs = Thematika.recommendPalette('categorical', 5, true);
const colors = Thematika.generateOptimizedPalette(recs[0].palette, 5);

// コロプレスマップ
const colorScale = d3.scaleThreshold()
  .domain([100, 500, 1000, 5000])
  .range(colors);

const layer = new Thematika.GeojsonLayer({
  data: geojson,
  attr: { fill: (d) => colorScale(d.properties.population) }
});
```

---

## 分級ユーティリティ

コロプレス図の階級区分に使用する境界値を計算する。結果は `d3.scaleThreshold` にそのまま渡せる。

```typescript
classify(
  values: number[],              // 分級対象の数値配列（NaN/Infinityは無視）
  classes: number,               // 階級数（2以上）
  method?: ClassificationMethod  // デフォルト: 'jenks'
): ClassifyResult

type ClassificationMethod = 'jenks' | 'equalInterval' | 'quantile' | 'stdDev';

interface ClassifyResult {
  breaks: number[];      // 最小値・最大値を含む全境界値（classes+1個）
  thresholds: number[];  // scaleThresholdのdomain用（classes-1個）
  classes: number;       // 実際の階級数（同値が多いと要求より減ることがある）
  method: ClassificationMethod;
}
```

**手法の使い分け:**
- `jenks`: 自然分類。データの自然なまとまりで区切る。コロプレスの定番（デフォルト）
- `equalInterval`: 等間隔分類。値域を等分。分布が一様なデータ向け
- `quantile`: 等量分類。各階級のデータ数が等しい。順位を強調したい場合
- `stdDev`: 標準偏差分類。平均からの偏差。正規分布に近いデータ向け

**使用パターン:**
```javascript
const values = geojson.features.map(f => f.properties.POP_EST);
const { thresholds } = Thematika.classify(values, 5, 'jenks');

const colorScale = d3.scaleThreshold()
  .domain(thresholds)
  .range(d3.schemeYlOrRd[5]);

const layer = new Thematika.GeojsonLayer({
  data: geojson,
  attr: { fill: d => colorScale(d.properties.POP_EST) }
});
```

### コロプレス統合ヘルパー（choropleth）

分級 → 配色 → GeojsonLayer → LegendLayer の組み立てを1回の呼び出しにまとめる。

```typescript
choropleth(options: ChoroplethOptions): ChoroplethResult

interface ChoroplethOptions {
  data: GeoJSON.FeatureCollection | GeoJSON.Feature[];
  value: string | ((feature: GeoJSON.Feature) => number);  // プロパティ名または関数
  palette?: string;              // AllPalettesのパレット名（デフォルト: 'YlOrRd'）
  colors?: string[];             // 色配列の直接指定（paletteより優先）
  classes?: number;              // 階級数（デフォルト: 5）
  method?: ClassificationMethod; // 分級手法（デフォルト: 'jenks'）
  noDataColor?: string;          // 値がないフィーチャーの色（デフォルト: '#cccccc'）
  attr?: LayerAttr;              // 追加attr（fillは分級結果で上書き）
  style?: LayerStyle;
  legend?: false | Partial<LegendLayerOptions>;  // falseで凡例なし
}

interface ChoroplethResult {
  layer: GeojsonLayer;              // 塗り分け済みレイヤー
  legend: LegendLayer | null;       // 凡例（legend: false でnull）
  scale: (value: number) => string; // 値→色のスケール
  classification: ClassifyResult;   // 分級結果
  colors: string[];                 // 使用した色配列
}
```

**使用パターン:**
```javascript
const { layer, legend } = Thematika.choropleth({
  data: geojson,
  value: 'POP_EST',
  palette: 'Blues',
  classes: 5,
  method: 'jenks',
  legend: { title: '人口', position: { top: 20, left: 20 }, labelFormat: d3.format('.2s') }
});
map.addLayer('choropleth', layer);
map.addLayer('legend', legend);
```

### 比例記号スケール（createProportionalScale）

比例記号（proportional symbol）用の半径スケールを生成する。円の**面積**が値に比例するよう半径を平方根でスケーリングする。半径を線形スケールにすると面積が値の2乗に比例し大きい値が視覚的に誇張されるため、量データをPointCircleLayerで表す場合は必ずこれを使う。

```typescript
createProportionalScale(
  values: number[],
  options?: {
    maxRadius?: number;  // 最大半径px（デフォルト: 30）
    minRadius?: number;  // 最小半径px（デフォルト: 1）
    minValue?: number;   // 下限値（デフォルト: 0）
    maxValue?: number;   // 上限値（デフォルト: valuesの最大値）
  }
): (value: number) => number
```

**使用パターン:**
```javascript
const values = geojson.features.map(f => f.properties.POP_EST);
const radius = Thematika.createProportionalScale(values, { maxRadius: 25 });

const layer = new Thematika.PointCircleLayer({
  data: geojson,
  r: (feature) => radius(feature.properties.POP_EST)
});
```

---

## GISユーティリティ

GeoJSONデータの解析・計算ユーティリティ。

```typescript
// Bounding Box取得
getBbox(geojson: GeoJSON): BBox  // { minX, minY, maxX, maxY }

// 中心点取得（座標の単純平均）
getCentroid(geojson: GeoJSON): Centroid  // { x, y }

// 複数GeoJSONをマージ
merge(geojsons: GeoJSON[]): FeatureCollection

// GeoJSON妥当性検証
isValidGeoJSON(geojson: any): boolean

// BBox操作
getBboxCenter(bbox: BBox): Centroid
getBboxDimensions(bbox: BBox): { width: number; height: number }
mergeBbox(bbox1: BBox, bbox2: BBox): BBox
expandBbox(bbox: BBox, padding?: number): BBox
```

---

## タイルユーティリティ

Web地図タイル（ラスタタイル）の座標計算とURL生成。

```typescript
// 地理座標 → タイル座標
getTileXYZ(longitude: number, latitude: number, zoom: number): TileCoordinate

// タイル座標 → 地理的境界
getTileBounds(x: number, y: number, z: number): TileBounds

// 指定範囲のタイルURL一括生成
generateTileUrls(
  bounds: [west, south, east, north],
  zoom: number,
  options: TileGenerationOptions
): TileUrlInfo[]

// 最適ズームレベル計算
calculateOptimalZoom(
  bounds: [west, south, east, north],
  width: number,
  height: number,
  options?: TileGenerationOptions
): number

// 解像度取得（メートル/ピクセル）
getResolution(zoom: number, latitude?: number, tileSize?: number): number

// タイル座標妥当性検証
isValidTileCoordinate(x: number, y: number, z: number): boolean
```

### TileGenerationOptions

```typescript
interface TileGenerationOptions {
  urlTemplate: string;    // 例: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
  minZoom?: number;       // デフォルト: 0
  maxZoom?: number;       // デフォルト: 18
  tileSize?: number;      // デフォルト: 256
  clampToBounds?: boolean; // デフォルト: true
}
```

---

## 実用パターン集

### 基本的な世界地図

```javascript
async function draw() {
  const container = document.querySelector('#map');
  const width = container.clientWidth;
  const height = container.clientHeight;
  d3.select('#map').selectAll('*').remove();

  const geojson = await d3.json('./geojson/world.geojson');
  const projection = d3.geoNaturalEarth1()
    .fitExtent([[20, 20], [width - 20, height - 20]], geojson);

  const map = new Thematika.Map({
    container: '#map',
    width: width,
    height: height,
    projection: projection,
    backgroundColor: '#f0f4f8'
  });

  const outline = new Thematika.OutlineLayer({
    createClipPath: true,
    attr: { fill: '#e8f4ff', stroke: '#333', 'stroke-width': 1 }
  });
  map.addLayer('outline', outline);

  const graticule = new Thematika.GraticuleLayer({
    step: [15, 15],
    attr: { stroke: '#ccc', 'stroke-width': 0.3 }
  });
  map.addLayer('graticule', graticule);

  const countries = new Thematika.GeojsonLayer({
    data: geojson,
    attr: { fill: '#a8d5ba', stroke: '#555', 'stroke-width': 0.5 }
  });
  map.addLayer('countries', countries);
}

draw();
```

### コロプレスマップ（階級区分図）

**推奨:** 分級・配色・凡例をまとめて生成する [`choropleth()` ヘルパー](#コロプレス統合ヘルパーchoropleth) を使うと以下の手作業を1回の呼び出しに置き換えられる。手動で組む場合:

```javascript
async function draw() {
  const geojson = await d3.json('./geojson/japan.geojson');
  const projection = d3.geoMercator()
    .fitExtent([[20, 20], [780, 580]], geojson);

  const colorScale = d3.scaleThreshold()
    .domain([100000, 500000, 1000000, 5000000])
    .range(['#eff3ff', '#bdd7e7', '#6baed6', '#3182bd', '#08519c']);

  const map = new Thematika.Map({
    container: '#map', width: 800, height: 600,
    projection: projection
  });

  const layer = new Thematika.GeojsonLayer({
    data: geojson,
    attr: {
      fill: (d) => colorScale(d.properties.population),
      stroke: '#fff',
      'stroke-width': 0.5
    }
  });
  map.addLayer('prefectures', layer);

  const legend = new Thematika.LegendLayer({
    scale: colorScale,
    position: { top: 20, left: 20 },
    title: '人口',
    symbolType: 'cell',
    showBackground: true
  });
  map.addLayer('legend', legend);
}
```

### エフェクト付き地図

```javascript
const shadow = Thematika.createDropShadow({
  id: 'shadow', dx: 2, dy: 2, stdDeviation: 3, floodOpacity: 0.3
});
const bloom = Thematika.createBloom({
  id: 'bloom', intensity: 4, threshold: 0.7
});

const map = new Thematika.Map({
  container: '#map', width: 800, height: 600,
  projection: d3.geoOrthographic(),
  defs: [shadow, bloom]
});

const layer = new Thematika.GeojsonLayer({
  data: geojson,
  attr: { fill: '#2d6a4f', stroke: '#fff', filter: shadow.url() }
});
map.addLayer('world', layer);
```

### UI変更時の再描画パターン

Immutableパターンに従い、設定変更時は地図全体を再作成する。

```javascript
function draw() {
  d3.select('#map').selectAll('*').remove();

  const projType = document.getElementById('projection-select').value;
  const showGraticule = document.getElementById('graticule-check').checked;

  const projections = {
    'mercator': d3.geoMercator(),
    'naturalEarth': d3.geoNaturalEarth1(),
    'orthographic': d3.geoOrthographic()
  };

  const projection = projections[projType]
    .fitExtent([[20, 20], [780, 580]], geojson);

  const map = new Thematika.Map({
    container: '#map', width: 800, height: 600,
    projection: projection
  });

  if (showGraticule) {
    map.addLayer('graticule', new Thematika.GraticuleLayer());
  }

  map.addLayer('world', new Thematika.GeojsonLayer({
    data: geojson,
    attr: { fill: '#ccc', stroke: '#333' }
  }));
}

// UIイベントで再描画
document.getElementById('projection-select').addEventListener('change', draw);
document.getElementById('graticule-check').addEventListener('change', draw);
draw();
```

### SVG/PNGエクスポート

```javascript
document.getElementById('save-svg').addEventListener('click', () => {
  map.saveSVG('my-map');
});

document.getElementById('save-png').addEventListener('click', () => {
  map.savePNG('my-map');
});
```
