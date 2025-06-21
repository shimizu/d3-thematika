/**
 * ブラウザAPIのモック
 * Node.js環境でブラウザAPIを使用するテストを実行するため
 */

// SVG要素のモック
class MockSVGElement {
  style: { [key: string]: string } = {};
  attributes: { [key: string]: string } = {};
  children: MockSVGElement[] = [];
  
  setAttribute(name: string, value: string) {
    this.attributes[name] = value;
  }
  
  getAttribute(name: string) {
    return this.attributes[name];
  }
  
  appendChild(child: MockSVGElement) {
    this.children.push(child);
    return child;
  }
  
  remove() {
    // モック実装
  }
  
  querySelector(selector: string) {
    return new MockSVGElement();
  }
  
  querySelectorAll(selector: string) {
    return [new MockSVGElement()];
  }
}

// HTMLOptionElement のモック
class MockOption {
  style: { [key: string]: string } = {};
}

// グローバルオブジェクトにモックを追加
(global as any).Option = MockOption;
(global as any).SVGElement = MockSVGElement;

// D3-selection互換のモック
const mockD3Selection = {
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
  node: jest.fn(() => new MockSVGElement()),
  empty: jest.fn(() => false),
  size: jest.fn(() => 1)
};

// その他のブラウザAPIモック
(global as any).window = {
  ...global,
  // 必要に応じて他のAPIを追加
};

// documentオブジェクトの拡張モック
(global as any).document = {
  createElement: jest.fn((tagName: string) => {
    if (tagName === 'svg' || tagName.startsWith('svg')) {
      return new MockSVGElement();
    }
    return {
      style: {},
      setAttribute: jest.fn(),
      getAttribute: jest.fn(),
      appendChild: jest.fn(),
      querySelector: jest.fn(() => new MockSVGElement()),
      querySelectorAll: jest.fn(() => [new MockSVGElement()])
    };
  }),
  createElementNS: jest.fn((namespace: string, tagName: string) => {
    return new MockSVGElement();
  }),
  querySelector: jest.fn(() => new MockSVGElement()),
  querySelectorAll: jest.fn(() => [new MockSVGElement()])
};

// D3モック（基本的な関数のみ）
(global as any).d3 = {
  select: jest.fn(() => mockD3Selection),
  selectAll: jest.fn(() => mockD3Selection),
  geoPath: jest.fn(() => jest.fn()),
  geoNaturalEarth1: jest.fn(() => ({
    fitExtent: jest.fn().mockReturnThis(),
    scale: jest.fn().mockReturnThis(),
    translate: jest.fn().mockReturnThis(),
    center: jest.fn().mockReturnThis()
  })),
  geoGraticule: jest.fn(() => ({
    step: jest.fn().mockReturnThis(),
    extent: jest.fn().mockReturnThis()
  }))
};

export { MockSVGElement, mockD3Selection };