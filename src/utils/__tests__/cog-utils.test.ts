import { readCOG, type ReadCOGOptions, type ReadCOGResult } from '../cog-utils';
import { fromUrl } from 'geotiff';

// GeoTIFFライブラリのモック
const mockImage = {
  getWidth: jest.fn(),
  getHeight: jest.fn(),
  getBoundingBox: jest.fn(),
  readRGB: jest.fn(),
  readRasters: jest.fn()
};

const mockTiff = {
  getImageCount: jest.fn(),
  getImage: jest.fn()
};

// geotiffライブラリのモック（jest.config.jsのmoduleNameMapperで設定済み）
jest.mock('geotiff');

// Canvas API のモック
const mockCanvas = {
  width: 0,
  height: 0,
  getContext: jest.fn(),
  toDataURL: jest.fn()
};

const mockContext = {
  createImageData: jest.fn(),
  putImageData: jest.fn()
};

const mockImageData = {
  data: new Uint8ClampedArray(16) // 2x2のRGBA画像
};

// DOM APIのモック
Object.defineProperty(global, 'document', {
  value: {
    createElement: jest.fn(() => mockCanvas)
  }
});

describe('cog-utils', () => {
  beforeEach(() => {
    // モック関数をクリア
    jest.clearAllMocks();
    
    // デフォルトのモック動作を設定
    (fromUrl as jest.Mock).mockResolvedValue(mockTiff);
    mockTiff.getImageCount.mockResolvedValue(3);
    mockTiff.getImage.mockResolvedValue(mockImage);
    
    mockImage.getWidth.mockReturnValue(100);
    mockImage.getHeight.mockReturnValue(100);
    mockImage.getBoundingBox.mockReturnValue([0, 0, 10, 10]); // [west, south, east, north]
    
    // Canvas関連のモック
    mockCanvas.getContext.mockReturnValue(mockContext);
    mockContext.createImageData.mockReturnValue(mockImageData);
    mockCanvas.toDataURL.mockReturnValue('data:image/png;base64,test');
    
    // RGB読み込みの成功ケース
    mockImage.readRGB.mockResolvedValue({
      width: 2,
      height: 2,
      length: 12 // 2x2x3(RGB)
    });
  });

  describe('readCOG', () => {
    it('基本的なCOG読み込みが成功する', async () => {
      const url = 'test.tif';
      const result = await readCOG(url);
      
      expect(fromUrl).toHaveBeenCalledWith(url);
      expect(mockTiff.getImageCount).toHaveBeenCalled();
      expect(mockTiff.getImage).toHaveBeenCalledWith(0); // デフォルトのimageIndex
      expect(mockImage.getWidth).toHaveBeenCalled();
      expect(mockImage.getHeight).toHaveBeenCalled();
      expect(mockImage.getBoundingBox).toHaveBeenCalled();
      
      expect(result).toEqual({
        dataUri: 'data:image/png;base64,test',
        bounds: [0, 0, 10, 10],
        width: 2,
        height: 2,
        originalWidth: 100,
        originalHeight: 100,
        wasResampled: false
      });
    });

    it('カスタムimageIndexでCOGを読み込む', async () => {
      const url = 'test.tif';
      const options: ReadCOGOptions = {
        imageIndex: 1
      };
      
      await readCOG(url, options);
      
      expect(mockTiff.getImage).toHaveBeenCalledWith(1);
    });

    it('範囲外のimageIndexでエラーを投げる', async () => {
      const url = 'test.tif';
      const options: ReadCOGOptions = {
        imageIndex: 5 // 範囲外（利用可能: 0-2）
      };
      
      await expect(readCOG(url, options)).rejects.toThrow(
        '画像インデックス 5 は範囲外です。利用可能なインデックス: 0-2'
      );
    });

    it('サイズ制限によるリサンプリングが正しく動作する', async () => {
      // 大きな画像を設定
      mockImage.getWidth.mockReturnValue(1000);
      mockImage.getHeight.mockReturnValue(800);
      
      const url = 'large.tif';
      const options: ReadCOGOptions = {
        sizeLimit: {
          maxWidth: 256,
          maxHeight: 256,
          onExceed: 'resample'
        }
      };
      
      const result = await readCOG(url, options);
      
      expect(result.wasResampled).toBe(true);
      expect(result.originalWidth).toBe(1000);
      expect(result.originalHeight).toBe(800);
      
      // readRGBにリサンプリングオプションが渡されることを確認
      expect(mockImage.readRGB).toHaveBeenCalledWith(
        expect.objectContaining({
          width: expect.any(Number),
          height: expect.any(Number),
          resampleMethod: 'nearest'
        })
      );
    });

    it('サイズ制限でエラーモードが正しく動作する', async () => {
      // 大きな画像を設定
      mockImage.getWidth.mockReturnValue(1000);
      mockImage.getHeight.mockReturnValue(800);
      
      const url = 'large.tif';
      const options: ReadCOGOptions = {
        sizeLimit: {
          maxWidth: 256,
          maxHeight: 256,
          onExceed: 'error'
        }
      };
      
      await expect(readCOG(url, options)).rejects.toThrow(
        '画像サイズ（1000x800）が制限（256x256）を超えています'
      );
    });

    it('明示的な出力サイズが正しく適用される', async () => {
      const url = 'test.tif';
      const options: ReadCOGOptions = {
        outputWidth: 64,
        outputHeight: 64
      };
      
      const result = await readCOG(url, options);
      
      expect(result.wasResampled).toBe(true);
      expect(mockImage.readRGB).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 64,
          height: 64
        })
      );
    });

    it('bbox（AOI）が正しく適用される', async () => {
      const url = 'test.tif';
      const options: ReadCOGOptions = {
        bbox: [2, 2, 8, 8] // [west, south, east, north]
      };
      
      await readCOG(url, options);
      
      expect(mockImage.readRGB).toHaveBeenCalledWith(
        expect.objectContaining({
          window: expect.any(Array)
        })
      );
    });

    it('カスタムリサンプリング方法が適用される', async () => {
      const url = 'test.tif';
      const options: ReadCOGOptions = {
        resampleMethod: 'bilinear',
        outputWidth: 50,
        outputHeight: 50
      };
      
      await readCOG(url, options);
      
      expect(mockImage.readRGB).toHaveBeenCalledWith(
        expect.objectContaining({
          resampleMethod: 'bilinear'
        })
      );
    });

    it('カスタムサンプル（バンド）が適用される', async () => {
      const url = 'test.tif';
      const options: ReadCOGOptions = {
        samples: [0, 2, 4] // 特定のバンドを選択
      };
      
      await readCOG(url, options);
      
      expect(mockImage.readRGB).toHaveBeenCalledWith(
        expect.objectContaining({
          samples: [0, 2, 4]
        })
      );
    });

    it('readRGBが失敗した場合readRastersで代替する', async () => {
      // readRGBが失敗するように設定
      mockImage.readRGB.mockRejectedValue(new Error('RGB read failed'));
      
      // readRastersは成功するように設定
      const mockRasterData = [
        new Uint8Array([255, 128, 64, 32]), // Band 0
        new Uint8Array([200, 100, 50, 25]), // Band 1
        new Uint8Array([150, 75, 38, 19])   // Band 2
      ];
      mockImage.readRasters.mockResolvedValue(mockRasterData);
      mockImage.readRasters.mockReturnValue({
        ...mockRasterData,
        width: 2,
        height: 2
      });
      
      const url = 'test.tif';
      const result = await readCOG(url);
      
      expect(mockImage.readRGB).toHaveBeenCalled();
      expect(mockImage.readRasters).toHaveBeenCalled();
      expect(result.dataUri).toBe('data:image/png;base64,test');
    });

    it('地理情報がない画像でメイン画像から境界を取得する', async () => {
      // 最初のgetBoundingBoxは失敗
      mockImage.getBoundingBox.mockImplementationOnce(() => {
        throw new Error('No geo info');
      });
      
      // メイン画像（インデックス0）から境界を取得
      const mainImage = {
        ...mockImage,
        getBoundingBox: jest.fn().mockReturnValue([-180, -90, 180, 90])
      };
      mockTiff.getImage.mockImplementation((index) => {
        if (index === 0) return mainImage;
        return mockImage;
      });
      
      const url = 'test.tif';
      const options: ReadCOGOptions = {
        imageIndex: 1 // オーバービュー画像
      };
      
      const result = await readCOG(url, options);
      
      expect(result.bounds).toEqual([-180, -90, 180, 90]);
    });

    it('Canvas contextの取得に失敗した場合エラーを投げる', async () => {
      mockCanvas.getContext.mockReturnValue(null);
      
      const url = 'test.tif';
      
      await expect(readCOG(url)).rejects.toThrow(
        'Canvas contextの取得に失敗しました'
      );
    });

    it('COG読み込み全体でエラーが発生した場合適切なエラーメッセージを返す', async () => {
      (fromUrl as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      const url = 'invalid.tif';
      
      await expect(readCOG(url)).rejects.toThrow(
        'COGの読み込みに失敗しました: Network error'
      );
    });

    it('非Errorオブジェクトの例外を適切に処理する', async () => {
      (fromUrl as jest.Mock).mockRejectedValue('String error');
      
      const url = 'invalid.tif';
      
      await expect(readCOG(url)).rejects.toThrow(
        'COGの読み込みに失敗しました: String error'
      );
    });

    it('readRastersが複数バンドデータを返す場合正しく結合する', async () => {
      // readRGBが失敗
      mockImage.readRGB.mockRejectedValue(new Error('RGB read failed'));
      
      // 複数バンドのラスターデータ
      const mockRasterData = [
        new Uint8Array([255, 128, 64, 32]), // Band 0 (Red)
        new Uint8Array([200, 100, 50, 25]), // Band 1 (Green)
        new Uint8Array([150, 75, 38, 19])   // Band 2 (Blue)
      ];
      
      // readRastersのモック設定を修正
      mockImage.readRasters.mockResolvedValue(mockRasterData);
      Object.defineProperty(mockRasterData, 'width', { value: 2 });
      Object.defineProperty(mockRasterData, 'height', { value: 2 });
      
      const url = 'test.tif';
      const result = await readCOG(url);
      
      expect(mockImage.readRasters).toHaveBeenCalled();
      expect(result.width).toBe(2);
      expect(result.height).toBe(2);
    });

    it('デフォルトオプションが正しく適用される', async () => {
      const url = 'test.tif';
      
      await readCOG(url);
      
      expect(mockImage.readRGB).toHaveBeenCalledWith(
        expect.objectContaining({
          samples: [0, 1, 2], // デフォルト
          interleave: true
        })
      );
    });
  });
});