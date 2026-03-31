# d3-thematika APIリファレンス

## Mapクラス

主題図描画を行うメインクラス。

### コンストラクタ

```typescript
new Thematika.Map(options: ThematikaOptions)
```

### ThematikaOptions

| プロパティ | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| container | string | ✓ | 描画先のCSSセレクタ |
| width | number | ✓ | 幅（ピクセル） |
| height | number | ✓ | 高さ（ピクセル） |
| projection | GeoProjection | ✓ | D3投影法オブジェクト |
| defs | any[] | | SVG定義（フィルター、テクスチャなど） |
| backgroundColor | string | | 背景色（デフォルト: '#ffffff'） |

### メソッド

| メソッド | 説明 |
|---------|------|
| `addLayer(id, layer)` | レイヤーを追加 |
| `removeLayer(id)` | レイヤーを削除 |
| `setLayerVisibility(id, visible)` | 表示/非表示切り替え |
| `setLayerZIndex(id, zIndex)` | 描画順序を変更 |
| `setProjection(projection)` | 投影法を変更（全レイヤー再描画） |
| `resize(width, height)` | サイズを変更 |
| `fitBounds(bounds, padding)` | 境界にフィット |
| `clearAllLayers()` | 全レイヤー削除 |
| `getSVG()` | SVG要素を取得 |
| `getProjection()` | 投影法を取得 |
| `getLayerIds()` | レイヤーID一覧取得 |
| `saveSVG(filename)` | SVGファイルとしてダウンロード |
| `savePNG(filename)` | PNGファイルとしてダウンロード |

---

## 基本レイヤー

### GeojsonLayer

GeoJSONデータを描画するレイヤー。

```typescript
new Thematika.GeojsonLayer(options: GeojsonLayerOptions)
```

| オプション | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| data | FeatureCollection \| Feature[] | ✓ | GeoJSONデータ |
| attr | LayerAttr | | SVG属性設定 |
| style | LayerStyle | | CSSスタイル設定 |

### GraticuleLayer

経緯線グリッドを描画。

```typescript
new Thematika.GraticuleLayer(options?: GraticuleLayerOptions)
```

| オプション | 型 | デフォルト | 説明 |
|-----------|-----|-----------|------|
| step | [number, number] | [10, 10] | 経度/緯度の間隔（度） |
| extent | [[west, south], [east, north]] | | 描画範囲 |
| attr | LayerAttr | | SVG属性設定 |
| style | LayerStyle | | CSSスタイル設定 |

### OutlineLayer

地球のアウトライン（球体境界）を描画。

```typescript
new Thematika.OutlineLayer(options?: OutlineLayerOptions)
```

| オプション | 型 | 説明 |
|-----------|-----|------|
| attr | LayerAttr | SVG属性設定 |
| style | LayerStyle | CSSスタイル設定 |

### ImageLayer

画像を地理座標に配置。

```typescript
new Thematika.ImageLayer(id: string, options: ImageLayerOptions)
```

| オプション | 型 | 必須 | 説明 |
|-----------|-----|------|------|
| src | string | ✓ | 画像URL |
| bounds | [west, south, east, north] | ✓ | 地理的境界 |
| showBboxMarkers | boolean | | 境界マーカー表示 |
| attr | LayerAttr | | SVG属性設定 |
| style | LayerStyle | | CSSスタイル設定 |

---

## ポイントレイヤー

### PointCircleLayer

円形ポイントを描画。

```typescript
new Thematika.PointCircleLayer(options: PointCircleLayerOptions)
```

| オプション | 型 | デフォルト | 説明 |
|-----------|-----|-----------|------|
| data | FeatureCollection \| Feature[] | 必須 | GeoJSONデータ |
| r | number \| ((feature, index) => number) | 5 | 半径 |
| attr | LayerAttr | | SVG属性設定 |
| style | LayerStyle | | CSSスタイル設定 |

### PointSymbolLayer

D3シンボル形状でポイント描画。

```typescript
new Thematika.PointSymbolLayer(options: PointSymbolLayerOptions)
```

| オプション | 型 | デフォルト | 説明 |
|-----------|-----|-----------|------|
| data | FeatureCollection \| Feature[] | 必須 | GeoJSONデータ |
| symbolType | SymbolType \| ((feature, index) => SymbolType) | symbolCircle | シンボル形状 |
| size | number \| ((feature, index) => number) | 64 | シンボルサイズ |
| attr | LayerAttr | | SVG属性設定 |
| style | LayerStyle | | CSSスタイル設定 |

SymbolType: `symbolCircle`, `symbolCross`, `symbolDiamond`, `symbolSquare`, `symbolStar`, `symbolTriangle`, `symbolWye`

### PointAnnotationLayer

アノテーション（注釈）を描画。

```typescript
new Thematika.PointAnnotationLayer(options: PointAnnotationLayerOptions)
```

| オプション | 型 | デフォルト | 説明 |
|-----------|-----|-----------|------|
| data | FeatureCollection \| Feature[] | 必須 | GeoJSONデータ |
| annotationType | AnnotationType | 'callout' | アノテーション形式 |
| textAccessor | string \| ((feature, index) => string) | | テキスト取得関数 |
| titleAccessor | string \| ((feature, index) => string) | | タイトル取得関数 |
| offsetAccessor | ((feature, index) => [dx, dy]) | | オフセット位置 |
| subjectOptions | SubjectOptions | | サブジェクト設定 |
| connectorOptions | ConnectorOptions | | コネクター設定 |
| noteOptions | NoteOptions | | ノート設定 |

AnnotationType: `'callout'`, `'label'`, `'badge'`, `'calloutElbow'`, `'calloutCurve'`, `'calloutCircle'`, `'calloutRect'`

### PointTextLayer

テキストラベルを描画。

```typescript
new Thematika.PointTextLayer(options: PointTextLayerOptions)
```

| オプション | 型 | 説明 |
|-----------|-----|------|
| data | FeatureCollection \| Feature[] | GeoJSONデータ |
| textAccessor | string \| ((feature, index) => string) | テキスト取得関数 |
| attr | LayerAttr | SVG属性設定 |
| style | LayerStyle | CSSスタイル設定 |

### PointSpikeLayer

3Dスパイク（棒グラフ風）を描画。

```typescript
new Thematika.PointSpikeLayer(options: PointSpikeLayerOptions)
```

| オプション | 型 | デフォルト | 説明 |
|-----------|-----|-----------|------|
| data | FeatureCollection \| Feature[] | 必須 | GeoJSONデータ |
| length | number \| ((feature, index) => number) | | スパイクの長さ |
| direction | 'up' \| 'down' \| 'left' \| 'right' | 'up' | スパイクの方向 |
| attr | LayerAttr | | SVG属性設定 |
| style | LayerStyle | | CSSスタイル設定 |

---

## ラインレイヤー

### LineConnectionLayer

複数点間を接続するライン。

```typescript
new Thematika.LineConnectionLayer(options: LineConnectionLayerOptions)
```

| オプション | 型 | デフォルト | 説明 |
|-----------|-----|-----------|------|
| data | Feature \| Feature[] \| FeatureCollection | 必須 | LineString/MultiLineString |
| lineType | 'straight' \| 'arc' \| 'smooth' | 'straight' | ライン形式 |
| arcHeight | number | 0.3 | アーク高さ |
| arcControlPoint | 'center' \| 'weighted' \| [x, y] | 'center' | 制御点位置 |
| arcOffset | 'perpendicular' \| 'north' \| 'south' \| 'east' \| 'west' \| [x, y] | 'perpendicular' | オフセット方向 |
| startArrow | boolean | false | 開始矢印 |
| endArrow | boolean | false | 終了矢印 |
| arrowSize | number | 10 | 矢印サイズ |
| smoothType | string | 'curveBasis' | カーブタイプ |
| attr | LayerAttr | | SVG属性設定 |
| style | LayerStyle | | CSSスタイル設定 |

smoothType: `'curveBasis'`, `'curveCardinal'`, `'curveCatmullRom'`, `'curveLinear'`, `'curveMonotoneX'`, `'curveMonotoneY'`, `'curveNatural'`, `'curveStep'`, `'curveStepAfter'`, `'curveStepBefore'`

### LineEdgeBundlingLayer

フォースシミュレーションによるエッジバンドリング。

```typescript
new Thematika.LineEdgeBundlingLayer(options: LineEdgeBundlingLayerOptions)
```

| オプション | 型 | 説明 |
|-----------|-----|------|
| data | FeatureCollection \| Feature[] | LineString/MultiLineStringデータ |
| strength | number | バンドリング強度 |
| attr | LayerAttr | SVG属性設定 |
| style | LayerStyle | CSSスタイル設定 |

### LineTextLayer

ライン上にテキストを配置。

```typescript
new Thematika.LineTextLayer(options: LineTextLayerOptions)
```

| オプション | 型 | 説明 |
|-----------|-----|------|
| data | FeatureCollection \| Feature[] | LineStringデータ |
| textAccessor | string \| ((feature, index) => string) | テキスト取得関数 |
| attr | LayerAttr | SVG属性設定 |
| style | LayerStyle | CSSスタイル設定 |

---

## 凡例レイヤー

### LegendLayer

D3スケールと連携した凡例を自動生成。

```typescript
new Thematika.LegendLayer(options: LegendLayerOptions)
```

| オプション | 型 | デフォルト | 説明 |
|-----------|-----|-----------|------|
| scale | SupportedScale | 必須 | D3スケール関数 |
| position | { top, left } | 必須 | 凡例の位置 |
| title | string | | タイトル |
| orientation | 'vertical' \| 'horizontal' | 'vertical' | 配置方向 |
| itemSpacing | number | 20 | アイテム間隔 |
| fontSize | number | 12 | フォントサイズ |
| symbolType | 'cell' \| 'circle' \| 'line' \| 'gradient' | 自動推論 | シンボル形式 |
| symbolSize | { min, max, fixed } | { fixed: 16 } | シンボルサイズ |
| sizeScale | ScaleLinear | | サイズスケール |
| overlapping | boolean | false | 重ね表示モード |
| enableDrag | boolean | true | ドラッグ移動 |
| showBackground | boolean | true | 背景表示 |
| backgroundStyle | LegendBackgroundStyle | | 背景スタイル |

---

## 共通型定義

### LayerAttr<T>

SVG属性設定。固定値または`(d, index) => value`関数を指定可能。

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

### LayerStyle<T>

CSSスタイル設定。

```typescript
interface LayerStyle<T = any> {
  [property: string]: string | number | ((d: T, index?: number) => string | number) | undefined;
}
```

---

## エフェクトユーティリティ

### createDropShadow

```typescript
Thematika.createDropShadow({
  id: string,
  dx: number,
  dy: number,
  stdDeviation: number,
  floodColor?: string,
  floodOpacity?: number
})
// 戻り値: (defs) => void 関数、.url() で "url(#id)" を取得
```

### createBloom

```typescript
Thematika.createBloom({
  id: string,
  intensity: number,
  threshold?: number,
  color?: string
})
```

### createGaussianBlur

```typescript
Thematika.createGaussianBlur({
  id: string,
  stdDeviation: number | string
})
```

### createGlow

```typescript
Thematika.createGlow({
  id: string,
  stdDeviation: number,
  color?: string,
  opacity?: number
})
```

### createColorMatrix

```typescript
Thematika.createColorMatrix({
  id: string,
  type: 'saturate' | 'hueRotate' | 'luminanceToAlpha' | 'matrix',
  values?: string
})
```

### createClipPolygon

```typescript
Thematika.createClipPolygon({
  id: string,
  polygon: Feature<Polygon | MultiPolygon> | FeatureCollection,
  projection: GeoProjection
})
```

### FilterPresets

```typescript
Thematika.FilterPresets.lightBlur()
Thematika.FilterPresets.strongBlur()
Thematika.FilterPresets.standardDropShadow()
Thematika.FilterPresets.softDropShadow()
Thematika.FilterPresets.standardBloom()
Thematika.FilterPresets.strongBloom()
Thematika.FilterPresets.grayscale()
Thematika.FilterPresets.sepia()
Thematika.FilterPresets.blueGlow()
Thematika.FilterPresets.filmGrain()
```

---

## カラーパレット

### getPalette

```typescript
Thematika.getPalette(name: string): ColorPalette | undefined
```

### recommendPalette

```typescript
Thematika.recommendPalette(
  type: 'categorical' | 'sequential' | 'diverging',
  numClasses: number,
  requireColorBlindSafe?: boolean
): PaletteRecommendation[]
```

### generateOptimizedPalette

```typescript
Thematika.generateOptimizedPalette(
  palette: ColorPalette,
  numClasses: number
): string[]
```

---

## GISユーティリティ

```typescript
// 中心点を取得
Thematika.getCentroid(feature: Feature): { x: number, y: number }
```

---

## タイルユーティリティ

```typescript
// タイル座標を生成
Thematika.generateTileUrls(
  bounds: [west, south, east, north],
  options: TileGenerationOptions
): TileUrlInfo[]
```

---

## テクスチャ

textures.jsラッパー。

```typescript
Thematika.createTexture(options: TextureOptions)
```
