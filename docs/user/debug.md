# デバッグガイド

このページでは、d3-cartographyライブラリのデバッグに役立つ機能について説明します。

## 座標変換テスト機能

投影法による座標変換が正しく動作しているかを検証するためのテスト機能を提供しています。

### testProjectionTransform

投影法によって地理座標からピクセル座標への変換が正しく行われているかをテストします。

#### 基本的な使用法

```javascript
import { testProjectionTransform, logTestResult } from 'd3-thematika';

// テスト実行
const testResult = testProjectionTransform(width, height, projection, geoJsonData);

// 結果をコンソールに出力
logTestResult(testResult, true); // 第二引数がtrueで詳細表示
```

#### UMD版での使用法

```javascript
// D3投影法を設定
const projection = d3.geoMercator()
  .fitExtent([[0, 0], [800, 600]], geoJsonData);

// テスト実行
const testResult = Cartography.testProjectionTransform(800, 600, projection, geoJsonData);

// 結果を出力
Cartography.logTestResult(testResult, true);
```

#### パラメータ

- `width` (number): 地図の幅（ピクセル）
- `height` (number): 地図の高さ（ピクセル）
- `projection` (GeoProjection): D3投影法オブジェクト
- `geoJson` (GeoJSON.FeatureCollection): テスト対象のGeoJSONデータ

#### 戻り値

```typescript
interface ProjectionTestResult {
  totalCoords: number;      // 総座標数
  normalCoords: number;     // 正常座標数
  abnormalCoords: number;   // 異常座標数
  abnormalDetails: AbnormalCoordinate[]; // 異常値の詳細
  isValid: boolean;         // テスト成功フラグ
  summary: string;          // サマリーメッセージ
}
```

#### 出力例

```
=== 座標変換テスト結果 ===
総座標数: 2847
正常座標数: 2847
異常座標数: 0
✅ すべての座標が正常範囲内です (0-800 × 0-600)
```

異常値がある場合：

```
=== 座標変換テスト結果 ===
総座標数: 2847
正常座標数: 2830
異常座標数: 17
⚠️ 17個の座標が範囲外です
異常値の詳細:
  1. Antarctica: [-180, -85] → [-45.23, 650.12] (x OK, y > 600)
  2. Greenland: [180, 83] → [845.67, -12.34] (x > 800, y < 0)
```

### testProjectionBounds

投影法の境界設定が正しく行われているかをテストします。

#### 基本的な使用法

```javascript
import { testProjectionBounds } from 'd3-cartography';

const boundsTest = testProjectionBounds(projection, geoJsonData);
console.log(boundsTest.message);
```

#### UMD版での使用法

```javascript
const boundsTest = Cartography.testProjectionBounds(projection, geoJsonData);
console.log(boundsTest.message);
```

#### パラメータ

- `projection` (GeoProjection): D3投影法オブジェクト
- `geoJson` (GeoJSON.FeatureCollection): テスト対象のGeoJSONデータ

#### 戻り値

```typescript
interface BoundsTestResult {
  isValid: boolean;  // テスト成功フラグ
  message: string;   // 結果メッセージ
}
```

#### 出力例

正常な場合：
```
✅ 投影法の境界設定は正常です
```

問題がある場合：
```
⚠️ 投影法で変換できない座標があります (4個)
```

エラーが発生した場合：
```
❌ 境界テスト中にエラーが発生しました: Invalid projection parameters
```

## 実践的なデバッグワークフロー

### 1. 基本的な地図描画の検証

```javascript
// 1. 投影法を設定
const projection = d3.geoNaturalEarth1()
  .fitExtent([[0, 0], [800, 600]], worldData);

// 2. 境界テストを実行
const boundsTest = Cartography.testProjectionBounds(projection, worldData);
console.log(boundsTest.message);

// 3. 座標変換テストを実行
const transformTest = Cartography.testProjectionTransform(800, 600, projection, worldData);
Cartography.logTestResult(transformTest, true);

// 4. 問題がなければ地図を作成
if (transformTest.isValid && boundsTest.isValid) {
  const map = new Cartography.Cartography({
    container: '#map',
    width: 800,
    height: 600,
    projection: projection
  });
  
  map.addLayer('world', {
    data: worldData,
    style: { fill: '#ccc', stroke: '#333' }
  });
}
```

### 2. 投影法別のトラブルシューティング

#### メルカトル図法

```javascript
// 極地域で問題が発生しやすい
const projection = d3.geoMercator()
  .center([0, 0])
  .scale(150)
  .translate([400, 300]);

// 高緯度地域をフィルタリングして使用
const filteredData = {
  type: 'FeatureCollection',
  features: worldData.features.filter(feature => {
    // 緯度±85度を超える地域を除外
    const bounds = Cartography.calculateBounds({
      type: 'FeatureCollection',
      features: [feature]
    });
    return bounds[1] > -85 && bounds[3] < 85;
  })
};
```

#### 正射図法

```javascript
// 地球の裏側が見えない問題
const projection = d3.geoOrthographic()
  .scale(250)
  .translate([400, 300])
  .center([0, 0]);

// 可視範囲のみをテスト
const visibleData = filterVisibleFeatures(worldData, projection);
const testResult = Cartography.testProjectionTransform(800, 600, projection, visibleData);
```

### 3. パフォーマンス測定

```javascript
console.time('Projection Test');
const testResult = Cartography.testProjectionTransform(800, 600, projection, geoJsonData);
console.timeEnd('Projection Test');

console.log(`処理した座標数: ${testResult.totalCoords}`);
console.log(`異常率: ${(testResult.abnormalCoords / testResult.totalCoords * 100).toFixed(2)}%`);
```

## トラブルシューティング

### よくある問題と解決策

#### 座標が範囲外になる

**原因**: 投影法の設定（scale, translate, center）が不適切

**解決策**:
```javascript
// fitExtentを使用して自動調整
const projection = d3.geoNaturalEarth1()
  .fitExtent([[padding, padding], [width-padding, height-padding]], geoJsonData);
```

#### 一部の地域が表示されない

**原因**: 投影法の特性（正射図法の裏側など）

**解決策**:
```javascript
// データをフィルタリング
const visibleFeatures = geoJsonData.features.filter(feature => {
  // フィーチャの中心点が投影可能かチェック
  const center = Cartography.calculateCenter({
    type: 'FeatureCollection',
    features: [feature]
  });
  return projection(center) !== null;
});
```

#### 投影法エラー

**原因**: 投影法のパラメータが無効

**解決策**:
```javascript
try {
  const testResult = Cartography.testProjectionBounds(projection, geoJsonData);
  if (!testResult.isValid) {
    console.warn('投影法に問題があります:', testResult.message);
    // フォールバック投影法を使用
    projection = d3.geoNaturalEarth1().fitExtent([[0, 0], [width, height]], geoJsonData);
  }
} catch (error) {
  console.error('投影法テストでエラー:', error);
}
```

## ベストプラクティス

1. **開発時は常にテストを実行**: 新しい投影法や地理データを使用する際は必ずテストを実行
2. **段階的な検証**: 境界テスト → 座標変換テスト → 実際の描画の順で検証
3. **エラーハンドリング**: テスト結果を確認してからメイン処理を実行
4. **パフォーマンス考慮**: 大量データの場合はサンプリングしてテスト実行
5. **ログ出力**: 詳細モードでテスト結果をログに記録して問題の特定を容易に

これらのデバッグ機能を活用することで、地図描画の品質を向上させ、問題の早期発見・解決が可能になります。