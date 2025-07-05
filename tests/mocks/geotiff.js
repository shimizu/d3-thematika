/**
 * geotiff ライブラリのモック
 */

const mockImage = {
  getWidth: jest.fn().mockReturnValue(100),
  getHeight: jest.fn().mockReturnValue(100),
  getBoundingBox: jest.fn().mockReturnValue([0, 0, 10, 10]),
  readRGB: jest.fn().mockResolvedValue({
    width: 2,
    height: 2,
    length: 12
  }),
  readRasters: jest.fn().mockResolvedValue([
    new Uint8Array([255, 128, 64, 32]),
    new Uint8Array([200, 100, 50, 25]),
    new Uint8Array([150, 75, 38, 19])
  ])
};

const mockTiff = {
  getImageCount: jest.fn().mockResolvedValue(3),
  getImage: jest.fn().mockResolvedValue(mockImage)
};

module.exports = {
  fromUrl: jest.fn().mockResolvedValue(mockTiff),
  Pool: jest.fn()
};