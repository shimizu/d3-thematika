// Mock implementation of d3-scale-chromatic for Jest testing

// Mock color interpolators
const mockInterpolator = jest.fn((t) => `rgb(${Math.floor(t * 255)}, 0, 0)`);

const interpolateYlOrRd = mockInterpolator;
const interpolateBlues = mockInterpolator;
const interpolateGreens = mockInterpolator;
const interpolateOranges = mockInterpolator;
const interpolatePurples = mockInterpolator;
const interpolateReds = mockInterpolator;
const interpolateViridis = mockInterpolator;
const interpolatePlasma = mockInterpolator;
const interpolateInferno = mockInterpolator;
const interpolateMagma = mockInterpolator;
const interpolateCividis = mockInterpolator;

// Mock categorical color schemes
const schemeCategory10 = [
  '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
  '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
];

const schemeAccent = ['#7fc97f', '#beaed4', '#fdc086'];
const schemeDark2 = ['#1b9e77', '#d95f02', '#7570b3'];
const schemePaired = ['#a6cee3', '#1f78b4', '#b2df8a'];
const schemePastel1 = ['#fbb4ae', '#b3cde3', '#ccebc5'];
const schemePastel2 = ['#b3e2cd', '#fdcdac', '#cbd5e8'];
const schemeSet1 = ['#e41a1c', '#377eb8', '#4daf4a'];
const schemeSet2 = ['#66c2a5', '#fc8d62', '#8da0cb'];
const schemeSet3 = ['#8dd3c7', '#ffffb3', '#bebada'];
const schemeTableau10 = ['#4e79a7', '#f28e2c', '#e15759'];

module.exports = {
  interpolateYlOrRd,
  interpolateBlues,
  interpolateGreens,
  interpolateOranges,
  interpolatePurples,
  interpolateReds,
  interpolateViridis,
  interpolatePlasma,
  interpolateInferno,
  interpolateMagma,
  interpolateCividis,
  schemeCategory10,
  schemeAccent,
  schemeDark2,
  schemePaired,
  schemePastel1,
  schemePastel2,
  schemeSet1,
  schemeSet2,
  schemeSet3,
  schemeTableau10
};