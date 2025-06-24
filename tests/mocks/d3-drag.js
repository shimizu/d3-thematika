// Mock implementation of d3-drag for Jest testing

const mockDragBehavior = () => ({
  on: jest.fn().mockReturnThis(),
  subject: jest.fn().mockReturnThis(),
  container: jest.fn().mockReturnThis(),
  filter: jest.fn().mockReturnThis(),
  touchable: jest.fn().mockReturnThis(),
  clickDistance: jest.fn().mockReturnThis()
});

const drag = jest.fn(() => mockDragBehavior());

module.exports = {
  drag
};