# サイズスケール用重ね表示機能とリファクタリング

## 📋 概要
`reference/legend.png`のような美しいサイズスケール重ね表示を実現するため、専用のレンダリング機能を実装し、併せて既存コードのリファクタリングを行う。

## 🎯 目標
- 同心円状の重ね表示によるプロフェッショナルな凡例
- シンプルで保守しやすいコード構造
- 既存機能への影響ゼロ

## 🔍 現状の課題

### 1. 機能面の課題
- アイテム間隔調整では理想的な重ね表示ができない
- ラベル位置が最適化されない
- リーダーラインが実装されていない

### 2. コード構造の課題
- 各レンダー関数内にサイズスケール用の複雑な分岐処理
- 可読性とメンテナンス性の低下
- テストが困難

## 💡 解決策

### アーキテクチャの改善
```typescript
// 🆕 新しい構造
private renderLegend(): void {
  if (this.hasSizeScale()) {
    this.renderSizeScaleLegend(); // 専用関数
  } else {
    // 既存の分岐（簡素化後）
    switch (this.symbolType) {
      case 'cell': this.renderCellLegend(); 
      case 'circle': this.renderCircleLegend();
      case 'line': this.renderLineLegend();
      case 'gradient': this.renderGradientLegend();
    }
  }
}
```

### 新機能の追加
```typescript
interface LegendLayerOptions {
  overlapping?: boolean;  // 重ね表示モード
  leaderLines?: boolean;  // リーダーライン表示
}
```

## 🔧 開発タスク

### Phase 0: リファクタリング準備 🧹
- [ ] `hasSizeScale()` ヘルパー関数の実装
- [ ] `renderSizeScaleLegend()` 基本構造の作成
- [ ] 既存関数からサイズスケール分岐の除去
  - [ ] `renderCellLegend()` の簡素化
  - [ ] `renderCircleLegend()` の簡素化  
  - [ ] `renderLineLegend()` の簡素化
- [ ] 既存機能の動作確認とテスト

### Phase 1: サイズスケール専用実装 🎨
- [ ] `overlapping` オプションの追加
- [ ] circle タイプでの同心円配置
- [ ] ラベルの右側統一配置
- [ ] cell/line タイプでの重ね表示対応

### Phase 2: 拡張機能 ✨
- [ ] リーダーライン機能の実装
- [ ] 点線スタイルのカスタマイズ
- [ ] 表示/非表示制御
- [ ] アニメーション効果の検討

### Phase 3: 統合・最適化 🚀
- [ ] 既存機能との統合テスト
- [ ] 背景ボックスの調整
- [ ] examples/legend-layer.html への追加
- [ ] パフォーマンス最適化
- [ ] ドキュメント更新

## 🧪 テスト要件
- [ ] 各シンボルタイプでの重ね表示
- [ ] 縦/横レイアウトでの動作確認
- [ ] 様々なサイズスケール範囲での表示
- [ ] 既存機能への影響がないことの確認
- [ ] overlapping オプションの切り替えテスト

## 🎨 UI/UX 考慮事項
- **直感的な切り替え**: 通常モードと重ね表示モードの明確な区別
- **視覚的一貫性**: 既存のスタイル体系との整合性
- **アクセシビリティ**: リーダーラインによる視認性向上

## 📊 期待される効果

### 機能面
1. **視覚的品質向上**: プロフェッショナルな凡例表示
2. **スペース効率**: コンパクトな重ね表示
3. **読みやすさ**: リーダーラインによる明確な対応関係

### 開発面
1. **コード品質向上**: 責任の明確な分離
2. **保守性向上**: シンプルで理解しやすい構造
3. **拡張性向上**: 新機能の実装が容易

## 🔄 削除予定の複雑なコード例
```typescript
// 🗑️ 各レンダー関数から削除予定
const hasSizeVariation = this.sizeScale || (legendData.sizes && legendData.sizes.length > 0);
const maxSize = hasSizeVariation ? Math.max(...legendData.data.map((d, i) => getSize(d, i))) : 0;

.attr('x', (d, i) => {
  if (this.orientation === 'vertical' && hasSizeVariation) {
    return (maxSize - getSize(d, i)) / 2;
  }
  if (this.orientation === 'horizontal' && hasSizeVariation) {
    return maxSize - getSize(d, i);
  }
  return 0;
})
```

## 📋 実装優先度
1. **高**: Phase 0（リファクタリング）- コード品質の基盤
2. **中**: Phase 1（基本実装）- 重ね表示の実現
3. **低**: Phase 2-3（拡張・最適化）- 付加価値機能

## 🚨 注意事項
- 既存ユーザーへの影響を最小限に抑制
- デフォルト動作は現在の仕様を維持
- 段階的な実装でリスクを軽減

---

**参考画像**: `reference/legend.png` - 目標とする重ね表示の視覚例