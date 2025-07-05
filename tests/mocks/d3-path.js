// d3-path mock for Jest testing
const mockPath = () => ({
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  quadraticCurveTo: jest.fn(),
  bezierCurveTo: jest.fn(),
  arc: jest.fn(),
  closePath: jest.fn(),
  toString: jest.fn(() => 'M0,0L10,10L20,5')
});

const path = jest.fn(() => mockPath());

module.exports = {
  path
};