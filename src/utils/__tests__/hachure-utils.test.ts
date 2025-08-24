import { 
  generateContours, 
  generateHachures, 
  createHatchPattern,
  createCrossHatchPattern,
  createDensityHatchPattern
} from '../hachure-utils';
import * as d3 from 'd3-selection';
import { JSDOM } from 'jsdom';

describe('hachure-utils', () => {
  describe('generateContours', () => {
    test('空のデータから空のFeatureCollectionを生成', () => {
      const result = generateContours([], {
        interval: 10,
        bounds: [[0, 0], [100, 100]]
      });
      
      expect(result.type).toBe('FeatureCollection');
      expect(result.features).toHaveLength(0);
    });

    test('単純な傾斜データから等高線を生成', () => {
      // 5x5の傾斜データ（左上から右下に向かって高くなる）
      const data = [
        [0, 5, 10, 15, 20],
        [5, 10, 15, 20, 25],
        [10, 15, 20, 25, 30],
        [15, 20, 25, 30, 35],
        [20, 25, 30, 35, 40]
      ];

      const result = generateContours(data, {
        interval: 10,
        bounds: [[0, 0], [100, 100]]
      });

      expect(result.type).toBe('FeatureCollection');
      expect(result.features.length).toBeGreaterThan(0);
      
      // 各等高線の値を確認
      result.features.forEach(feature => {
        expect(feature.properties?.value).toBeDefined();
        expect(feature.properties?.value % 10).toBe(0); // 10の倍数
        expect(feature.geometry.type).toBe('MultiLineString');
      });
    });

    test('カスタム最小値・最大値で等高線を生成', () => {
      const data = [
        [10, 20],
        [30, 40]
      ];

      const result = generateContours(data, {
        interval: 5,
        bounds: [[0, 0], [10, 10]],
        minValue: 15,
        maxValue: 35
      });

      const values = result.features.map(f => f.properties?.value);
      expect(Math.min(...values)).toBeGreaterThanOrEqual(15);
      expect(Math.max(...values)).toBeLessThanOrEqual(35);
    });

    test('不正なデータの処理', () => {
      const data = [
        [NaN, 10],
        [20, Infinity]
      ];

      const result = generateContours(data, {
        interval: 10,
        bounds: [[0, 0], [10, 10]]
      });

      expect(result.type).toBe('FeatureCollection');
      // NaNやInfinityは無視される
    });
  });

  describe('generateHachures', () => {
    test('空の等高線から空のハッチングを生成', () => {
      const contours: GeoJSON.FeatureCollection<GeoJSON.MultiLineString> = {
        type: 'FeatureCollection',
        features: []
      };

      const result = generateHachures(contours, {
        spacing: 5,
        length: 10
      });

      expect(result.type).toBe('FeatureCollection');
      expect(result.features).toHaveLength(0);
    });

    test('単純なLineStringからハッチングを生成', () => {
      const contours: GeoJSON.FeatureCollection<GeoJSON.LineString> = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          properties: { value: 100 },
          geometry: {
            type: 'LineString',
            coordinates: [[0, 0], [1, 0]] // 東向きの線
          }
        }]
      };

      const result = generateHachures(contours, {
        spacing: 0.1,
        length: 0.05,
        angle: 0
      });

      expect(result.type).toBe('FeatureCollection');
      expect(result.features.length).toBeGreaterThan(0);
      
      result.features.forEach(feature => {
        expect(feature.geometry.type).toBe('LineString');
        expect(feature.geometry.coordinates).toHaveLength(2);
        expect(feature.properties?.elevation).toBe(100);
      });
    });

    test('MultiLineStringからハッチングを生成', () => {
      const contours: GeoJSON.FeatureCollection<GeoJSON.MultiLineString> = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          properties: { value: 200 },
          geometry: {
            type: 'MultiLineString',
            coordinates: [
              [[0, 0], [1, 0]],
              [[0, 1], [1, 1]]
            ]
          }
        }]
      };

      const result = generateHachures(contours, {
        spacing: 0.2,
        length: 0.1,
        angle: 45
      });

      expect(result.features.length).toBeGreaterThan(0);
    });

    test('密度とランダム性のテスト', () => {
      const contours: GeoJSON.FeatureCollection<GeoJSON.LineString> = {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: [[0, 0], [10, 0]]
          }
        }]
      };

      // 密度0.5
      const result1 = generateHachures(contours, {
        spacing: 1,
        length: 0.5,
        density: 0.5
      });

      // 密度1.0
      const result2 = generateHachures(contours, {
        spacing: 1,
        length: 0.5,
        density: 1.0
      });

      // 密度が高いほうがハッチング数が多い
      expect(result2.features.length).toBeGreaterThanOrEqual(result1.features.length);

      // ランダム性テスト
      const result3 = generateHachures(contours, {
        spacing: 1,
        length: 0.5,
        randomness: 0.5
      });

      expect(result3.features.length).toBeGreaterThan(0);
    });
  });

  describe('SVGパターン関数', () => {
    let dom: JSDOM;
    let svg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;

    beforeEach(() => {
      dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
      global.document = dom.window.document as any;
      const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      document.body.appendChild(svgElement);
      svg = d3.select(svgElement) as any;
    });

    afterEach(() => {
      dom.window.close();
    });

    describe('createHatchPattern', () => {
      test('基本的なハッチングパターンを作成', () => {
        const url = createHatchPattern(svg, 'test-pattern', {
          spacing: 10,
          strokeWidth: 2,
          stroke: '#ff0000',
          angle: 45
        });

        expect(url).toBe('url(#test-pattern)');
        
        const pattern = svg.select('#test-pattern');
        expect(pattern.empty()).toBe(false);
        expect(pattern.attr('patternUnits')).toBe('userSpaceOnUse');
        expect(pattern.attr('width')).toBe('10');
        expect(pattern.attr('height')).toBe('10');
      });

      test('背景色付きパターンを作成', () => {
        createHatchPattern(svg, 'bg-pattern', {
          background: '#ffffff'
        });

        const pattern = svg.select('#bg-pattern');
        const rect = pattern.select('rect');
        expect(rect.empty()).toBe(false);
        expect(rect.attr('fill')).toBe('#ffffff');
      });

      test('デフォルト値でパターンを作成', () => {
        const url = createHatchPattern(svg, 'default-pattern');
        
        expect(url).toBe('url(#default-pattern)');
        const pattern = svg.select('#default-pattern');
        expect(pattern.attr('width')).toBe('5');
      });
    });

    describe('createCrossHatchPattern', () => {
      test('クロスハッチパターンを作成', () => {
        const url = createCrossHatchPattern(svg, 'cross-pattern', [0, 90], {
          spacing: 8,
          strokeWidth: 1,
          stroke: '#000000'
        });

        expect(url).toBe('url(#cross-pattern)');
        
        const pattern = svg.select('#cross-pattern');
        expect(pattern.empty()).toBe(false);
        expect(pattern.attr('width')).toBe('16'); // spacing * 2
        
        const groups = pattern.selectAll('g');
        expect(groups.size()).toBe(2); // 2つの角度
      });

      test('3方向のクロスハッチ', () => {
        createCrossHatchPattern(svg, 'triple-pattern', [0, 60, 120]);
        
        const pattern = svg.select('#triple-pattern');
        const groups = pattern.selectAll('g');
        expect(groups.size()).toBe(3);
      });
    });

    describe('createDensityHatchPattern', () => {
      test('密度ベースのパターンを作成', () => {
        const url1 = createDensityHatchPattern(svg, 'dense-pattern', 1.0, {
          spacing: 10
        });
        
        const url2 = createDensityHatchPattern(svg, 'sparse-pattern', 0.5, {
          spacing: 10
        });

        expect(url1).toBe('url(#dense-pattern)');
        expect(url2).toBe('url(#sparse-pattern)');

        const densePattern = svg.select('#dense-pattern');
        const sparsePattern = svg.select('#sparse-pattern');
        
        // 密度が高いほど間隔が狭い
        const denseSpacing = parseFloat(densePattern.attr('width'));
        const sparseSpacing = parseFloat(sparsePattern.attr('width'));
        expect(denseSpacing).toBeLessThan(sparseSpacing);
      });

      test('密度0の処理', () => {
        createDensityHatchPattern(svg, 'zero-density', 0, {
          spacing: 10
        });
        
        const pattern = svg.select('#zero-density');
        // 密度0でも最小値（0.1）として処理される
        expect(pattern.empty()).toBe(false);
      });
    });
  });
});