/**
 * COG (Cloud Optimized GeoTIFF) 関連のユーティリティ関数
 * GeoTIFFファイルの読み込みと処理に特化したユーティリティ集
 */

import { fromUrl, GeoTIFF, Pool } from 'geotiff';

/**
 * COG読み込みオプション
 */
export interface ReadCOGOptions {
  /** リサンプリング方法 */
  resampleMethod?: 'nearest' | 'bilinear';
  
  /** 画像インデックス（デフォルト: 0） */
  imageIndex?: number;
  
  /** 読み込むバンド（デフォルト: [0, 1, 2]でRGB） */
  samples?: number[];
  
  /** デコード用のワーカープール */
  pool?: Pool;
  
  /** サイズ制限設定 */
  sizeLimit?: {
    /** 最大幅（デフォルト: 512） */
    maxWidth?: number;
    /** 最大高さ（デフォルト: 512） */
    maxHeight?: number;
    /** 制限を超えた場合の処理（デフォルト: 'resample'） */
    onExceed?: 'error' | 'resample';
  };
  
  /** 出力解像度（リサンプリング時に使用） */
  outputWidth?: number;
  outputHeight?: number;
  
  /** 地理的境界（AOI）[west, south, east, north] */
  bbox?: [number, number, number, number];
}

/**
 * COG読み込み結果
 */
export interface ReadCOGResult {
  /** Data URI形式の画像 */
  dataUri: string;
  /** 地理的境界 [west, south, east, north] */
  bounds: [number, number, number, number];
  /** 実際の出力画像の幅 */
  width: number;
  /** 実際の出力画像の高さ */
  height: number;
  /** 元画像の幅 */
  originalWidth: number;
  /** 元画像の高さ */
  originalHeight: number;
  /** リサンプリングされたかどうか */
  wasResampled: boolean;
}

/**
 * Cloud Optimized GeoTIFF（COG）ファイルを読み込み、ImageLayerで使用可能な形式に変換します
 * @param url - COGファイルのURL
 * @param options - 読み込みオプション
 * @returns 読み込み結果
 */
export async function readCOG(url: string, options: ReadCOGOptions = {}): Promise<ReadCOGResult> {
  // デフォルト値を設定
  const {
    resampleMethod = 'nearest',
    imageIndex = 0,
    samples = [0, 1, 2],
    pool,
    sizeLimit = {
      maxWidth: 512,
      maxHeight: 512,
      onExceed: 'resample'
    },
    outputWidth,
    outputHeight,
    bbox
  } = options;

  const maxWidth = sizeLimit.maxWidth ?? 512;
  const maxHeight = sizeLimit.maxHeight ?? 512;
  const onExceed = sizeLimit.onExceed ?? 'resample';

  try {
    // GeoTIFFファイルを読み込み
    const tiff = await fromUrl(url);
    
    // 利用可能な画像数を確認
    const imageCount = await tiff.getImageCount();
    
    // インデックスが範囲外の場合はエラー
    if (imageIndex >= imageCount) {
      throw new Error(`画像インデックス ${imageIndex} は範囲外です。利用可能なインデックス: 0-${imageCount - 1}`);
    }
    
    const image = await tiff.getImage(imageIndex);

    // 元画像のサイズを取得
    const originalWidth = image.getWidth();
    const originalHeight = image.getHeight();

    // 地理的境界を取得（オーバービュー画像の場合はメイン画像から取得）
    let imgBbox: number[];
    let bounds: [number, number, number, number];
    
    try {
      imgBbox = image.getBoundingBox();
      bounds = [imgBbox[0], imgBbox[1], imgBbox[2], imgBbox[3]];
    } catch (error) {
      // オーバービュー画像に地理情報がない場合、メイン画像（インデックス0）から取得
      const mainImage = await tiff.getImage(0);
      imgBbox = mainImage.getBoundingBox();
      bounds = [imgBbox[0], imgBbox[1], imgBbox[2], imgBbox[3]];
    }

    // 出力サイズを決定
    let targetWidth = outputWidth ?? originalWidth;
    let targetHeight = outputHeight ?? originalHeight;
    let wasResampled = false;

    // サイズ制限チェック
    if (targetWidth > maxWidth || targetHeight > maxHeight) {
      if (onExceed === 'error') {
        throw new Error(
          `画像サイズ（${originalWidth}x${originalHeight}）が制限（${maxWidth}x${maxHeight}）を超えています`
        );
      }

      // アスペクト比を維持してリサンプリング
      const aspectRatio = originalWidth / originalHeight;
      if (targetWidth / targetHeight > aspectRatio) {
        targetHeight = maxHeight;
        targetWidth = Math.floor(targetHeight * aspectRatio);
      } else {
        targetWidth = maxWidth;
        targetHeight = Math.floor(targetWidth / aspectRatio);
      }
      wasResampled = true;
    }

    // 明示的な出力サイズが指定されている場合
    if (outputWidth || outputHeight) {
      wasResampled = true;
    }

    // 画像データを読み込み
    const readOptions: any = {
      samples,
      pool,
      interleave: true
    };

    // AOI（bbox）が指定されている場合
    if (bbox) {
      // 地理的境界をピクセル座標に変換
      const [west, south, east, north] = bbox;
      const [imgWest, imgSouth, imgEast, imgNorth] = imgBbox;
      
      // 地理座標をピクセル座標に変換
      const pixelLeft = Math.floor((west - imgWest) / (imgEast - imgWest) * originalWidth);
      const pixelRight = Math.ceil((east - imgWest) / (imgEast - imgWest) * originalWidth);
      const pixelTop = Math.floor((imgNorth - north) / (imgNorth - imgSouth) * originalHeight);
      const pixelBottom = Math.ceil((imgNorth - south) / (imgNorth - imgSouth) * originalHeight);
      
      // ピクセル座標を画像範囲内にクリップ
      readOptions.window = [
        Math.max(0, pixelLeft),
        Math.max(0, pixelTop),
        Math.min(originalWidth, pixelRight),
        Math.min(originalHeight, pixelBottom)
      ];
      
      // windowのサイズを更新
      targetWidth = readOptions.window[2] - readOptions.window[0];
      targetHeight = readOptions.window[3] - readOptions.window[1];
      
      // 実際の地理的境界を更新
      const actualWest = imgWest + (readOptions.window[0] / originalWidth) * (imgEast - imgWest);
      const actualEast = imgWest + (readOptions.window[2] / originalWidth) * (imgEast - imgWest);
      const actualNorth = imgNorth - (readOptions.window[1] / originalHeight) * (imgNorth - imgSouth);
      const actualSouth = imgNorth - (readOptions.window[3] / originalHeight) * (imgNorth - imgSouth);
      bounds = [actualWest, actualSouth, actualEast, actualNorth];
    }

    // リサンプリングが必要な場合
    if (wasResampled || (targetWidth > maxWidth || targetHeight > maxHeight)) {
      // アスペクト比を維持してサイズを調整
      const aspectRatio = targetWidth / targetHeight;
      if (targetWidth > maxWidth || targetHeight > maxHeight) {
        if (targetWidth / targetHeight > aspectRatio) {
          targetHeight = maxHeight;
          targetWidth = Math.floor(targetHeight * aspectRatio);
        } else {
          targetWidth = maxWidth;
          targetHeight = Math.floor(targetWidth / aspectRatio);
        }
        wasResampled = true;
      }
      
      readOptions.width = targetWidth;
      readOptions.height = targetHeight;
      readOptions.resampleMethod = resampleMethod;
    }

    let rasters;
    let width, height;
    
    try {
      rasters = await image.readRGB(readOptions);
      width = rasters.width;
      height = rasters.height;
    } catch (error) {
      // readRGBが失敗した場合、readRastersで代替
      rasters = await image.readRasters(readOptions);
      width = rasters.width;
      height = rasters.height;
      
      // RGBデータでない場合は最初の3つのバンドを使用
      if (Array.isArray(rasters)) {
        // 複数バンドの場合、最初の3バンドを結合
        const bandCount = Math.min(3, rasters.length);
        const pixelCount = width * height;
        const combinedData = new Uint8Array(pixelCount * 3);
        
        for (let i = 0; i < pixelCount; i++) {
          for (let band = 0; band < bandCount; band++) {
            combinedData[i * 3 + band] = rasters[band][i] || 0;
          }
          // 足りないバンドは0で埋める
          for (let band = bandCount; band < 3; band++) {
            combinedData[i * 3 + band] = 0;
          }
        }
        rasters = combinedData;
      }
    }

    // Canvasに描画してData URIに変換
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas contextの取得に失敗しました');
    }

    // ImageDataを作成
    const imageData = ctx.createImageData(width, height);
    const data = imageData.data;

    // RGBデータをImageDataに変換
    const rastersArray = rasters as any as number[];
    const pixelCount = width * height;
    
    for (let i = 0; i < pixelCount; i++) {
      const canvasIdx = i * 4;
      const srcIdx = i * 3;
      
      // データが存在することを確認
      if (srcIdx + 2 < rastersArray.length) {
        data[canvasIdx] = rastersArray[srcIdx] || 0;       // R
        data[canvasIdx + 1] = rastersArray[srcIdx + 1] || 0; // G
        data[canvasIdx + 2] = rastersArray[srcIdx + 2] || 0; // B
      } else {
        // データが不足している場合はグレースケールまたは黒で埋める
        const value = rastersArray[i] || 0;
        data[canvasIdx] = value;     // R
        data[canvasIdx + 1] = value; // G
        data[canvasIdx + 2] = value; // B
      }
      data[canvasIdx + 3] = 255; // A
    }

    ctx.putImageData(imageData, 0, 0);
    const dataUri = canvas.toDataURL('image/png');

    return {
      dataUri,
      bounds,
      width,
      height,
      originalWidth,
      originalHeight,
      wasResampled
    };
  } catch (error) {
    throw new Error(`COGの読み込みに失敗しました: ${error instanceof Error ? error.message : String(error)}`);
  }
}