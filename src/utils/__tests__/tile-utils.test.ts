import {
  getTileXYZ,
  getTileBounds,
  generateTileUrls,
  calculateOptimalZoom,
  getResolution,
  isValidTileCoordinate
} from '../tile-utils';
import { TileGenerationOptions } from '../../types';

describe('tile-utils', () => {
  describe('getTileXYZ', () => {
    it('基本的な座標変換を正しく実行する', () => {
      // 赤道・本初子午線
      expect(getTileXYZ(0, 0, 0)).toEqual({ x: 0, y: 0, z: 0 });
      expect(getTileXYZ(0, 0, 1)).toEqual({ x: 1, y: 1, z: 1 });
      
      // 日本付近
      const tokyo = getTileXYZ(139.6917, 35.6895, 8);
      expect(tokyo.x).toBe(227);
      expect(tokyo.y).toBe(100);
      expect(tokyo.z).toBe(8);
    });

    it('ズームレベル0で世界全体が1タイルになる', () => {
      // 世界の各地がすべて(0,0,0)タイルに含まれる
      expect(getTileXYZ(-179.99, 85, 0)).toEqual({ x: 0, y: 0, z: 0 });
      expect(getTileXYZ(179.99, -85, 0)).toEqual({ x: 0, y: 0, z: 0 });
      expect(getTileXYZ(0, 0, 0)).toEqual({ x: 0, y: 0, z: 0 });
    });

    it('経度180度でタイルX座標が折り返す', () => {
      // 180度近辺での境界テスト
      expect(getTileXYZ(-180, 0, 1)).toEqual({ x: 0, y: 1, z: 1 });
      expect(getTileXYZ(180, 0, 1)).toEqual({ x: 2, y: 1, z: 1 }); // 180度は次のタイルになる
      expect(getTileXYZ(179.99, 0, 1)).toEqual({ x: 1, y: 1, z: 1 });
    });

    it('d3-tileと同じ結果を返すことを確認する', () => {
      // d3-tileライブラリの期待値と比較
      // Web Mercator投影法でのタイル座標計算
      
      // ズーム1でのテスト（世界を4分割）
      expect(getTileXYZ(-90, 0, 1)).toEqual({ x: 0, y: 1, z: 1 }); // 西半球
      expect(getTileXYZ(90, 0, 1)).toEqual({ x: 1, y: 1, z: 1 });  // 東半球
      
      // ズーム2でのテスト（世界を16分割）
      expect(getTileXYZ(0, 0, 2)).toEqual({ x: 2, y: 2, z: 2 });
      expect(getTileXYZ(-90, 45, 2)).toEqual({ x: 1, y: 1, z: 2 });
      expect(getTileXYZ(90, -45, 2)).toEqual({ x: 3, y: 2, z: 2 });
    });

    it('無効な経度でエラーを投げる', () => {
      expect(() => getTileXYZ(-181, 35, 10)).toThrow('経度は-180から180の範囲で指定してください');
      expect(() => getTileXYZ(181, 35, 10)).toThrow('経度は-180から180の範囲で指定してください');
    });

    it('Web Mercator範囲外の緯度でエラーを投げる', () => {
      expect(() => getTileXYZ(139, -86, 10)).toThrow('緯度はWeb Mercator投影法の有効範囲');
      expect(() => getTileXYZ(139, 86, 10)).toThrow('緯度はWeb Mercator投影法の有効範囲');
    });

    it('無効なズームレベルでエラーを投げる', () => {
      expect(() => getTileXYZ(139, 35, -1)).toThrow('ズームレベルは0から30の範囲で指定してください');
      expect(() => getTileXYZ(139, 35, 31)).toThrow('ズームレベルは0から30の範囲で指定してください');
    });

    it('非数値の入力でエラーを投げる', () => {
      expect(() => getTileXYZ(NaN, 35, 10)).toThrow('無効な座標またはズームレベルが指定されました');
      expect(() => getTileXYZ(139, Infinity, 10)).toThrow('無効な座標またはズームレベルが指定されました');
      expect(() => getTileXYZ(139, 35, NaN)).toThrow('無効な座標またはズームレベルが指定されました');
    });
  });

  describe('getTileBounds', () => {
    it('ズーム0で世界全体の境界を返す', () => {
      const bounds = getTileBounds(0, 0, 0);
      
      expect(bounds.west).toBe(-180);
      expect(bounds.east).toBe(180);
      expect(bounds.south).toBeCloseTo(-85.051, 2); // Web Mercator限界
      expect(bounds.north).toBeCloseTo(85.051, 2);   // Web Mercator限界
      expect(bounds.bounds).toEqual([bounds.west, bounds.south, bounds.east, bounds.north]);
    });

    it('ズーム1で正しい4分割された境界を返す', () => {
      // 左上タイル (0,0,1)
      const nw = getTileBounds(0, 0, 1);
      expect(nw.west).toBe(-180);
      expect(nw.east).toBe(0);
      expect(nw.north).toBeCloseTo(85.051, 2);
      expect(nw.south).toBeCloseTo(0, 5);
      
      // 右下タイル (1,1,1)
      const se = getTileBounds(1, 1, 1);
      expect(se.west).toBe(0);
      expect(se.east).toBe(180);
      expect(se.north).toBeCloseTo(0, 5);
      expect(se.south).toBeCloseTo(-85.051, 2);
    });

    it('タイル境界の一貫性を確認する', () => {
      // 隣接タイルの境界が連続していることを確認
      const tile1 = getTileBounds(5, 3, 4);
      const tile2 = getTileBounds(6, 3, 4); // 右隣のタイル
      const tile3 = getTileBounds(5, 4, 4); // 下隣のタイル
      
      // 横の境界が連続
      expect(tile1.east).toBeCloseTo(tile2.west, 10);
      // 縦の境界が連続
      expect(tile1.south).toBeCloseTo(tile3.north, 10);
    });

    it('高ズームレベルでの精度を確認する', () => {
      const bounds = getTileBounds(524288, 348364, 20); // ズーム20の東京付近
      
      // 境界の幅が小さいことを確認
      const widthDegrees = bounds.east - bounds.west;
      const heightDegrees = bounds.north - bounds.south;
      
      expect(widthDegrees).toBeLessThan(0.001);
      expect(heightDegrees).toBeLessThan(0.001);
    });

    it('無効なタイル座標でエラーを投げる', () => {
      expect(() => getTileBounds(1.5, 100, 10)).toThrow('タイル座標は整数で指定してください');
      expect(() => getTileBounds(100, 1.5, 10)).toThrow('タイル座標は整数で指定してください');
      expect(() => getTileBounds(100, 100, 1.5)).toThrow('タイル座標は整数で指定してください');
    });

    it('範囲外のタイル座標でエラーを投げる', () => {
      expect(() => getTileBounds(-1, 0, 5)).toThrow('タイル座標がズームレベル5の有効範囲外です');
      expect(() => getTileBounds(32, 0, 5)).toThrow('タイル座標がズームレベル5の有効範囲外です');
      expect(() => getTileBounds(0, 32, 5)).toThrow('タイル座標がズームレベル5の有効範囲外です');
    });

    it('無効なズームレベルでエラーを投げる', () => {
      expect(() => getTileBounds(0, 0, -1)).toThrow('ズームレベルは0から30の範囲で指定してください');
      expect(() => getTileBounds(0, 0, 31)).toThrow('ズームレベルは0から30の範囲で指定してください');
    });
  });

  describe('generateTileUrls', () => {
    const defaultOptions: TileGenerationOptions = {
      urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
    };

    it('指定範囲のタイルURLを生成する', () => {
      const bounds: [number, number, number, number] = [139.0, 35.0, 140.0, 36.0];
      const tiles = generateTileUrls(bounds, 8, defaultOptions);
      
      expect(tiles.length).toBeGreaterThan(0);
      tiles.forEach(tile => {
        expect(tile.url).toMatch(/https:\/\/tile\.openstreetmap\.org\/8\/\d+\/\d+\.png/);
        expect(tile.coordinate.z).toBe(8);
        expect(tile.bounds).toBeDefined();
      });
    });

    it('小さな範囲で正確な数のタイルを生成する', () => {
      // 1つのタイルに収まる小さな範囲
      const bounds: [number, number, number, number] = [139.65, 35.67, 139.75, 35.75];
      const tiles = generateTileUrls(bounds, 10, defaultOptions);
      
      expect(tiles.length).toBeGreaterThanOrEqual(1);
      expect(tiles.length).toBeLessThanOrEqual(4); // 最大4タイル（2x2）
    });

    it('URLテンプレートが正しく置換される', () => {
      const bounds: [number, number, number, number] = [139.0, 35.0, 140.0, 36.0];
      const customTemplate = 'https://example.com/tiles/{z}/{x}/{y}.jpg';
      const tiles = generateTileUrls(bounds, 5, {
        urlTemplate: customTemplate
      });
      
      tiles.forEach(tile => {
        expect(tile.url).toMatch(/https:\/\/example\.com\/tiles\/5\/\d+\/\d+\.jpg/);
        expect(tile.url).not.toContain('{');
        expect(tile.url).not.toContain('}');
      });
    });

    it('clampToBounds オプションが正しく動作する', () => {
      const bounds: [number, number, number, number] = [139.0, 35.0, 140.0, 36.0];
      
      // clamp有効
      const tilesWithClamp = generateTileUrls(bounds, 8, {
        ...defaultOptions,
        clampToBounds: true
      });
      
      // clamp無効
      const tilesWithoutClamp = generateTileUrls(bounds, 8, {
        ...defaultOptions,
        clampToBounds: false
      });
      
      // clamp無効の方が多くのタイルが含まれるはず
      expect(tilesWithoutClamp.length).toBeGreaterThanOrEqual(tilesWithClamp.length);
    });

    it('ズームレベル制限が適用される', () => {
      const bounds: [number, number, number, number] = [139.0, 35.0, 140.0, 36.0];
      const options: TileGenerationOptions = {
        ...defaultOptions,
        minZoom: 5,
        maxZoom: 15
      };
      
      expect(() => generateTileUrls(bounds, 4, options)).toThrow('ズームレベル4は許可範囲（5〜15）外です');
      expect(() => generateTileUrls(bounds, 16, options)).toThrow('ズームレベル16は許可範囲（5〜15）外です');
    });

    it('無効なboundsでエラーを投げる', () => {
      const options = defaultOptions;
      
      expect(() => generateTileUrls([140, 35, 139, 36], 10, options)).toThrow('無効な境界が指定されました');
      expect(() => generateTileUrls([139, 36, 140, 35], 10, options)).toThrow('無効な境界が指定されました');
      expect(() => generateTileUrls([NaN, 35, 140, 36], 10, options)).toThrow('boundsの値は有効な数値で指定してください');
    });

    it('無効なURLテンプレートでエラーを投げる', () => {
      const bounds: [number, number, number, number] = [139.0, 35.0, 140.0, 36.0];
      
      expect(() => generateTileUrls(bounds, 10, { urlTemplate: 'https://example.com/tile.png' }))
        .toThrow('URLテンプレートには{x}, {y}, {z}のプレースホルダーを含める必要があります');
      
      expect(() => generateTileUrls(bounds, 10, { urlTemplate: 'https://example.com/{x}/{y}.png' }))
        .toThrow('URLテンプレートには{x}, {y}, {z}のプレースホルダーを含める必要があります');
    });

    it('世界全体の範囲でも正常に動作する', () => {
      const worldBounds: [number, number, number, number] = [-180, -85, 180, 85];
      const tiles = generateTileUrls(worldBounds, 2, defaultOptions);
      
      expect(tiles.length).toBe(16); // 2^2 * 2^2 = 16タイル
      
      // 全てのタイルがユニークであることを確認
      const urls = tiles.map(t => t.url);
      const uniqueUrls = new Set(urls);
      expect(uniqueUrls.size).toBe(tiles.length);
    });
  });

  describe('calculateOptimalZoom', () => {
    it('基本的な最適ズーム計算', () => {
      const bounds: [number, number, number, number] = [139.0, 35.0, 140.0, 36.0];
      const zoom = calculateOptimalZoom(bounds, 800, 600);
      
      expect(zoom).toBeGreaterThanOrEqual(0);
      expect(zoom).toBeLessThanOrEqual(18);
      expect(Number.isInteger(zoom)).toBe(true);
    });

    it('小さな表示サイズで低いズームレベルを返す', () => {
      const bounds: [number, number, number, number] = [139.0, 35.0, 140.0, 36.0];
      const smallZoom = calculateOptimalZoom(bounds, 200, 150);
      const largeZoom = calculateOptimalZoom(bounds, 1600, 1200);
      
      expect(smallZoom).toBeLessThanOrEqual(largeZoom);
    });

    it('狭い範囲で高いズームレベルを返す', () => {
      const narrowBounds: [number, number, number, number] = [139.7, 35.68, 139.72, 35.70];
      const wideBounds: [number, number, number, number] = [139.0, 35.0, 140.0, 36.0];
      
      const narrowZoom = calculateOptimalZoom(narrowBounds, 800, 600);
      const wideZoom = calculateOptimalZoom(wideBounds, 800, 600);
      
      expect(narrowZoom).toBeGreaterThanOrEqual(wideZoom);
    });

    it('縦横比が極端な範囲を適切に処理する', () => {
      // 非常に横長の範囲
      const wideBounds: [number, number, number, number] = [130.0, 35.0, 140.0, 35.1];
      const wideZoom = calculateOptimalZoom(wideBounds, 800, 600);
      
      // 非常に縦長の範囲
      const tallBounds: [number, number, number, number] = [139.0, 30.0, 139.1, 40.0];
      const tallZoom = calculateOptimalZoom(tallBounds, 800, 600);
      
      expect(wideZoom).toBeGreaterThanOrEqual(0);
      expect(tallZoom).toBeGreaterThanOrEqual(0);
    });

    it('minZoom/maxZoom制約を適用する', () => {
      const bounds: [number, number, number, number] = [139.0, 35.0, 140.0, 36.0];
      
      const constrainedZoom = calculateOptimalZoom(bounds, 800, 600, {
        minZoom: 5,
        maxZoom: 10
      });
      
      expect(constrainedZoom).toBeGreaterThanOrEqual(5);
      expect(constrainedZoom).toBeLessThanOrEqual(10);
    });

    it('カスタムタイルサイズを適用する', () => {
      const bounds: [number, number, number, number] = [139.0, 35.0, 140.0, 36.0];
      
      const zoom256 = calculateOptimalZoom(bounds, 800, 600, { tileSize: 256 });
      const zoom512 = calculateOptimalZoom(bounds, 800, 600, { tileSize: 512 });
      
      // 大きなタイルサイズでは低いズームレベルが選ばれるはず
      expect(zoom512).toBeLessThanOrEqual(zoom256);
    });

    it('無効な入力でエラーを投げる', () => {
      const validBounds: [number, number, number, number] = [139.0, 35.0, 140.0, 36.0];
      
      expect(() => calculateOptimalZoom([140, 35, 139, 36], 800, 600)).toThrow('無効な境界が指定されました');
      expect(() => calculateOptimalZoom(validBounds, 0, 600)).toThrow('地図のサイズは正の数値で指定してください');
      expect(() => calculateOptimalZoom(validBounds, 800, -100)).toThrow('地図のサイズは正の数値で指定してください');
    });
  });

  describe('getResolution', () => {
    it('基本的な解像度計算', () => {
      const resolution = getResolution(10, 0); // 赤道での解像度
      
      expect(resolution).toBeGreaterThan(0);
      expect(isFinite(resolution)).toBe(true);
    });

    it('ズームレベルが高いほど解像度が細かくなる', () => {
      const lowRes = getResolution(5, 35);
      const highRes = getResolution(15, 35);
      
      expect(highRes).toBeLessThan(lowRes);
    });

    it('緯度による解像度の変化', () => {
      const equatorRes = getResolution(10, 0);    // 赤道
      const tokyoRes = getResolution(10, 35.6895); // 東京
      const arcticRes = getResolution(10, 70);     // 高緯度
      
      // 高緯度ほど解像度が細かくなる（距離が短くなる）
      expect(arcticRes).toBeLessThan(tokyoRes);
      expect(tokyoRes).toBeLessThan(equatorRes);
    });

    it('カスタムタイルサイズでの計算', () => {
      const res256 = getResolution(10, 35, 256);
      const res512 = getResolution(10, 35, 512);
      
      // 大きなタイルサイズでは解像度が粗くなる
      expect(res512).toBeLessThan(res256);
    });

    it('無効な入力でエラーを投げる', () => {
      expect(() => getResolution(-1, 35)).toThrow('無効なズームレベルが指定されました');
      expect(() => getResolution(10, -95)).toThrow('無効な緯度が指定されました');
      expect(() => getResolution(10, 95)).toThrow('無効な緯度が指定されました');
      expect(() => getResolution(10, 35, 0)).toThrow('無効なタイルサイズが指定されました');
    });
  });

  describe('isValidTileCoordinate', () => {
    it('有効なタイル座標を正しく判定する', () => {
      expect(isValidTileCoordinate(0, 0, 0)).toBe(true);
      expect(isValidTileCoordinate(909, 404, 10)).toBe(true);
      expect(isValidTileCoordinate(31, 31, 5)).toBe(true);
    });

    it('無効なタイル座標を正しく判定する', () => {
      // 非整数
      expect(isValidTileCoordinate(1.5, 0, 5)).toBe(false);
      expect(isValidTileCoordinate(0, 1.5, 5)).toBe(false);
      expect(isValidTileCoordinate(0, 0, 1.5)).toBe(false);
      
      // 範囲外
      expect(isValidTileCoordinate(-1, 0, 5)).toBe(false);
      expect(isValidTileCoordinate(32, 0, 5)).toBe(false);
      expect(isValidTileCoordinate(0, 32, 5)).toBe(false);
      
      // 無効なズームレベル
      expect(isValidTileCoordinate(0, 0, -1)).toBe(false);
      expect(isValidTileCoordinate(0, 0, 31)).toBe(false);
    });

    it('境界値を正しく処理する', () => {
      // ズーム5での最大座標（31）
      expect(isValidTileCoordinate(31, 31, 5)).toBe(true);
      expect(isValidTileCoordinate(32, 31, 5)).toBe(false);
      expect(isValidTileCoordinate(31, 32, 5)).toBe(false);
      
      // 最小座標（0）
      expect(isValidTileCoordinate(0, 0, 10)).toBe(true);
      
      // 最大ズームレベル（30）
      expect(isValidTileCoordinate(0, 0, 30)).toBe(true);
    });
  });

  describe('統合テスト', () => {
    it('座標からタイルへの変換とタイルから境界への変換の一貫性', () => {
      // 複数の座標でテスト
      const testCases = [
        [0, 0, 5],
        [139.6917, 35.6895, 8],
        [-74.0060, 40.7128, 10],
        [151.2093, -33.8688, 7]
      ] as const;
      
      testCases.forEach(([lng, lat, zoom]) => {
        const tile = getTileXYZ(lng, lat, zoom);
        const bounds = getTileBounds(tile.x, tile.y, tile.z);
        
        // 元の座標がタイル境界内にあることを確認
        expect(lng).toBeGreaterThanOrEqual(bounds.west);
        expect(lng).toBeLessThanOrEqual(bounds.east);
        expect(lat).toBeGreaterThanOrEqual(bounds.south);
        expect(lat).toBeLessThanOrEqual(bounds.north);
      });
    });

    it('生成されたタイルURLが全て有効', () => {
      const bounds: [number, number, number, number] = [0, 0, 1, 1];
      const tiles = generateTileUrls(bounds, 5, {
        urlTemplate: 'https://example.com/{z}/{x}/{y}.png'
      });
      
      tiles.forEach(tile => {
        const { x, y, z } = tile.coordinate;
        expect(isValidTileCoordinate(x, y, z)).toBe(true);
        expect(tile.url).toMatch(/^https:\/\/example\.com\/5\/\d+\/\d+\.png$/);
      });
    });

    it('最適ズーム計算とタイル生成の統合動作', () => {
      const bounds: [number, number, number, number] = [139.0, 35.0, 140.0, 36.0];
      const zoom = calculateOptimalZoom(bounds, 512, 512);
      
      expect(zoom).toBeGreaterThanOrEqual(0);
      expect(zoom).toBeLessThanOrEqual(18);
      
      const tiles = generateTileUrls(bounds, zoom, {
        urlTemplate: 'https://tile.example.com/{z}/{x}/{y}.png'
      });
      
      expect(tiles.length).toBeGreaterThan(0);
      expect(tiles.length).toBeLessThan(50); // 適度な数のタイル
    });
  });
});