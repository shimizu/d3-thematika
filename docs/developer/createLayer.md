# レイヤー開発ガイド

d3-thematikaで新しいレイヤーを開発するための開発者向けドキュメントです。

## 基本概念

d3-thematikaのレイヤーシステムは、`BaseLayer`抽象クラスを継承した階層構造になっています。新しいレイヤーを作成する際は、この基底クラスを継承して必要なメソッドを実装します。

## BaseLayerクラスの構造

### 主要プロパティ

- `id: string` - レイヤーの一意識別子
- `visible: boolean` - レイヤーの表示状態
- `zIndex: number` - レイヤーの描画順序
- `style: LayerStyle` - レイヤーのスタイル設定
- `element?: SVGGElement` - レイヤーのSVGグループ要素

### 必須実装メソッド

新しいレイヤーを作成する際は、以下の抽象メソッドを必ず実装する必要があります：

```typescript
abstract render(container: Selection<SVGGElement, unknown, HTMLElement, any>): void;
abstract update(): void;
```

## レイヤー開発の基本パターン

### 1. 基本的なレイヤークラスの構造

```typescript
import { Selection } from 'd3-selection';
import { GeoProjection } from 'd3-geo';
import { BaseLayer } from './base-layer';
import { LayerStyle } from '../types';

export interface YourLayerOptions {
  // レイヤー固有のオプションを定義
  data?: any;
  style?: LayerStyle;
}

export class YourLayer extends BaseLayer {
  // レイヤー固有のプロパティ
  private data?: any;
  private layerGroup?: Selection<SVGGElement, unknown, HTMLElement, any>;

  constructor(options: YourLayerOptions) {
    // 一意のIDを生成（推奨パターン）
    super(`your-layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, options.style);
    
    this.data = options.data;
  }

  render(container: Selection<SVGGElement, unknown, HTMLElement, any>): void {
    // レイヤーグループを作成
    this.layerGroup = this.createLayerGroup(container);
    
    // 実際の描画処理を実装
    this.renderContent();
  }

  update(): void {
    // レイヤーの更新処理を実装
    if (this.layerGroup) {
      this.renderContent();
    }
  }

  private renderContent(): void {
    // 実際の描画ロジックを実装
  }
}
```

### 2. スタイル適用パターン

BaseLayerは2つのスタイル適用メソッドを提供しています：

#### 単一要素へのスタイル適用
```typescript
// 単一の要素（円、矩形など）にスタイルを適用
this.applyStylesToElement(element, data, index);
```

#### 複数要素へのスタイル適用（推奨）
```typescript
// 複数の要素（GeoJSONのFeature群など）にスタイルを適用
this.applyStylesToElements(elements, this.layerGroup);
```

### 3. 投影法対応パターン（地理データ用）

地理データを扱うレイヤーの場合は、投影法の設定メソッドを実装します：

```typescript
import { geoPath, GeoPath } from 'd3-geo';

export class YourGeoLayer extends BaseLayer {
  private path?: GeoPath;

  setProjection(projection: GeoProjection): void {
    this.path = geoPath(projection);
    if (this.layerGroup) {
      this.update(); // 投影法変更時に再描画
    }
  }
}
```

## スタイルシステム

### サポートされるスタイル属性

BaseLayerは以下のスタイル属性をサポートしています：

```typescript
interface LayerStyle {
  fill?: string | ((feature: GeoJSON.Feature, index?: number) => string);
  stroke?: string | ((feature: GeoJSON.Feature, index?: number) => string);
  strokeWidth?: number | ((feature: GeoJSON.Feature, index?: number) => number);
  strokeDasharray?: string | ((feature: GeoJSON.Feature, index?: number) => string);
  opacity?: number | ((feature: GeoJSON.Feature, index?: number) => number);
  filter?: string | ((feature: GeoJSON.Feature, index?: number) => string);
  clipPath?: string | ((feature: GeoJSON.Feature, index?: number) => string);
  className?: string;
}
```

### 関数型スタイルの使用

スタイル属性は静的な値または関数を受け取ることができます：

```typescript
// 静的な値
style: { fill: '#ff0000' }

// 関数（データドリブンスタイリング）
style: { 
  fill: (feature, index) => feature.properties.color || '#cccccc',
  strokeWidth: (feature, index) => feature.properties.importance * 2
}
```

### clipPath属性の特別な扱い

`clipPath`属性は他の属性と異なり、常にレイヤーグループ全体に適用されます：

```typescript
// clipPathは個別要素ではなくレイヤーグループに適用される
if (key === 'clipPath') {
  if (value !== undefined) {
    const finalValue = typeof value === 'function' ? value({} as any, 0) : value;
    layerGroup[method](attrName, finalValue);
  }
}
```

## 実装例

### GeojsonLayerの実装パターン

```typescript
export class GeojsonLayer extends BaseLayer implements IGeojsonLayer {
  private data: GeoJSON.FeatureCollection;
  private path?: GeoPath;
  private layerGroup?: Selection<SVGGElement, unknown, HTMLElement, any>;

  constructor(options: GeojsonLayerOptions) {
    super(`geojson-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, options.attr || options.style);
    
    // データの正規化
    this.data = Array.isArray(options.data)
      ? { type: 'FeatureCollection', features: options.data }
      : options.data as GeoJSON.FeatureCollection;
  }

  setProjection(projection: GeoProjection): void {
    this.path = geoPath(projection);
    if (this.layerGroup) {
      this.update();
    }
  }

  render(container: Selection<SVGGElement, unknown, HTMLElement, any>): void {
    this.layerGroup = this.createLayerGroup(container);
    this.renderPaths();
  }

  update(): void {
    if (this.layerGroup) {
      this.layerGroup.selectAll('path').remove();
      this.renderPaths();
    }
  }

  private renderPaths(): void {
    if (!this.path || !this.layerGroup) return;

    const paths = this.layerGroup
      .selectAll('path')
      .data(this.data.features)
      .enter()
      .append('path')
      .attr('d', this.path);

    // 複数要素にスタイルを適用
    this.applyStylesToElements(paths, this.layerGroup);
  }
}
```

## 開発時の注意点

### 1. ID生成の統一

レイヤーIDは以下のパターンで生成することを推奨します：

```typescript
super(`layer-type-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, style);
```

### 2. データの正規化

入力データが複数の形式を取りうる場合は、コンストラクタで正規化しましょう：

```typescript
// 配列とFeatureCollectionの両方に対応
this.data = Array.isArray(options.data)
  ? { type: 'FeatureCollection', features: options.data }
  : options.data as GeoJSON.FeatureCollection;
```

### 3. エラーハンドリング

必要なデータや投影法が設定されていない場合の処理を含めましょう：

```typescript
private renderContent(): void {
  if (!this.path || !this.layerGroup) return;
  // 描画処理
}
```

### 4. メモリリークの防止

`destroy()`メソッドでリソースを適切に解放しましょう：

```typescript
destroy(): void {
  // カスタムリソースの解放
  this.customResource = null;
  
  // 基底クラスの解放処理を呼び出し
  super.destroy();
}
```

## テストの作成

新しいレイヤーには対応するテストを作成することを推奨します：

- 基本的な描画テスト
- スタイル適用テスト
- エラーケースのテスト
- 投影法変更のテスト（地理データ用）

## デバッグとトラブルシューティング

### よくある問題

1. **要素が描画されない**: `render()`メソッドが呼ばれているか、`path`や`layerGroup`が正しく設定されているかを確認
2. **スタイルが適用されない**: `applyStylesToElements()`が呼ばれているか、スタイル関数が正しい値を返しているかを確認
3. **投影法変更時に更新されない**: `setProjection()`で`update()`メソッドが呼ばれているかを確認

### デバッグ用のconsole.log

開発時は以下のような形でデバッグ用ログを追加できます：

```typescript
console.log("レイヤー描画開始:", this.id);
console.log("データ数:", this.data.features.length);
```

本番環境では削除することを忘れずに。