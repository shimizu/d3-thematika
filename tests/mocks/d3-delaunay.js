// d3-delaunay mock for testing
module.exports = {
  Delaunay: {
    from: jest.fn((points, getX, getY) => {
      // Simple mock that returns a mock delaunay object
      return {
        voronoi: jest.fn((bounds) => {
          // Return mock voronoi with cellPolygon method
          return {
            cellPolygon: jest.fn((index) => {
              // Return mock polygon for testing
              if (index < points.length) {
                return [
                  [0, 0],
                  [100, 0],
                  [100, 100],
                  [0, 100],
                  [0, 0]
                ];
              }
              return null;
            })
          };
        })
      };
    })
  }
};