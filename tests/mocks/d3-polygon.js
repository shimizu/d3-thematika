// d3-polygon mock for testing
module.exports = {
  polygonCentroid: jest.fn((polygon) => {
    // Simple mock that returns center point of mock polygon
    if (polygon && polygon.length > 0) {
      return [50, 50]; // Mock centroid
    }
    return [0, 0];
  })
};