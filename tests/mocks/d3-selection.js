// D3-selection モック
const mockSelection = {
  select: jest.fn().mockReturnThis(),
  selectAll: jest.fn().mockReturnThis(),
  append: jest.fn().mockReturnThis(),
  attr: jest.fn().mockReturnThis(),
  style: jest.fn().mockReturnThis(),
  datum: jest.fn().mockReturnThis(),
  data: jest.fn().mockReturnThis(),
  enter: jest.fn().mockReturnThis(),
  exit: jest.fn().mockReturnThis(),
  remove: jest.fn().mockReturnThis(),
  node: jest.fn(() => ({ 
    tagName: 'g',
    remove: jest.fn(),
    setAttribute: jest.fn(),
    getAttribute: jest.fn()
  })),
  empty: jest.fn(() => false),
  size: jest.fn(() => 1),
  each: jest.fn().mockReturnThis(),
  call: jest.fn().mockReturnThis(),
  on: jest.fn().mockReturnThis(),
  text: jest.fn().mockReturnThis(),
  html: jest.fn().mockReturnThis()
};

// メソッドチェーン用のプロキシを作成
const createMockSelection = () => {
  const selection = { ...mockSelection };
  // selectAllの戻り値もselectionメソッドを持つようにする
  selection.selectAll = jest.fn(() => selection);
  selection.data = jest.fn(() => selection);
  selection.enter = jest.fn(() => selection);
  selection.remove = jest.fn(() => selection);
  selection.on = jest.fn(() => selection);
  return selection;
};

module.exports = {
  select: jest.fn(() => createMockSelection()),
  selectAll: jest.fn(() => createMockSelection()),
  Selection: class MockSelection {}
};