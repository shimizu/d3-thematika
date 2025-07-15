// d3-shape mock for Jest testing
const mockLine = () => ({
  x: jest.fn().mockReturnThis(),
  y: jest.fn().mockReturnThis(),
  curve: jest.fn().mockReturnThis(),
  __call: jest.fn(() => 'M0,0L10,10L20,5')
});

// ラインジェネレーター関数
const line = jest.fn(() => {
  const lineGenerator = mockLine();
  // 関数として呼び出された場合のモック
  const callable = jest.fn(() => 'M0,0L10,10L20,5');
  // オブジェクトのプロパティを callable に追加
  Object.assign(callable, lineGenerator);
  return callable;
});

// カーブ関数のモック
const curveBasis = { type: 'basis' };
const curveCardinal = { type: 'cardinal' };
const curveCatmullRom = { type: 'catmullRom' };
const curveLinear = { type: 'linear' };
const curveMonotoneX = { type: 'monotoneX' };
const curveMonotoneY = { type: 'monotoneY' };
const curveNatural = { type: 'natural' };
const curveStep = { type: 'step' };
const curveStepAfter = { type: 'stepAfter' };
const curveStepBefore = { type: 'stepBefore' };

// curveBundleのモック
const curveBundle = {
  type: 'bundle',
  beta: jest.fn().mockImplementation((beta) => {
    return { type: 'bundle', beta: beta || 0.85 };
  })
};

module.exports = {
  line,
  curveBasis,
  curveCardinal,
  curveCatmullRom,
  curveLinear,
  curveMonotoneX,
  curveMonotoneY,
  curveNatural,
  curveStep,
  curveStepAfter,
  curveStepBefore,
  curveBundle
};