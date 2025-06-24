// Mock implementation of d3-scale for Jest testing

const createMockScale = (type = 'ordinal') => {
  let _range = ['#ff0000', '#00ff00', '#0000ff'];
  let _domain = [0, 1, 2];
  
  const mockScale = {
    domain: jest.fn((newDomain) => {
      if (newDomain !== undefined) {
        _domain = newDomain;
        return mockScale;
      }
      return _domain;
    }),
    range: jest.fn((newRange) => {
      if (newRange !== undefined) {
        _range = newRange;
        return mockScale;
      }
      return _range;
    }),
    copy: jest.fn().mockReturnThis(),
    unknown: jest.fn().mockReturnThis(),
    interpolate: jest.fn().mockReturnThis(),
    interpolator: jest.fn().mockReturnThis(),
    bandwidth: jest.fn(() => 1),
    step: jest.fn(() => 1),
    round: jest.fn().mockReturnThis(),
    paddingInner: jest.fn().mockReturnThis(),
    paddingOuter: jest.fn().mockReturnThis(),
    padding: jest.fn().mockReturnThis(),
    align: jest.fn().mockReturnThis(),
    rangeRound: jest.fn().mockReturnThis(),
    invertExtent: jest.fn(() => [0, 1]),
    quantiles: jest.fn(() => []),
    // Mock scale function call
    __call: jest.fn((value) => {
      if (type === 'ordinal') return '#ff0000';
      if (type === 'linear') return value;
      if (type === 'threshold') return '#ff0000';
      if (type === 'sequential') return '#ff0000';
      return value;
    })
  };
  
  return mockScale;
};

// Make the mock scale callable
const makeCallable = (mockScale) => {
  const callableScale = (...args) => {
    if (args.length === 0) return callableScale;
    return mockScale.__call(args[0]);
  };
  
  // Copy all methods to the callable function
  Object.keys(mockScale).forEach(key => {
    if (key !== '__call') {
      callableScale[key] = mockScale[key];
    }
  });
  
  return callableScale;
};

const scaleOrdinal = jest.fn(() => makeCallable(createMockScale('ordinal')));
const scaleLinear = jest.fn(() => makeCallable(createMockScale('linear')));
const scaleThreshold = jest.fn(() => makeCallable(createMockScale('threshold')));
const scaleSequential = jest.fn(() => makeCallable(createMockScale('sequential')));

const scaleBand = jest.fn(() => makeCallable(createMockScale('band')));
const scalePoint = jest.fn(() => makeCallable(createMockScale('point')));
const scalePow = jest.fn(() => makeCallable(createMockScale('pow')));
const scaleSqrt = jest.fn(() => makeCallable(createMockScale('sqrt')));
const scaleLog = jest.fn(() => makeCallable(createMockScale('log')));
const scaleSymlog = jest.fn(() => makeCallable(createMockScale('symlog')));
const scaleIdentity = jest.fn(() => makeCallable(createMockScale('identity')));
const scaleTime = jest.fn(() => makeCallable(createMockScale('time')));
const scaleUtc = jest.fn(() => makeCallable(createMockScale('utc')));
const scaleQuantile = jest.fn(() => makeCallable(createMockScale('quantile')));
const scaleQuantize = jest.fn(() => makeCallable(createMockScale('quantize')));
const scaleDiverging = jest.fn(() => makeCallable(createMockScale('diverging')));

module.exports = {
  scaleOrdinal,
  scaleLinear,
  scaleThreshold,
  scaleSequential,
  scaleBand,
  scalePoint,
  scalePow,
  scaleSqrt,
  scaleLog,
  scaleSymlog,
  scaleIdentity,
  scaleTime,
  scaleUtc,
  scaleQuantile,
  scaleQuantize,
  scaleDiverging
};