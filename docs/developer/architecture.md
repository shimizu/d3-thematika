# アーキテクチャ

d3-Cartgraphyライブラリの全体構造と設計思想について説明します。

## 全体構造

```
d3-Cartgraphy
├── Core Layer (コア機能)
│   ├── Cartography (メインクラス)
│   ├── LayerManager (レイヤー管理)
│   ├── Renderer (描画エンジン)
│   └── Projection (投影法)
├── Layer System (レイヤーシステム)
│   ├── BaseLayer (基底クラス)
│   ├── VectorLayer (ベクターレイヤー)
│   └── [Future: RasterLayer, etc.]
├── Utilities (ユーティリティ)
│   ├── GeoUtils (地理計算)
│   └── StyleUtils (スタイル処理)
└── Types (型定義)
```

## 主要コンポーネント

### 1. Cartography (メインクラス)

- ライブラリの中心となるクラス
- SVGコンテナの管理
- レイヤーマネージャーとレンダラーのコーディネート
- 公開APIの提供

**責任範囲:**
- 初期化とセットアップ
- レイヤー操作のプロキシ
- 投影法の管理
- リサイズ処理

### 2. LayerManager (レイヤー管理)

- 複数レイヤーの管理
- レイヤーの追加・削除・更新
- 描画順序の制御
- 表示/非表示の管理

**責任範囲:**
- レイヤーのライフサイクル管理
- zIndexによる描画順制御
- レイヤー間の相互作用

### 3. Renderer (描画エンジン)

- SVGへの実際の描画処理
- D3.jsのパス生成器の管理
- スタイルの適用
- パフォーマンス最適化

**責任範囲:**
- GeoJSONからSVGパスへの変換
- スタイルの適用
- 効率的な再描画

### 4. Layer System (レイヤーシステム)

#### BaseLayer (基底クラス)
- 全レイヤーの共通機能
- 抽象的なインターフェース定義
- 基本的なライフサイクル管理

#### VectorLayer (ベクターレイヤー)
- GeoJSONデータの描画
- フィーチャー単位のスタイリング
- イベントハンドリング

## データフロー

```
GeoJSON Data
    ↓
LayerManager (正規化・管理)
    ↓
Renderer (D3パス生成)
    ↓
SVG DOM (最終出力)
```

## 拡張ポイント

### 1. 新しいレイヤータイプの追加

```typescript
class CustomLayer extends BaseLayer {
  render(container: Selection<SVGGElement, unknown, HTMLElement, any>): void {
    // カスタム描画ロジック
  }
  
  update(): void {
    // 更新ロジック
  }
}
```

### 2. 新しいユーティリティ関数

```typescript
// utils/custom-utils.ts
export function customCalculation(data: any): any {
  // カスタム計算ロジック
}
```

### 3. カスタムレンダラー

```typescript
class CustomRenderer extends Renderer {
  // 特殊な描画処理のオーバーライド
}
```

## 設計パターン

### 1. Strategy Pattern (レイヤーシステム)
- 異なる描画戦略をレイヤータイプごとに実装
- BaseLayerを通じた統一インターフェース

### 2. Observer Pattern (レイヤー管理)
- レイヤーの状態変化を監視
- 自動的な再描画のトリガー

### 3. Factory Pattern (投影法作成)
- 投影法名から投影法オブジェクトを生成
- 拡張可能な投影法サポート

## パフォーマンス考慮事項

### 1. 効率的な再描画
- 変更されたレイヤーのみを再描画
- DOM操作の最小化

### 2. 最適化されたzIndex制御
- **DOM要素順序の直接変更**: zIndex変更時に再描画せず、DOM要素の順序のみ変更
- **差分検出**: zIndex値が実際に変更された場合のみ再配置処理を実行
- **スマートな初期値設定**: 新しいレイヤーは既存の最大zIndex+1で自動設定

### 3. メモリ管理
- 不要なレイヤーの適切な破棄
- イベントリスナーのクリーンアップ

### 4. 大量データの処理
- 段階的な描画
- 必要に応じたデータの分割

## 今後の拡張計画

### Phase 1: 基本機能
- ✅ コア機能の実装
- ✅ ベクターレイヤー
- ⏳ 基本的な主題図表現

### Phase 2: 高度な主題図
- 📋 Choropleth (段階区分図)
- 📋 Proportional symbols
- 📋 Dot density maps
- 📋 Flow maps

### Phase 3: 装飾・レイアウト
- 📋 Map elements (scale, north arrow)
- 📋 Legends
- 📋 Annotations
- 📋 Multiple maps layout

### Phase 4: エフェクト・アニメーション
- 📋 CSS effects integration
- 📋 SVG filters
- 📋 Smooth transitions