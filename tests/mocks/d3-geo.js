// D3-geo モック
module.exports = {
  geoPath: jest.fn(() => jest.fn()),
  geoNaturalEarth1: jest.fn(() => ({
    fitExtent: jest.fn().mockReturnThis(),
    scale: jest.fn().mockReturnThis(),
    translate: jest.fn().mockReturnThis(),
    center: jest.fn().mockReturnThis()
  })),
  geoMercator: jest.fn(() => ({
    fitExtent: jest.fn().mockReturnThis(),
    scale: jest.fn().mockReturnThis(),
    translate: jest.fn().mockReturnThis(),
    center: jest.fn().mockReturnThis()
  })),
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