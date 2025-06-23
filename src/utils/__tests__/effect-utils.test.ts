import { createClipPolygon, ClipPolygonOptions } from '../effect-utils';
import { geoEqualEarth } from 'd3-geo';
import { select } from 'd3-selection';

// d3-geoのモック
jest.mock('d3-geo', () => ({
  geoEqualEarth: jest.fn(() => jest.fn()),
  geoPath: jest.fn(() => jest.fn((d: any) => {
    // 簡単なパスデータを返す
    if (d && d.type === 'Feature') {
      return 'M0,0L10,0L10,10L0,10Z';
    }
    return null;
  }))
}));

describe('createClipPolygon', () => {
  let mockDefs: any;
  let mockClipPath: any;
  let mockPath: any;

  beforeEach(() => {
    // モックパス要素
    mockPath = {
      attr: jest.fn().mockReturnThis()
    };

    // モッククリップパス要素
    mockClipPath = {
      attr: jest.fn().mockReturnThis(),
      append: jest.fn().mockReturnValue(mockPath),
      selectAll: jest.fn().mockReturnValue({
        size: jest.fn().mockReturnValue(2),
        each: jest.fn((callback) => {
          // 2つのパス要素に対してコールバックを実行
          callback.call({ attr: jest.fn() }, null, 0);
          callback.call({ attr: jest.fn() }, null, 1);
        })
      })
    };

    // モックdefs要素
    mockDefs = {
      append: jest.fn().mockReturnValue(mockClipPath),
      select: jest.fn().mockReturnValue(mockClipPath),
      selectAll: jest.fn().mockReturnValue({
        size: jest.fn().mockReturnValue(0)
      })
    };
  });

  describe('単一のPolygon Feature', () => {
    it('clipPath要素を正しく作成する', () => {
      const options: ClipPolygonOptions = {
        id: 'test-clip',
        polygon: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]]
          }
        },
        projection: geoEqualEarth()
      };

      const clipFunction = createClipPolygon(options);
      clipFunction(mockDefs);

      // defs要素が作成されていることを確認
      
      // clipPath要素が作成されていることを確認
      expect(mockDefs.append).toHaveBeenCalledWith('clipPath');
      expect(mockClipPath.attr).toHaveBeenCalledWith('id', 'test-clip');

      // path要素が作成されていることを確認
      expect(mockClipPath.append).toHaveBeenCalledWith('path');
      expect(mockPath.attr).toHaveBeenCalledWith('d', expect.any(String));
    });
  });

  describe('MultiPolygon Feature', () => {
    it('MultiPolygonをサポートする', () => {
      const options: ClipPolygonOptions = {
        id: 'multi-polygon-clip',
        polygon: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'MultiPolygon',
            coordinates: [
              [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]],
              [[[20, 20], [30, 20], [30, 30], [20, 30], [20, 20]]]
            ]
          }
        },
        projection: geoEqualEarth()
      };

      const clipFunction = createClipPolygon(options);
      clipFunction(mockDefs);

      expect(mockDefs.append).toHaveBeenCalledWith('clipPath');
      expect(mockClipPath.attr).toHaveBeenCalledWith('id', 'multi-polygon-clip');
      expect(mockClipPath.append).toHaveBeenCalledWith('path');
    });
  });

  describe('FeatureCollection', () => {
    it('複数のFeatureを持つFeatureCollectionを処理する', () => {
      const options: ClipPolygonOptions = {
        id: 'feature-collection-clip',
        polygon: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'Polygon',
                coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]]
              }
            },
            {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'Polygon',
                coordinates: [[[20, 20], [30, 20], [30, 30], [20, 30], [20, 20]]]
              }
            }
          ]
        },
        projection: geoEqualEarth()
      };

      const clipFunction = createClipPolygon(options);
      clipFunction(mockDefs);

      expect(mockDefs.append).toHaveBeenCalledWith('clipPath');
      expect(mockClipPath.attr).toHaveBeenCalledWith('id', 'feature-collection-clip');

      // 各Featureに対してpath要素が作成されていることを確認
      expect(mockClipPath.append).toHaveBeenCalledTimes(2);
      
      // 各pathにクラスが設定されていることを確認
      const pathAttrCalls = mockPath.attr.mock.calls;
      expect(pathAttrCalls).toContainEqual(['class', 'clip-path-0']);
      expect(pathAttrCalls).toContainEqual(['class', 'clip-path-1']);
    });
  });

  describe('url()メソッド', () => {
    it('正しいURL文字列を返す', () => {
      const options: ClipPolygonOptions = {
        id: 'url-test-clip',
        polygon: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]]
          }
        },
        projection: geoEqualEarth()
      };

      const clipFunction = createClipPolygon(options);
      expect((clipFunction as any).url()).toBe('url(#url-test-clip)');
    });
  });

  describe('エッジケース', () => {
    it('空のFeatureCollectionを処理できる', () => {
      const options: ClipPolygonOptions = {
        id: 'empty-collection-clip',
        polygon: {
          type: 'FeatureCollection',
          features: []
        },
        projection: geoEqualEarth()
      };

      const clipFunction = createClipPolygon(options);
      expect(() => clipFunction(mockDefs)).not.toThrow();

      expect(mockDefs.append).toHaveBeenCalledWith('clipPath');
      expect(mockClipPath.attr).toHaveBeenCalledWith('id', 'empty-collection-clip');

      // path要素が作成されていないことを確認（append('path')が呼ばれていない）
      expect(mockClipPath.append).not.toHaveBeenCalledWith('path');
    });

    it('無効なgeometryを持つFeatureを処理できる', () => {
      const options: ClipPolygonOptions = {
        id: 'invalid-geometry-clip',
        polygon: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: {},
              geometry: null as any // 無効なgeometry
            }
          ]
        },
        projection: geoEqualEarth()
      };

      const clipFunction = createClipPolygon(options);
      expect(() => clipFunction(mockDefs)).not.toThrow();
      
      expect(mockDefs.append).toHaveBeenCalledWith('clipPath');
      expect(mockClipPath.attr).toHaveBeenCalledWith('id', 'invalid-geometry-clip');
    });
  });
});