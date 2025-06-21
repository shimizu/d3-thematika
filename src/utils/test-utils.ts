import { GeoProjection } from 'd3-geo';

/**
 * 座標変換テストの異常値情報
 */
export interface AbnormalCoordinate {
  /** 地物名 */
  featureName?: string;
  /** 元の地理座標 [経度, 緯度] */
  originalCoord: [number, number];
  /** 変換後のピクセル座標 [x, y] */
  projectedCoord: [number, number];
  /** 範囲外の詳細情報 */
  outOfBounds: {
    x: string;
    y: string;
  };
}

/**
 * 座標変換テストの結果
 */
export interface ProjectionTestResult {
  /** 総座標数 */
  totalCoords: number;
  /** 正常座標数 */
  normalCoords: number;
  /** 異常座標数 */
  abnormalCoords: number;
  /** 異常値の詳細リスト */
  abnormalDetails: AbnormalCoordinate[];
  /** テストが成功したかどうか */
  isValid: boolean;
  /** サマリーメッセージ */
  summary: string;
}

/**
 * 投影法による座標変換が正しく動作しているかテストします
 * @param width - 地図の幅（ピクセル）
 * @param height - 地図の高さ（ピクセル）
 * @param projection - D3投影法オブジェクト
 * @param geoJson - テスト対象のGeoJSONデータ
 * @returns テスト結果
 */
export function testProjectionTransform(
  width: number,
  height: number,
  projection: GeoProjection,
  geoJson: GeoJSON.FeatureCollection
): ProjectionTestResult {
  let totalCoords = 0;
  let abnormalCoords = 0;
  const abnormalDetails: AbnormalCoordinate[] = [];

  // 各地物の座標を検査
  geoJson.features.forEach((feature) => {
    const featureName = feature.properties?.name || `Feature ${feature.id || 'unknown'}`;
    
    // 地物の座標を再帰的に処理
    processGeometry(feature.geometry, featureName, projection, width, height, 
      (coord, name, proj, w, h) => {
        const projected = proj([coord[0], coord[1]]);
        if (!projected) return;
        
        totalCoords++;
        
        // 座標が範囲外の場合は異常値として記録
        if (projected[0] < 0 || projected[0] > w || projected[1] < 0 || projected[1] > h) {
          abnormalCoords++;
          abnormalDetails.push({
            featureName: name,
            originalCoord: [coord[0], coord[1]],
            projectedCoord: [projected[0], projected[1]],
            outOfBounds: {
              x: projected[0] < 0 ? 'x < 0' : projected[0] > w ? `x > ${w}` : 'x OK',
              y: projected[1] < 0 ? 'y < 0' : projected[1] > h ? `y > ${h}` : 'y OK'
            }
          });
        }
      }
    );
  });

  const normalCoords = totalCoords - abnormalCoords;
  const isValid = abnormalCoords === 0;
  const summary = isValid
    ? `✅ すべての座標が正常範囲内です (0-${width} × 0-${height})`
    : `⚠️ ${abnormalCoords}個の座標が範囲外です`;

  return {
    totalCoords,
    normalCoords,
    abnormalCoords,
    abnormalDetails,
    isValid,
    summary
  };
}

/**
 * 地理ジオメトリを再帰的に処理して座標を取得
 */
function processGeometry(
  geometry: GeoJSON.Geometry,
  featureName: string,
  projection: GeoProjection,
  width: number,
  height: number,
  processor: (coord: [number, number], name: string, proj: GeoProjection, w: number, h: number) => void
): void {
  switch (geometry.type) {
    case 'Point':
      processor(geometry.coordinates as [number, number], featureName, projection, width, height);
      break;
    
    case 'LineString':
      geometry.coordinates.forEach(coord => {
        processor(coord as [number, number], featureName, projection, width, height);
      });
      break;
    
    case 'Polygon':
      geometry.coordinates.forEach(ring => {
        ring.forEach(coord => {
          processor(coord as [number, number], featureName, projection, width, height);
        });
      });
      break;
    
    case 'MultiPoint':
      geometry.coordinates.forEach(coord => {
        processor(coord as [number, number], featureName, projection, width, height);
      });
      break;
    
    case 'MultiLineString':
      geometry.coordinates.forEach(lineString => {
        lineString.forEach(coord => {
          processor(coord as [number, number], featureName, projection, width, height);
        });
      });
      break;
    
    case 'MultiPolygon':
      geometry.coordinates.forEach(polygon => {
        polygon.forEach(ring => {
          ring.forEach(coord => {
            processor(coord as [number, number], featureName, projection, width, height);
          });
        });
      });
      break;
    
    case 'GeometryCollection':
      geometry.geometries.forEach(geom => {
        processGeometry(geom, featureName, projection, width, height, processor);
      });
      break;
  }
}

/**
 * テスト結果をコンソールに出力
 * @param result - テスト結果
 * @param detailed - 詳細な異常値情報も出力するかどうか
 */
export function logTestResult(result: ProjectionTestResult, detailed: boolean = false): void {
  console.log('=== 座標変換テスト結果 ===');
  console.log(`総座標数: ${result.totalCoords}`);
  console.log(`正常座標数: ${result.normalCoords}`);
  console.log(`異常座標数: ${result.abnormalCoords}`);
  console.log(result.summary);
  
  if (detailed && result.abnormalCoords > 0) {
    console.warn('異常値の詳細:');
    result.abnormalDetails.forEach((detail, index) => {
      console.warn(`  ${index + 1}. ${detail.featureName}: [${detail.originalCoord}] → [${detail.projectedCoord.map(c => c.toFixed(2))}] (${detail.outOfBounds.x}, ${detail.outOfBounds.y})`);
    });
  }
}

/**
 * 地図の境界ボックスが正しく設定されているかテスト
 * @param projection - D3投影法オブジェクト
 * @param geoJson - テスト対象のGeoJSONデータ
 * @returns テスト結果の概要
 */
export function testProjectionBounds(
  projection: GeoProjection,
  geoJson: GeoJSON.FeatureCollection
): { isValid: boolean; message: string } {
  try {
    // 地理データの境界を計算
    let minLng = Infinity, maxLng = -Infinity;
    let minLat = Infinity, maxLat = -Infinity;
    
    geoJson.features.forEach(feature => {
      processGeometry(feature.geometry, '', projection, 0, 0, (coord) => {
        const [lng, lat] = coord;
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
      });
    });
    
    // 境界の四隅を投影してテスト
    const corners = [
      [minLng, minLat],
      [maxLng, minLat],
      [maxLng, maxLat],
      [minLng, maxLat]
    ];
    
    const projectedCorners = corners.map(corner => projection(corner as [number, number]));
    const validCorners = projectedCorners.filter(corner => corner !== null);
    
    if (validCorners.length === corners.length) {
      return {
        isValid: true,
        message: '✅ 投影法の境界設定は正常です'
      };
    } else {
      return {
        isValid: false,
        message: `⚠️ 投影法で変換できない座標があります (${corners.length - validCorners.length}個)`
      };
    }
  } catch (error) {
    return {
      isValid: false,
      message: `❌ 境界テスト中にエラーが発生しました: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}