const STORAGE_KEY = "estat-agent.conversation";

function resolveStorage(storage) {
  if (storage) return storage;
  try {
    return globalThis.localStorage ?? null;
  } catch {
    // SSRやアクセス制限環境でlocalStorage参照が例外を投げる場合がある。
    return null;
  }
}

/**
 * Anthropic形式のmessages配列をターンをまたいで保持し、localStorageへ永続化する。
 * Claude APIはステートレスなため、過去の文脈はこの配列を毎回送り直すことで維持する。
 * storageは注入可能にして、ブラウザ以外（テスト）でも差し替えられるようにする。
 */
export class ConversationStore {
  #messages = [];
  #listeners = new Set();
  #storage;

  constructor({ storage } = {}) {
    this.#storage = resolveStorage(storage);
    this.#messages = this.#load();
  }

  getMessages() {
    return this.#messages;
  }

  setMessages(messages) {
    this.#messages = messages;
    this.#persist();
    this.#notify();
    return this.#messages;
  }

  clear() {
    this.#messages = [];
    try {
      this.#storage?.removeItem(STORAGE_KEY);
    } catch {
      // 削除失敗は無視し、メモリ上は空にする。
    }
    this.#notify();
  }

  subscribe(listener) {
    this.#listeners.add(listener);
    listener(this.#messages);
    return () => this.#listeners.delete(listener);
  }

  #load() {
    try {
      const raw = this.#storage?.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  #persist() {
    try {
      this.#storage?.setItem(STORAGE_KEY, JSON.stringify(this.#messages));
    } catch {
      // quota超過などで保存に失敗してもメモリ保持は継続する。
    }
  }

  #notify() {
    for (const listener of this.#listeners) listener(this.#messages);
  }
}
