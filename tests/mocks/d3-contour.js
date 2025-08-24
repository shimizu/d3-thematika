// d3-contour のモック実装

const contours = () => {
  let size = [1, 1];
  let thresholds = [];
  
  const contour = function(data) {
    // シンプルなモック等高線データを返す
    return thresholds.map(value => ({
      type: 'Feature',
      value: value,
      coordinates: [
        // 単純な四角形のパスとして返す
        [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]
      ]
    }));
  };
  
  contour.size = function(_) {
    if (arguments.length === 0) return size;
    size = _;
    return contour;
  };
  
  contour.thresholds = function(_) {
    if (arguments.length === 0) return thresholds;
    thresholds = _;
    return contour;
  };
  
  return contour;
};

module.exports = {
  contours
};