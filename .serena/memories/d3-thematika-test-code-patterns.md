# d3-thematikaテストコード実装パターン

## レイヤーテストの実装例

### GeojsonLayerテスト構造
```typescript
import { GeojsonLayer } from '../geojson-layer';

describe('GeojsonLayer', () => {
  let geojsonLayer: GeojsonLayer;
  let mockContainer: any;
  let mockProjection: any;
  let sampleGeoJSON: GeoJSON.FeatureCollection;

  beforeEach(() => {
    // サンプルデータ準備
    sampleGeoJSON = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { name: 'Test Country', population: 1000000 },
          geometry: {
            type: 'Polygon',
            coordinates: [[[0,0], [10,0], [10,10], [0,10], [0,0]]]
          }
        }
      ]
    };

    // レイヤー作成
    geojsonLayer = new GeojsonLayer({
      data: sampleGeoJSON,
      attr: {
        fill: '#ff0000',
        stroke: '#000000',
        strokeWidth: 1
      }
    });

    // モック投影法
    mockProjection = jest.fn();

    // D3セレクションチェーンモック
    const mockPathElement = {
      attr: jest.fn().mockReturnThis(),
      style: jest.fn().mockReturnThis(),
      on: jest.fn().mockReturnThis()
    };

    const mockEnterSelection = {
      append: jest.fn(() => mockPathElement)
    };

    const mockDataSelection = {
      enter: jest.fn(() => mockEnterSelection),
      exit: jest.fn().mockReturnThis(),
      remove: jest.fn().mockReturnThis(),
      attr: jest.fn().mockReturnThis(),
      style: jest.fn().mockReturnThis()
    };

    mockContainer = {
      append: jest.fn().mockReturnThis(),
      attr: jest.fn().mockReturnThis(),
      style: jest.fn().mockReturnThis(),
      selectAll: jest.fn(() => mockDataSelection),
      data: jest.fn().mockReturnThis()
    };
  });

  // テストケース...
});
```

### ポイントレイヤーテストパターン
```typescript
describe('PointCircleLayer', () => {
  describe('constructor', () => {
    test('radiusプロパティの設定', () => {
      // 数値radius
      const layer1 = new PointCircleLayer({
        data: pointData,
        radius: 10
      });
      
      // 関数radius
      const layer2 = new PointCircleLayer({
        data: pointData,
        radius: (d: any) => d.properties.size * 2
      });
      
      // デフォルト値
      const layer3 = new PointCircleLayer({ data: pointData });
      expect(layer3.radius).toBe(5); // デフォルト
    });
  });

  describe('geometry handling', () => {
    test('Point geometryの処理', () => {
      const pointFeature = {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [0, 0] }
      };
      // 処理確認
    });

    test('MultiPoint geometryの処理', () => {
      const multiPointFeature = {
        type: 'Feature',
        geometry: {
          type: 'MultiPoint',
          coordinates: [[0, 0], [1, 1]]
        }
      };
      // 各ポイントが個別に処理されることを確認
    });
  });
});
```

### ラインレイヤーテストパターン
```typescript
describe('LineConnectionLayer', () => {
  describe('data validation', () => {
    test('有効な接続データの検証', () => {
      const validData = [
        { source: [0, 0], target: [10, 10] },
        { source: [5, 5], target: [15, 15] }
      ];
      
      const layer = new LineConnectionLayer({
        data: validData
      });
      
      expect(layer.getData()).toEqual(validData);
    });

    test('無効なデータでエラー', () => {
      const invalidData = [
        { source: [0], target: [10, 10] } // 不完全な座標
      ];
      
      expect(() => {
        new LineConnectionLayer({ data: invalidData });
      }).toThrow('Invalid connection data');
    });
  });

  describe('arc generation', () => {
    test('アーク高さの計算', () => {
      const layer = new LineConnectionLayer({
        data: connectionData,
        arcHeight: 0.3
      });
      
      // アーク生成ロジックのテスト
      const arc = layer.generateArc([0,0], [10,10]);
      expect(arc).toContain('Q'); // Quadratic Bezier curve
    });
  });
});
```

### 特殊レイヤーテストパターン

#### ImageLayerテスト
```typescript
describe('ImageLayer', () => {
  describe('画像読み込み', () => {
    test('画像のロード成功', async () => {
      const onLoadSpy = jest.fn();
      
      const layer = new ImageLayer({
        src: 'test.png',
        bounds: [[0,0], [10,10]],
        onLoad: onLoadSpy
      });
      
      // 画像ロードのシミュレーション
      const mockImage = new Image();
      mockImage.dispatchEvent(new Event('load'));
      
      expect(onLoadSpy).toHaveBeenCalled();
    });

    test('画像ロードエラー処理', async () => {
      const onErrorSpy = jest.fn();
      
      const layer = new ImageLayer({
        src: 'invalid.png',
        bounds: [[0,0], [10,10]],
        onError: onErrorSpy
      });
      
      // エラーシミュレーション
      const mockImage = new Image();
      mockImage.dispatchEvent(new Event('error'));
      
      expect(onErrorSpy).toHaveBeenCalled();
    });
  });

  describe('bbox markers', () => {
    test('マーカー表示制御', () => {
      const layer = new ImageLayer({
        src: 'test.png',
        bounds: [[0,0], [10,10]],
        showBboxMarkers: true
      });
      
      layer.render(mockContainer, mockProjection);
      
      // マーカー要素の作成確認
      expect(mockContainer.selectAll)
        .toHaveBeenCalledWith('.bbox-marker');
    });
  });
});
```

#### LegendLayerテスト
```typescript
describe('LegendLayer', () => {
  describe('scale types', () => {
    test('カテゴリカルスケール', () => {
      const layer = new LegendLayer({
        scale: 'categorical',
        items: [
          { color: '#ff0000', label: 'High' },
          { color: '#00ff00', label: 'Low' }
        ]
      });
      
      layer.render(mockContainer);
      
      // 各アイテムの描画確認
      expect(mockContainer.append).toHaveBeenCalledTimes(2);
    });

    test('連続スケール', () => {
      const layer = new LegendLayer({
        scale: 'continuous',
        colorScale: d3.scaleLinear()
          .domain([0, 100])
          .range(['#ffffff', '#000000'])
      });
      
      // グラデーション生成確認
    });
  });
});
```

### エラーハンドリングテスト
```typescript
describe('error handling', () => {
  test('nullデータの処理', () => {
    expect(() => {
      new GeojsonLayer({ data: null });
    }).toThrow('Data is required');
  });

  test('不正な投影法の処理', () => {
    const layer = new GeojsonLayer({ data: validData });
    
    expect(() => {
      layer.setProjection(null);
    }).toThrow('Invalid projection');
  });

  test('レンダリング前の投影法チェック', () => {
    const layer = new GeojsonLayer({ data: validData });
    
    expect(() => {
      layer.render(mockContainer, null);
    }).toThrow('Projection not set');
  });
});
```

### 統合テストパターン
```typescript
describe('integration scenarios', () => {
  test('複数レイヤーの連携', () => {
    const baseLayer = new GeojsonLayer({ 
      data: countryData 
    });
    
    const pointLayer = new PointCircleLayer({ 
      data: cityData 
    });
    
    const connectionLayer = new LineConnectionLayer({
      data: generateConnections(cityData)
    });
    
    // レンダリング順序の確認
    baseLayer.render(mockContainer, mockProjection);
    connectionLayer.render(mockContainer, mockProjection);
    pointLayer.render(mockContainer, mockProjection);
    
    // z-index確認
    expect(baseLayer.zIndex).toBeLessThan(connectionLayer.zIndex);
    expect(connectionLayer.zIndex).toBeLessThan(pointLayer.zIndex);
  });
});
```

### パフォーマンステスト
```typescript
describe('performance', () => {
  test('大量データの処理', () => {
    // 1000個のフィーチャー生成
    const largeData = generateLargeDataset(1000);
    
    const startTime = performance.now();
    
    const layer = new GeojsonLayer({ data: largeData });
    layer.render(mockContainer, mockProjection);
    
    const endTime = performance.now();
    
    // 1秒以内に処理完了
    expect(endTime - startTime).toBeLessThan(1000);
  });
});
```

### スナップショットテスト
```typescript
describe('snapshot tests', () => {
  test('レンダリング結果の一貫性', () => {
    const layer = new GeojsonLayer({
      data: sampleData,
      style: { fill: '#ff0000' }
    });
    
    layer.render(mockContainer, mockProjection);
    
    // 呼び出し履歴のスナップショット
    expect(mockContainer.attr.mock.calls).toMatchSnapshot();
    expect(mockContainer.style.mock.calls).toMatchSnapshot();
  });
});
```

## テスト実行とデバッグ

### 特定テストの実行
```bash
# 特定ファイルのみ
npm test geojson-layer.test.ts

# 特定のdescribeブロック
npm test -- --testNamePattern="GeojsonLayer constructor"

# ウォッチモードで特定ファイル
npm run test:watch geojson-layer.test.ts
```

### デバッグ用ユーティリティ
```typescript
// テスト内でのログ出力
console.log(mockContainer.attr.mock.calls);

// 呼び出し回数の確認
expect(mockContainer.append).toHaveBeenCalledTimes(1);

// 引数の確認
expect(mockContainer.attr).toHaveBeenCalledWith('class', 'layer-group');

// 呼び出し順序の確認
expect(mockContainer.attr).toHaveBeenCalledBefore(mockContainer.style);
```

## カバレッジ向上のコツ

1. **エッジケースを網羅**
   - 空配列、null、undefined
   - 極端な値（0、負数、Infinity）
   - 不正な型

2. **条件分岐を全て通る**
   - if/else両方のパス
   - switch文の全ケース
   - 三項演算子の両方

3. **エラーパスのテスト**
   - try/catchブロック
   - エラーコールバック
   - Promise rejection

4. **オプショナル引数**
   - デフォルト値の確認
   - 全組み合わせ

5. **ライフサイクル**
   - 初期化→レンダリング→更新→破棄