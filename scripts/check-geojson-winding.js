#!/usr/bin/env node
/**
 * D3対応GeoJSONワインディング順序チェックスクリプト
 * 
 * D3.jsでGeoJSONを正しく描画するためのワインディング順序チェックツール
 * 
 * 問題:
 * - GeoJSON仕様（RFC7946）: 外側のリングは反時計回り（CCW）、内側のリングは時計回り（CW）
 * - D3.js実装: 外側のリングは時計回り（CW）、内側のリングは反時計回り（CCW）を期待
 * 
 * 使用方法:
 * node scripts/check-geojson-winding.js <geojson-file>
 * 
 * 出力:
 * - D3互換性レポート
 * - ワインディング順序の詳細
 * - 修正が必要な場合の提案
 */

import fs from 'fs';
import path from 'path';

/**
 * ポリゴンの符号付き面積を計算（平面座標系）
 * 正の値 = 反時計回り（CCW）
 * 負の値 = 時計回り（CW）
 * 
 * @param {Array} ring - 座標のリング [[lon, lat], [lon, lat], ...]
 * @returns {number} 符号付き面積
 */
function calculateSignedArea(ring) {
  let area = 0;
  const n = ring.length;
  
  if (n < 3) return 0;
  
  for (let i = 0; i < n - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    area += (x2 - x1) * (y2 + y1);
  }
  
  return area / 2;
}

/**
 * ワインディング順序を判定
 * @param {Array} ring - 座標のリング
 * @returns {string} 'CW' | 'CCW'
 */
function getWindingOrder(ring) {
  const area = calculateSignedArea(ring);
  return area > 0 ? 'CW' : 'CCW';
}

/**
 * ポリゴンフィーチャーを解析
 * @param {Object} geometry - GeoJSONジオメトリ
 * @returns {Object} 解析結果
 */
function analyzePolygon(geometry) {
  const results = {
    type: geometry.type,
    rings: [],
    d3Compatible: true,
    geoJsonCompliant: true,
    issues: []
  };
  
  let coordinates;
  if (geometry.type === 'Polygon') {
    coordinates = [geometry.coordinates];
  } else if (geometry.type === 'MultiPolygon') {
    coordinates = geometry.coordinates;
  } else {
    return results;
  }
  
  coordinates.forEach((polygon, polygonIndex) => {
    polygon.forEach((ring, ringIndex) => {
      const windingOrder = getWindingOrder(ring);
      const isExterior = ringIndex === 0;
      const ringInfo = {
        polygonIndex,
        ringIndex,
        isExterior,
        windingOrder,
        pointCount: ring.length
      };
      
      results.rings.push(ringInfo);
      
      // GeoJSON仕様チェック（RFC7946）
      if (isExterior && windingOrder !== 'CCW') {
        results.geoJsonCompliant = false;
        results.issues.push({
          type: 'geojson-exterior-ring-winding',
          message: `外側リング（Polygon ${polygonIndex}）が時計回り（CW）です。GeoJSON仕様では反時計回り（CCW）が必要です。`,
          polygonIndex,
          ringIndex,
          currentWinding: windingOrder,
          expectedWinding: 'CCW',
          compliance: 'geojson'
        });
      }
      
      if (!isExterior && windingOrder !== 'CW') {
        results.geoJsonCompliant = false;
        results.issues.push({
          type: 'geojson-hole-ring-winding',
          message: `穴（Polygon ${polygonIndex}, Ring ${ringIndex}）が反時計回り（CCW）です。GeoJSON仕様では時計回り（CW）が必要です。`,
          polygonIndex,
          ringIndex,
          currentWinding: windingOrder,
          expectedWinding: 'CW',
          compliance: 'geojson'
        });
      }
      
      // D3互換性チェック
      if (isExterior && windingOrder !== 'CW') {
        results.d3Compatible = false;
        results.issues.push({
          type: 'd3-exterior-ring-winding',
          message: `外側リング（Polygon ${polygonIndex}）が反時計回り（CCW）です。D3では時計回り（CW）が必要です。`,
          polygonIndex,
          ringIndex,
          currentWinding: windingOrder,
          expectedWinding: 'CW',
          compliance: 'd3'
        });
      }
      
      if (!isExterior && windingOrder !== 'CCW') {
        results.d3Compatible = false;
        results.issues.push({
          type: 'd3-hole-ring-winding',
          message: `穴（Polygon ${polygonIndex}, Ring ${ringIndex}）が時計回り（CW）です。D3では反時計回り（CCW）が必要です。`,
          polygonIndex,
          ringIndex,
          currentWinding: windingOrder,
          expectedWinding: 'CCW',
          compliance: 'd3'
        });
      }
    });
  });
  
  return results;
}

/**
 * GeoJSONファイルを解析
 * @param {string} filePath - GeoJSONファイルパス
 * @returns {Object} 解析結果
 */
function analyzeGeoJSON(filePath) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const results = {
      file: filePath,
      type: data.type,
      d3Compatible: true,
      geoJsonCompliant: true,
      totalFeatures: 0,
      polygonFeatures: 0,
      issues: [],
      features: []
    };
    
    let features = [];
    if (data.type === 'FeatureCollection') {
      features = data.features;
    } else if (data.type === 'Feature') {
      features = [data];
    } else if (data.geometry) {
      features = [{ geometry: data }];
    }
    
    results.totalFeatures = features.length;
    
    features.forEach((feature, index) => {
      const geometry = feature.geometry;
      if (!geometry) return;
      
      if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
        results.polygonFeatures++;
        const analysis = analyzePolygon(geometry);
        
        if (!analysis.d3Compatible) {
          results.d3Compatible = false;
        }
        
        if (!analysis.geoJsonCompliant) {
          results.geoJsonCompliant = false;
        }
        
        analysis.issues.forEach(issue => {
          results.issues.push({
            ...issue,
            featureIndex: index
          });
        });
        
        results.features.push({
          index,
          analysis
        });
      }
    });
    
    return results;
  } catch (error) {
    throw new Error(`ファイル解析エラー: ${error.message}`);
  }
}

/**
 * 結果を表示
 * @param {Object} results - 解析結果
 */
function displayResults(results) {
  console.log('='.repeat(60));
  console.log('D3対応GeoJSONワインディング順序チェック結果');
  console.log('='.repeat(60));
  console.log(`ファイル: ${results.file}`);
  console.log(`フィーチャー数: ${results.totalFeatures} (ポリゴン: ${results.polygonFeatures})`);
  console.log('');
  
  // GeoJSON仕様チェック
  if (results.geoJsonCompliant) {
    console.log('✅ GeoJSON仕様（RFC7946）: 準拠');
  } else {
    console.log('❌ GeoJSON仕様（RFC7946）: 非準拠');
  }
  
  // D3互換性チェック
  if (results.d3Compatible) {
    console.log('✅ D3互換性: 正常');
  } else {
    console.log('❌ D3互換性: 問題あり');
  }
  
  // 問題の要約表示
  if (results.issues.length > 0) {
    const d3Issues = results.issues.filter(issue => issue.compliance === 'd3');
    const geojsonIssues = results.issues.filter(issue => issue.compliance === 'geojson');
    
    console.log('');
    console.log('問題要約:');
    if (d3Issues.length > 0) {
      console.log(`  D3互換性の問題: ${d3Issues.length}件`);
    }
    if (geojsonIssues.length > 0) {
      console.log(`  GeoJSON仕様の問題: ${geojsonIssues.length}件`);
    }
    
    // 代表的な問題を3つまで表示
    const sampleIssues = results.issues.slice(0, 3);
    if (sampleIssues.length > 0) {
      console.log('');
      console.log('代表的な問題（最初の3件）:');
      sampleIssues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue.message.replace(/（Polygon \d+.*?\）/, '')} (フィーチャー${issue.featureIndex})`);
      });
      
      if (results.issues.length > 3) {
        console.log(`  ... 他${results.issues.length - 3}件`);
      }
    }
  }
  
  // 修正方法の表示
  if (!results.d3Compatible || !results.geoJsonCompliant) {
    console.log('');
    console.log('修正方法:');
    
    if (!results.d3Compatible) {
      console.log('D3用修正:');
      console.log('  npm install @turf/rewind');
      console.log('  import { rewind } from "@turf/rewind";');
      console.log('  const corrected = rewind(geojson, { reverse: true });');
    }
    
    if (!results.geoJsonCompliant && results.d3Compatible) {
      console.log('GeoJSON仕様準拠修正:');
      console.log('  const corrected = rewind(geojson);');
    }
  }
}

// メイン実行
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('使用方法: node check-geojson-winding.js <geojson-file>');
    console.error('例: node check-geojson-winding.js examples/geojson/sample.geojson');
    console.error('');
    console.error('このスクリプトは以下をチェックします:');
    console.error('- GeoJSON仕様（RFC7946）準拠');
    console.error('- D3.js互換性');
    console.error('- ワインディング順序の詳細');
    process.exit(1);
  }
  
  const filePath = args[0];
  
  if (!fs.existsSync(filePath)) {
    console.error(`エラー: ファイルが見つかりません: ${filePath}`);
    process.exit(1);
  }
  
  try {
    const results = analyzeGeoJSON(filePath);
    displayResults(results);
    
    // 終了コード（D3互換性を基準）
    process.exit(results.d3Compatible ? 0 : 1);
  } catch (error) {
    console.error(`エラー: ${error.message}`);
    process.exit(1);
  }
}

// コマンドラインから実行された場合のみmain関数を実行
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { analyzeGeoJSON, getWindingOrder, calculateSignedArea };