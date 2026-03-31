/**
 * COG (Cloud Optimized GeoTIFF) からデータを取得してPNGとして保存するスクリプト
 *
 * 使用例:
 *   node cog-to-png.mjs <COG_URL> [options]
 *   node cog-to-png.mjs -p natural-earth [options]
 *
 * オプション:
 *   -p, --preset <name>       プリセット名（--list-presetsで一覧表示）
 *   --list-presets             利用可能なプリセット一覧を表示
 *   -o, --output <path>       出力ファイルパス（デフォルト: output.png）
 *   -w, --width <number>      出力幅（デフォルト: 元画像のサイズ、最大512）
 *   -h, --height <number>     出力高さ（デフォルト: 元画像のサイズ、最大512）
 *   --max-width <number>      最大幅（デフォルト: 1024）
 *   --max-height <number>     最大高さ（デフォルト: 1024）
 *   -i, --image-index <number> 画像インデックス（デフォルト: 0）
 *   -s, --samples <numbers>   バンド指定（カンマ区切り、デフォルト: 0,1,2）
 *   -b, --bbox <coords>       地理的境界（west,south,east,north）
 *   --info                    画像情報のみ表示（PNGを保存しない）
 */

import { fromUrl } from 'geotiff';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

// ---------- プリセット定義 ----------
// 新しいプリセットはここに追加してください

const PRESETS = {
  'natural-earth': {
    description: 'Natural Earth I（陰影起伏付き地形図）',
    url: 'https://storage.googleapis.com/g3-open-resource/d3-thematika/cog/NE1_HR_SR_OB_DRv6_COG.tif',
  },
  'natural-earth-gray-dark': {
    description: 'Natural Earth I グレースケール（暗色背景）',
    url: 'https://storage.googleapis.com/g3-open-resource/d3-thematika/cog/NE1__GRAY_HR_DARK_OB_DR_COG.tif',
  },
  'natural-earth-gray-light': {
    description: 'Natural Earth I グレースケール（明色背景）',
    url: 'https://storage.googleapis.com/g3-open-resource/d3-thematika/cog/NE1_GRAY_HR_LIGHT_OB_DR_COG.tif',
  },
};

// ---------- CLI引数パース ----------

function parseArgs(argv) {
  const args = argv.slice(2);
  const options = {
    url: null,
    preset: null,
    output: 'output.png',
    width: null,
    height: null,
    maxWidth: 1024,
    maxHeight: 1024,
    imageIndex: 0,
    samples: [0, 1, 2],
    bbox: null,
    infoOnly: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '-o':
      case '--output':
        options.output = args[++i];
        break;
      case '-w':
      case '--width':
        options.width = parseInt(args[++i], 10);
        break;
      case '-h':
      case '--height':
        options.height = parseInt(args[++i], 10);
        break;
      case '--max-width':
        options.maxWidth = parseInt(args[++i], 10);
        break;
      case '--max-height':
        options.maxHeight = parseInt(args[++i], 10);
        break;
      case '-i':
      case '--image-index':
        options.imageIndex = parseInt(args[++i], 10);
        break;
      case '-s':
      case '--samples':
        options.samples = args[++i].split(',').map(Number);
        break;
      case '-b':
      case '--bbox':
        options.bbox = args[++i].split(',').map(Number);
        if (options.bbox.length !== 4) {
          console.error('エラー: bboxは4つの数値（west,south,east,north）で指定してください');
          process.exit(1);
        }
        break;
      case '--info':
        options.infoOnly = true;
        break;
      case '-p':
      case '--preset':
        options.preset = args[++i];
        break;
      case '--list-presets':
        listPresets();
        process.exit(0);
        break;
      default:
        if (!arg.startsWith('-') && !options.url) {
          options.url = arg;
        } else {
          console.error(`不明なオプション: ${arg}`);
          process.exit(1);
        }
    }
  }

  // プリセットからURLを解決
  if (options.preset) {
    const preset = PRESETS[options.preset];
    if (!preset) {
      console.error(`エラー: 不明なプリセット "${options.preset}"`);
      console.error('利用可能なプリセット:');
      for (const [name, p] of Object.entries(PRESETS)) {
        console.error(`  ${name} — ${p.description}`);
      }
      process.exit(1);
    }
    // URLが未指定の場合のみプリセットのURLを使用（明示的なURLが優先）
    if (!options.url) {
      options.url = preset.url;
    }
  }

  if (!options.url) {
    console.error('使用法: node cog-to-png.mjs <COG_URL> [options]');
    console.error('        node cog-to-png.mjs -p <preset> [options]');
    console.error('');
    console.error('オプション:');
    console.error('  -p, --preset <name>        プリセット名（--list-presetsで一覧表示）');
    console.error('  --list-presets             利用可能なプリセット一覧を表示');
    console.error('  -o, --output <path>        出力ファイルパス（デフォルト: output.png）');
    console.error('  -w, --width <number>       出力幅');
    console.error('  -h, --height <number>      出力高さ');
    console.error('  --max-width <number>       最大幅（デフォルト: 1024）');
    console.error('  --max-height <number>      最大高さ（デフォルト: 1024）');
    console.error('  -i, --image-index <number> 画像インデックス（デフォルト: 0）');
    console.error('  -s, --samples <numbers>    バンド指定（カンマ区切り、デフォルト: 0,1,2）');
    console.error('  -b, --bbox <coords>        地理的境界（west,south,east,north）');
    console.error('  --info                     画像情報のみ表示');
    process.exit(1);
  }

  return options;
}

function listPresets() {
  console.log('利用可能なプリセット:');
  console.log('');
  for (const [name, preset] of Object.entries(PRESETS)) {
    console.log(`  ${name}`);
    console.log(`    ${preset.description}`);
    console.log(`    ${preset.url}`);
    console.log('');
  }
}

// ---------- メイン処理 ----------

async function main() {
  const options = parseArgs(process.argv);

  console.log(`COGを読み込み中: ${options.url}`);

  // GeoTIFFファイルを読み込み
  const tiff = await fromUrl(options.url);
  const imageCount = await tiff.getImageCount();

  if (options.imageIndex >= imageCount) {
    console.error(`エラー: 画像インデックス ${options.imageIndex} は範囲外です（利用可能: 0-${imageCount - 1}）`);
    process.exit(1);
  }

  const image = await tiff.getImage(options.imageIndex);

  const originalWidth = image.getWidth();
  const originalHeight = image.getHeight();

  // 地理的境界を取得
  let imgBbox;
  try {
    imgBbox = image.getBoundingBox();
  } catch {
    const mainImage = await tiff.getImage(0);
    imgBbox = mainImage.getBoundingBox();
  }
  const bounds = [imgBbox[0], imgBbox[1], imgBbox[2], imgBbox[3]];

  // --info モード
  if (options.infoOnly) {
    console.log('--- 画像情報 ---');
    console.log(`画像数: ${imageCount}`);
    console.log(`サイズ: ${originalWidth} x ${originalHeight}`);
    console.log(`境界: [${bounds.join(', ')}]`);
    console.log(`バンド数: ${image.getSamplesPerPixel()}`);
    console.log(`解像度: ${image.getResolution()}`);
    console.log(`タイルサイズ: ${image.getTileWidth()} x ${image.getTileHeight()}`);
    return;
  }

  // 出力サイズを決定
  let targetWidth = options.width ?? originalWidth;
  let targetHeight = options.height ?? originalHeight;
  let wasResampled = false;

  // サイズ制限チェック（アスペクト比を維持）
  if (targetWidth > options.maxWidth || targetHeight > options.maxHeight) {
    const aspectRatio = originalWidth / originalHeight;
    if (targetWidth / targetHeight > aspectRatio) {
      targetHeight = options.maxHeight;
      targetWidth = Math.floor(targetHeight * aspectRatio);
    } else {
      targetWidth = options.maxWidth;
      targetHeight = Math.floor(targetWidth / aspectRatio);
    }
    wasResampled = true;
  }

  if (options.width || options.height) {
    wasResampled = true;
  }

  // 読み込みオプションを構築
  const readOptions = {
    samples: options.samples,
    interleave: true,
  };

  // AOI（bbox）が指定されている場合
  if (options.bbox) {
    const [west, south, east, north] = options.bbox;
    const [imgWest, imgSouth, imgEast, imgNorth] = imgBbox;

    const pixelLeft = Math.floor((west - imgWest) / (imgEast - imgWest) * originalWidth);
    const pixelRight = Math.ceil((east - imgWest) / (imgEast - imgWest) * originalWidth);
    const pixelTop = Math.floor((imgNorth - north) / (imgNorth - imgSouth) * originalHeight);
    const pixelBottom = Math.ceil((imgNorth - south) / (imgNorth - imgSouth) * originalHeight);

    readOptions.window = [
      Math.max(0, pixelLeft),
      Math.max(0, pixelTop),
      Math.min(originalWidth, pixelRight),
      Math.min(originalHeight, pixelBottom),
    ];

    targetWidth = readOptions.window[2] - readOptions.window[0];
    targetHeight = readOptions.window[3] - readOptions.window[1];

    // 実際の地理的境界を更新
    const actualWest = imgWest + (readOptions.window[0] / originalWidth) * (imgEast - imgWest);
    const actualEast = imgWest + (readOptions.window[2] / originalWidth) * (imgEast - imgWest);
    const actualNorth = imgNorth - (readOptions.window[1] / originalHeight) * (imgNorth - imgSouth);
    const actualSouth = imgNorth - (readOptions.window[3] / originalHeight) * (imgNorth - imgSouth);
    bounds[0] = actualWest;
    bounds[1] = actualSouth;
    bounds[2] = actualEast;
    bounds[3] = actualNorth;

    // サイズ制限の再チェック
    if (targetWidth > options.maxWidth || targetHeight > options.maxHeight) {
      const aspectRatio = targetWidth / targetHeight;
      if (targetWidth / targetHeight > aspectRatio) {
        targetHeight = options.maxHeight;
        targetWidth = Math.floor(targetHeight * aspectRatio);
      } else {
        targetWidth = options.maxWidth;
        targetHeight = Math.floor(targetWidth / aspectRatio);
      }
      wasResampled = true;
    }
  }

  // リサンプリングが必要な場合
  if (wasResampled) {
    readOptions.width = targetWidth;
    readOptions.height = targetHeight;
    readOptions.resampleMethod = 'nearest';
  }

  console.log(`読み込みサイズ: ${targetWidth} x ${targetHeight}${wasResampled ? '（リサンプリング）' : ''}`);

  // 画像データを読み込み
  let rasters;
  let width, height;

  try {
    rasters = await image.readRGB(readOptions);
    width = rasters.width;
    height = rasters.height;
  } catch {
    rasters = await image.readRasters(readOptions);
    width = rasters.width;
    height = rasters.height;

    if (Array.isArray(rasters)) {
      const bandCount = Math.min(3, rasters.length);
      const pixelCount = width * height;
      const combinedData = new Uint8Array(pixelCount * 3);

      for (let i = 0; i < pixelCount; i++) {
        for (let band = 0; band < bandCount; band++) {
          combinedData[i * 3 + band] = rasters[band][i] || 0;
        }
        for (let band = bandCount; band < 3; band++) {
          combinedData[i * 3 + band] = 0;
        }
      }
      rasters = combinedData;
    }
  }

  // RGB → RGBA変換
  const rastersArray = rasters;
  const pixelCount = width * height;
  const rgbaData = Buffer.alloc(pixelCount * 4);

  for (let i = 0; i < pixelCount; i++) {
    const rgbaIdx = i * 4;
    const srcIdx = i * 3;

    if (srcIdx + 2 < rastersArray.length) {
      rgbaData[rgbaIdx] = rastersArray[srcIdx] || 0;
      rgbaData[rgbaIdx + 1] = rastersArray[srcIdx + 1] || 0;
      rgbaData[rgbaIdx + 2] = rastersArray[srcIdx + 2] || 0;
    } else {
      const value = rastersArray[i] || 0;
      rgbaData[rgbaIdx] = value;
      rgbaData[rgbaIdx + 1] = value;
      rgbaData[rgbaIdx + 2] = value;
    }
    rgbaData[rgbaIdx + 3] = 255;
  }

  // sharpでPNG保存
  const outputPath = path.resolve(options.output);
  await sharp(rgbaData, {
    raw: {
      width,
      height,
      channels: 4,
    },
  })
    .png()
    .toFile(outputPath);

  console.log(`保存完了: ${outputPath}`);
  console.log(`出力サイズ: ${width} x ${height}`);
  console.log(`元画像サイズ: ${originalWidth} x ${originalHeight}`);
  console.log(`境界: [${bounds.join(', ')}]`);
}

main().catch((error) => {
  console.error(`エラー: ${error.message}`);
  process.exit(1);
});
