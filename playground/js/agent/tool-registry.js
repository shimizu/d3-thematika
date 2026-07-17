export class ToolRegistry {
  #tools = new Map();

  /**
   * ツール定義と実装を同じ名前で管理し、LLMへ渡す定義と実行処理のずれを防ぐ。
   */
  register(definition, handler) {
    if (!definition?.name) {
      throw new Error("ツール定義にはnameが必要です。");
    }
    if (typeof handler !== "function") {
      throw new Error(`ツール「${definition.name}」の実装が関数ではありません。`);
    }
    if (this.#tools.has(definition.name)) {
      throw new Error(`ツール「${definition.name}」は既に登録されています。`);
    }

    this.#tools.set(definition.name, { definition, handler });
    return this;
  }

  definitions() {
    return [...this.#tools.values()].map(({ definition }) => definition);
  }

  has(name) {
    return this.#tools.has(name);
  }

  async execute(name, input, context) {
    const tool = this.#tools.get(name);
    if (!tool) {
      throw new Error(`未登録のツールが要求されました: ${name}`);
    }

    return tool.handler(input, context);
  }
}

