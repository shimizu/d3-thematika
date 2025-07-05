// D3-geo モック
module.exports = {
  geoPath: jest.fn(() => jest.fn()),
  geoNaturalEarth1: jest.fn(() => ({
    fitExtent: jest.fn().mockReturnThis(),
    scale: jest.fn().mockReturnThis(),
    translate: jest.fn().mockReturnThis(),
    center: jest.fn().mockReturnThis()
  })),
  geoMercator: jest.fn(() => {
    const mockProjection = jest.fn((coord) => [100, 200]);
    mockProjection.fitExtent = jest.fn().mockReturnValue(mockProjection);
    mockProjection.scale = jest.fn().mockReturnValue(mockProjection);
    mockProjection.translate = jest.fn().mockReturnValue(mockProjection);
    mockProjection.center = jest.fn().mockReturnValue(mockProjection);
    mockProjection.invert = jest.fn((pixel) => [139.6917, 35.6895]);
    return mockProjection;
  }),
  geoEqualEarth: jest.fn(() => ({
    fitExtent: jest.fn().mockReturnThis(),
    scale: jest.fn().mockReturnThis(),
    translate: jest.fn().mockReturnThis(),
    center: jest.fn().mockReturnThis()
  })),
  geoOrthographic: jest.fn(() => ({
    fitExtent: jest.fn().mockReturnThis(),
    scale: jest.fn().mockReturnThis(),
    translate: jest.fn().mockReturnThis(),
    center: jest.fn().mockReturnThis()
  })),
  geoGraticule: jest.fn(() => {
    const graticule = {
      step: jest.fn().mockReturnThis(),
      extent: jest.fn().mockReturnThis()
    };
    // graticule()関数としても機能するようにする
    return Object.assign(jest.fn(() => ({ type: 'FeatureCollection', features: [] })), graticule);
  }),
  GeoPath: class MockGeoPath {},
  GeoProjection: class MockGeoProjection {}
};