#!/usr/bin/env node
/**
 * GeoJSONワインディング順序修正スクリプト
 * 
 * Turf.jsを使用してGeoJSONのワインディング順序をD3.js対応に修正
 * 
 * 使用方法:
 * node scripts/fix-geojson-winding.js <geojson-file> [options]
 * 
 * オプション:
 * --d3         D3.js用に修正（外側リング：CW、内側リング：CCW）
 * --geojson    GeoJSON仕様準拠に修正（外側リング：CCW、内側リング：CW）
 * --backup     修正前のファイルをバックアップ（.bakファイルを作成）
 * --dry-run    実際の修正は行わず、変更内容のみ表示
 * 
 * 例:
 * node scripts/fix-geojson-winding.js examples/geojson/takasaki/bulding_single.geojson --d3 --backup
 */

import fs from 'fs';
import path from 'path';
import { rewind } from '@turf/rewind';

/**
 * ヘルプメッセージを表示
 */
function showHelp() {
  console.log(`
GeoJSONワインディング順序修正スクリプト

使用方法:
  node scripts/fix-geojson-winding.js <geojson-file> [options]

オプション:
  --d3         D3.js用に修正（外側リング：CW、内側リング：CCW）
  --geojson    GeoJSON仕様準拠に修正（外側リング：CCW、内側リング：CW）
  --backup     修正前のファイルをバックアップ（.bakファイルを作成）
  --dry-run    実際の修正は行わず、変更内容のみ表示
  --help       このヘルプを表示

例:
  # D3用に修正（デフォルト）
  node scripts/fix-geojson-winding.js file.geojson --d3

  # GeoJSON仕様準拠に修正
  node scripts/fix-geojson-winding.js file.geojson --geojson

  # バックアップ付きで修正
  node scripts/fix-geojson-winding.js file.geojson --d3 --backup

  # 変更内容のみ確認
  node scripts/fix-geojson-winding.js file.geojson --d3 --dry-run
`);
}

/**
 * ポリゴンの符号付き面積を計算
 * @param {Array} ring - 座標のリング
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
 * GeoJSONの変更前後の統計を取得
 * @param {Object} originalData - 元のGeoJSONデータ
 * @param {Object} fixedData - 修正後のGeoJSONデータ
 * @returns {Object} 統計情報
 */
function getChangeStats(originalData, fixedData) {
  const stats = {
    totalFeatures: 0,
    polygonFeatures: 0,
    changedFeatures: 0,
    rings: {
      total: 0,
      changed: 0,
      exteriorCW: { before: 0, after: 0 },
      exteriorCCW: { before: 0, after: 0 },
      holeCW: { before: 0, after: 0 },
      holeCCW: { before: 0, after: 0 }
    }
  };

  function analyzeFeatures(data, isOriginal = true) {
    let features = [];
    if (data.type === 'FeatureCollection') {
      features = data.features;
    } else if (data.type === 'Feature') {
      features = [data];
    } else if (data.geometry) {
      features = [{ geometry: data }];
    }

    if (isOriginal) {
      stats.totalFeatures = features.length;
    }

    features.forEach((feature, featureIndex) => {
      const geometry = feature.geometry;
      if (!geometry || (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon')) {
        return;
      }

      if (isOriginal) {
        stats.polygonFeatures++;
      }

      let coordinates;
      if (geometry.type === 'Polygon') {
        coordinates = [geometry.coordinates];
      } else {
        coordinates = geometry.coordinates;
      }

      coordinates.forEach(polygon => {
        polygon.forEach((ring, ringIndex) => {
          const windingOrder = getWindingOrder(ring);
          const isExterior = ringIndex === 0;

          if (isOriginal) {
            stats.rings.total++;
            if (isExterior) {
              if (windingOrder === 'CW') {
                stats.rings.exteriorCW.before++;
              } else {
                stats.rings.exteriorCCW.before++;
              }
            } else {
              if (windingOrder === 'CW') {
                stats.rings.holeCW.before++;
              } else {
                stats.rings.holeCCW.before++;
              }
            }
          } else {
            if (isExterior) {
              if (windingOrder === 'CW') {
                stats.rings.exteriorCW.after++;
              } else {
                stats.rings.exteriorCCW.after++;
              }
            } else {
              if (windingOrder === 'CW') {
                stats.rings.holeCW.after++;
              } else {
                stats.rings.holeCCW.after++;
              }
            }
          }
        });
      });
    });
  }

  analyzeFeatures(originalData, true);
  analyzeFeatures(fixedData, false);

  // 変更されたリングの数を計算
  stats.rings.changed = 
    Math.abs(stats.rings.exteriorCW.after - stats.rings.exteriorCW.before) +
    Math.abs(stats.rings.exteriorCCW.after - stats.rings.exteriorCCW.before) +
    Math.abs(stats.rings.holeCW.after - stats.rings.holeCW.before) +
    Math.abs(stats.rings.holeCCW.after - stats.rings.holeCCW.before);

  return stats;
}

/**
 * GeoJSONファイルを修正
 * @param {string} filePath - GeoJSONファイルパス
 * @param {Object} options - オプション
 * @returns {Promise<void>}
 */
async function fixGeoJSONFile(filePath, options) {
  try {
    // ファイル存在確認
    if (!fs.existsSync(filePath)) {
      throw new Error(`ファイルが見つかりません: ${filePath}`);
    }

    console.log(`処理開始: ${filePath}`);
    console.log(`修正モード: ${options.forD3 ? 'D3.js用' : 'GeoJSON仕様準拠'}`);

    // 元のデータを読み込み
    const originalData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Turf.jsで修正
    const fixedData = rewind(originalData, { 
      reverse: options.forD3,
      mutate: false 
    });

    // 変更統計を取得
    const stats = getChangeStats(originalData, fixedData);

    // 結果表示
    console.log('\n修正結果:');
    console.log(`総フィーチャー数: ${stats.totalFeatures} (ポリゴン: ${stats.polygonFeatures})`);
    console.log(`変更されたリング数: ${stats.rings.changed}/${stats.rings.total}`);
    
    if (stats.rings.changed > 0) {
      console.log('\nワインディング順序の変化:');
      console.log(`外側リング CW: ${stats.rings.exteriorCW.before} → ${stats.rings.exteriorCW.after}`);
      console.log(`外側リング CCW: ${stats.rings.exteriorCCW.before} → ${stats.rings.exteriorCCW.after}`);
      console.log(`穴 CW: ${stats.rings.holeCW.before} → ${stats.rings.holeCW.after}`);
      console.log(`穴 CCW: ${stats.rings.holeCCW.before} → ${stats.rings.holeCCW.after}`);
    } else {
      console.log('変更の必要はありませんでした。');
    }

    // Dry runの場合はここで終了
    if (options.dryRun) {
      console.log('\n[DRY RUN] 実際の修正は行いませんでした。');
      return;
    }

    // 変更がない場合は書き込みをスキップ
    if (stats.rings.changed === 0) {
      console.log('\n修正完了: 変更はありませんでした。');
      return;
    }

    // バックアップ作成
    if (options.backup) {
      const backupPath = filePath + '.bak';
      fs.copyFileSync(filePath, backupPath);
      console.log(`\nバックアップ作成: ${backupPath}`);
    }

    // 修正したデータを書き込み
    fs.writeFileSync(filePath, JSON.stringify(fixedData, null, 2), 'utf8');
    console.log(`\n修正完了: ${filePath}`);

  } catch (error) {
    console.error(`エラー: ${error.message}`);
    process.exit(1);
  }
}

// メイン実行
async function main() {
  const args = process.argv.slice(2);
  
  // ヘルプ表示
  if (args.includes('--help') || args.length === 0) {
    showHelp();
    process.exit(0);
  }

  // ファイルパス取得
  const filePath = args.find(arg => !arg.startsWith('--'));
  if (!filePath) {
    console.error('エラー: GeoJSONファイルパスが指定されていません。');
    showHelp();
    process.exit(1);
  }

  // オプション解析
  const options = {
    forD3: args.includes('--d3') || !args.includes('--geojson'), // デフォルトはD3用
    backup: args.includes('--backup'),
    dryRun: args.includes('--dry-run')
  };

  // Turf.jsの依存関係チェック
  try {
    await import('@turf/rewind');
  } catch (error) {
    console.error('エラー: @turf/rewind が見つかりません。');
    console.error('以下のコマンドでインストールしてください:');
    console.error('npm install @turf/rewind');
    process.exit(1);
  }

  await fixGeoJSONFile(filePath, options);
}

// コマンドラインから実行された場合のみmain関数を実行
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(`予期しないエラー: ${error.message}`);
    process.exit(1);
  });
}

export { fixGeoJSONFile, getChangeStats };