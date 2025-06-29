# アーキテクチャ

d3-Thematikaライブラリの全体構造と設計思想について説明します。

## 全体構造

```
d3-Thematika
├── Core Layer (コア機能)
│   ├── Cartography (メインクラス)
│   └── LayerManager (レイヤー管理)
├── Layer System (レイヤーシステム)
│   ├── BaseLayer (基底クラス)
│   ├── GeojsonLayer (GeoJSONレイヤー)
│   └── [Future: ImageLayer, etc.]
├── Utilities (ユーティリティ)
│   ├── FilterUtils (SVGフィルター)
│   ├── PatternUtils (SVGパターン)
│   └── Tests (デバッグ・テストユーティリティ)
└── Types (型定義)
    ├── ILayer (基底インターフェース)
    └── IGeojsonLayer (GeoJSONレイヤーインターフェース)
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
- SVG要素とdefsの管理

### 2. LayerManager (レイヤー管理)

- 複数レイヤーの管理
- レイヤーの追加・削除・更新
- 描画順序の制御
- 表示/非表示の管理

**責任範囲:**
- レイヤーのライフサイクル管理
- zIndexによる描画順制御
- レイヤー間の相互作用

### 3. Layer System (レイヤーシステム)

#### BaseLayer (基底クラス)
- 全レイヤーの共通機能
- 抽象的なインターフェース定義
- 基本的なライフサイクル管理

#### GeojsonLayer (GeoJSONレイヤー)
- GeoJSONデータの描画
- フィーチャー単位のスタイリング
- イベントハンドリング
- 動的スタイル関数のサポート
- 投影法の設定と更新
- styleとattrプロパティのサポート（attrはstyleのエイリアス）

#### OutlineLayer (アウトラインレイヤー)
- D3のSphereジオメトリを使用した投影法境界の描画
- 自動クリッピング機能（createClipPath: true）
- 他のレイヤーを投影法境界内にクリップ
- カスタマイズ可能なクリップパスID

#### GraticuleLayer (経緯線レイヤー)
- D3のgeoGraticuleを使用した経緯線網の描画
- カスタマイズ可能な間隔設定（step: [経度, 緯度]）
- 描画範囲の指定（extent）
- 動的な間隔・範囲の変更機能

### 4. Utilities (ユーティリティ)

#### FilterUtils (SVGフィルター)
- createDropShadow: ドロップシャドウフィルターの作成
- createBlur: ぼかしフィルターの作成
- createGlow: グローフィルターの作成

#### PatternUtils (SVGパターン)
- createHatchPattern: ハッチパターンの作成
- createDotPattern: ドットパターンの作成
- createCrossPattern: クロスパターンの作成

### 5. Tests (デバッグ・テストユーティリティ)

- 座標変換テスト機能
- 投影法境界テスト
- パフォーマンス測定

**責任範囲:**
- testProjectionTransform: 座標変換の異常値検出
- testProjectionBounds: 投影法境界設定の検証
- logTestResult: テスト結果の可視化

## データフロー

```
GeoJSON Data
    ↓
GeojsonLayer (データ正規化)
    ↓
LayerManager (レイヤー管理・投影法設定)
    ↓
GeojsonLayer.render() (D3パス生成・スタイル適用)
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

### 3. 型定義の拡張

```typescript
// 新しいレイヤーインターフェース
export interface ICustomLayer extends ILayer {
  customMethod(): void;
}
```

## 設計パターン

### 1. Strategy Pattern (レイヤーシステム)
- 異なる描画戦略をレイヤータイプごとに実装
- BaseLayerを通じた統一インターフェース

### 2. Observer Pattern (レイヤー管理)
- レイヤーの状態変化を監視
- 自動的な再描画のトリガー

### 3. Type Guard Pattern (型安全性)
- isGeojsonLayerなどの型ガード関数
- 型安全なレイヤー操作

### 4. Direct Injection Pattern (投影法設定)
- D3投影法オブジェクトを直接受け取る設計
- より柔軟で拡張可能な投影法サポート

## パフォーマンス考慮事項

### 1. 効率的な再描画
- 変更されたレイヤーのみを再描画
- DOM操作の最小化

### 2. 最適化されたzIndex制御
- **DOM要素順序の直接変更**: zIndex変更時に再描画せず、DOM要素の順序のみ変更
- **差分検出**: zIndex値が実際に変更された場合のみ再配置処理を実行
- **共通スタイル適用システム**: BaseLayerで統一されたスタイル属性マッピング
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
- ✅ GeojsonLayer (GeoJSONレイヤー)
- ✅ 投影法設定（D3プロジェクション直接指定）
- ✅ デバッグ・テストユーティリティ
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
- ✅ SVG filters (実装完了)
- 📋 Smooth transitions