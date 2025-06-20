/**
 * ブラウザAPIのモック
 * Node.js環境でブラウザAPIを使用するテストを実行するため
 */

// HTMLOptionElement のモック
class MockOption {
  style: { [key: string]: string } = {};
}

// グローバルオブジェクトにモックを追加
(global as any).Option = MockOption;

// その他のブラウザAPIモック
(global as any).window = {
  ...global,
  // 必要に応じて他のAPIを追加
};

// documentオブジェクトの基本的なモック
(global as any).document = {
  createElement: jest.fn(() => ({
    style: {}
  })),
  // 必要に応じて他のメソッドを追加
};