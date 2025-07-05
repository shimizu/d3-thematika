/**
 * textures.js のモック
 */

const mockTextureInstance = {
  radius: jest.fn().mockReturnThis(),
  fill: jest.fn().mockReturnThis(),
  background: jest.fn().mockReturnThis(),
  size: jest.fn().mockReturnThis(),
  id: jest.fn().mockReturnThis(),
  orientation: jest.fn().mockReturnThis(),
  stroke: jest.fn().mockReturnThis(),
  strokeWidth: jest.fn().mockReturnThis(),
  d: jest.fn().mockReturnThis(),
  url: jest.fn().mockReturnValue('url(#test-texture)')
};

const mockTextures = {
  circles: jest.fn().mockReturnValue(mockTextureInstance),
  lines: jest.fn().mockReturnValue(mockTextureInstance),
  paths: jest.fn().mockReturnValue(mockTextureInstance)
};

module.exports = mockTextures;