import {
  DEFAULT_LAYER_STYLE,
  mergeStyles,
  normalizeStyle,
  isValidColor,
  hexToRgba,
  rgbToHex,
  lightenColor,
  darkenColor,
  getColorFromValue,
  interpolateColors
} from '../style-utils';

describe('style-utils', () => {
  describe('DEFAULT_LAYER_STYLE', () => {
    test('デフォルトスタイルが定義されている', () => {
      expect(DEFAULT_LAYER_STYLE).toEqual({
        fill: '#cccccc',
        stroke: '#333333',
        strokeWidth: 0.5,
        opacity: 1,
        className: ''
      });
    });
  });

  describe('mergeStyles', () => {
    test('2つのスタイルを正しくマージする', () => {
      const baseStyle = { fill: '#000', stroke: '#fff' };
      const overrideStyle = { fill: '#red', opacity: 0.5 };

      const result = mergeStyles(baseStyle, overrideStyle);

      expect(result).toEqual({
        fill: '#red',
        stroke: '#fff',
        opacity: 0.5
      });
    });

    test('上書きスタイルが空の場合はベーススタイルを返す', () => {
      const baseStyle = { fill: '#000', stroke: '#fff' };
      const result = mergeStyles(baseStyle, {});

      expect(result).toEqual(baseStyle);
    });

    test('上書きスタイルがundefinedの場合はベーススタイルを返す', () => {
      const baseStyle = { fill: '#000', stroke: '#fff' };
      const result = mergeStyles(baseStyle);

      expect(result).toEqual(baseStyle);
    });
  });

  describe('normalizeStyle', () => {
    test('不完全なスタイルにデフォルト値を適用する', () => {
      const partialStyle = { fill: '#red', opacity: 0.8 };
      const result = normalizeStyle(partialStyle);

      expect(result).toEqual({
        fill: '#red',
        stroke: '#333333',
        strokeWidth: 0.5,
        opacity: 0.8,
        className: ''
      });
    });

    test('空のスタイルにデフォルト値を適用する', () => {
      const result = normalizeStyle({});

      expect(result).toEqual(DEFAULT_LAYER_STYLE);
    });

    test('undefinedの場合にデフォルト値を適用する', () => {
      const result = normalizeStyle();

      expect(result).toEqual(DEFAULT_LAYER_STYLE);
    });
  });

  describe('isValidColor', () => {
    test('有効な色文字列を認識する', () => {
      expect(isValidColor('#ffffff')).toBe(true);
      expect(isValidColor('#fff')).toBe(true);
      expect(isValidColor('red')).toBe(true);
      expect(isValidColor('rgb(255, 0, 0)')).toBe(true);
      expect(isValidColor('rgba(255, 0, 0, 0.5)')).toBe(true);
      expect(isValidColor('hsl(0, 100%, 50%)')).toBe(true);
    });

    test('無効な色文字列を認識する', () => {
      expect(isValidColor('')).toBe(false);
      expect(isValidColor('invalid')).toBe(false);
      expect(isValidColor('#gggggg')).toBe(false);
      expect(isValidColor('rgb(300, 0, 0)')).toBe(false);
    });
  });

  describe('hexToRgba', () => {
    test('6桁のHEXをRGBAに変換する', () => {
      expect(hexToRgba('#ffffff')).toBe('rgba(255, 255, 255, 1)');
      expect(hexToRgba('#000000')).toBe('rgba(0, 0, 0, 1)');
      expect(hexToRgba('#ff0000')).toBe('rgba(255, 0, 0, 1)');
    });

    test('3桁のHEXをRGBAに変換する', () => {
      expect(hexToRgba('#fff')).toBe('rgba(255, 255, 255, 1)');
      expect(hexToRgba('#000')).toBe('rgba(0, 0, 0, 1)');
      expect(hexToRgba('#f00')).toBe('rgba(255, 0, 0, 1)');
    });

    test('#なしのHEXをRGBAに変換する', () => {
      expect(hexToRgba('ffffff')).toBe('rgba(255, 255, 255, 1)');
      expect(hexToRgba('ff0000')).toBe('rgba(255, 0, 0, 1)');
    });

    test('透明度を指定してRGBAに変換する', () => {
      expect(hexToRgba('#ffffff', 0.5)).toBe('rgba(255, 255, 255, 0.5)');
      expect(hexToRgba('#ff0000', 0)).toBe('rgba(255, 0, 0, 0)');
    });

    test('無効なHEXでエラーを投げる', () => {
      expect(() => hexToRgba('invalid')).toThrow('Invalid hex color: invalid');
      expect(() => hexToRgba('#gggggg')).toThrow('Invalid hex color: #gggggg');
    });
  });

  describe('rgbToHex', () => {
    test('RGB値をHEXに変換する', () => {
      expect(rgbToHex(255, 255, 255)).toBe('#ffffff');
      expect(rgbToHex(0, 0, 0)).toBe('#000000');
      expect(rgbToHex(255, 0, 0)).toBe('#ff0000');
      expect(rgbToHex(0, 255, 0)).toBe('#00ff00');
      expect(rgbToHex(0, 0, 255)).toBe('#0000ff');
    });

    test('範囲外の値を正しく処理する', () => {
      expect(rgbToHex(-10, 300, 128)).toBe('#00ff80');
      expect(rgbToHex(256, -1, 500)).toBe('#ff00ff');
    });

    test('小数点を含む値を正しく処理する', () => {
      expect(rgbToHex(255.7, 128.3, 0.9)).toBe('#ff8001');
    });
  });

  describe('lightenColor', () => {
    test('色を明るくする', () => {
      expect(lightenColor('#000000', 0.5)).toBe('#808080');
      expect(lightenColor('#ff0000', 0.5)).toBe('#ff8080');
    });

    test('amount=0の場合は元の色を返す', () => {
      expect(lightenColor('#ff0000', 0)).toBe('#ff0000');
    });

    test('amount=1の場合は白色を返す', () => {
      expect(lightenColor('#000000', 1)).toBe('#ffffff');
    });

    test('無効な色文字列の場合は元の文字列を返す', () => {
      expect(lightenColor('invalid', 0.5)).toBe('invalid');
    });
  });

  describe('darkenColor', () => {
    test('色を暗くする', () => {
      expect(darkenColor('#ffffff', 0.5)).toBe('#808080');
      expect(darkenColor('#ff8080', 0.5)).toBe('#804040');
    });

    test('amount=0の場合は元の色を返す', () => {
      expect(darkenColor('#ff0000', 0)).toBe('#ff0000');
    });

    test('amount=1の場合は黒色を返す', () => {
      expect(darkenColor('#ffffff', 1)).toBe('#000000');
    });

    test('無効な色文字列の場合は元の文字列を返す', () => {
      expect(darkenColor('invalid', 0.5)).toBe('invalid');
    });
  });

  describe('getColorFromValue', () => {
    const colorStops = [
      { stop: 0, color: '#ff0000' },    // 赤
      { stop: 0.5, color: '#ffff00' },  // 黄
      { stop: 1, color: '#00ff00' }     // 緑
    ];

    test('値に基づいて色を取得する', () => {
      expect(getColorFromValue(0, colorStops)).toBe('#ff0000');
      expect(getColorFromValue(0.5, colorStops)).toBe('#ffff00');
      expect(getColorFromValue(1, colorStops)).toBe('#00ff00');
    });

    test('範囲外の値を正しく処理する', () => {
      expect(getColorFromValue(-0.5, colorStops)).toBe('#ff0000');
      expect(getColorFromValue(1.5, colorStops)).toBe('#00ff00');
    });

    test('中間値を補間する', () => {
      const result = getColorFromValue(0.25, colorStops);
      // 赤と黄の中間色が返される
      expect(result).toMatch(/^#[0-9a-f]{6}$/);
    });
  });

  describe('interpolateColors', () => {
    test('2つの色を補間する', () => {
      expect(interpolateColors('#ff0000', '#00ff00', 0)).toBe('#ff0000');
      expect(interpolateColors('#ff0000', '#00ff00', 1)).toBe('#00ff00');
      expect(interpolateColors('#ff0000', '#00ff00', 0.5)).toBe('#808000');
    });

    test('無効な色の場合は最初の色を返す', () => {
      expect(interpolateColors('invalid', '#00ff00', 0.5)).toBe('invalid');
      expect(interpolateColors('#ff0000', 'invalid', 0.5)).toBe('#ff0000');
    });

    test('白と黒の補間', () => {
      expect(interpolateColors('#ffffff', '#000000', 0.5)).toBe('#808080');
    });
  });
});