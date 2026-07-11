import { idbClear, idbDelete, idbGetAll, idbPut } from "./idb.js";

const STORAGE_KEY = "estat-agent.datasets";

function resolveStorage(storage) {
  if (storage) return storage;
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

function summarizeDataset(dataset) {
  return {
    id: dataset.id,
    statsDataId: dataset.statsDataId,
    title: dataset.title,
    recordCount: dataset.records.length,
    columns: dataset.columns,
    filters: dataset.filters,
    createdAt: dataset.createdAt,
  };
}

function sequenceFromId(id) {
  const match = /^dataset_(\d+)$/.exec(id ?? "");
  return match ? Number(match[1]) : 0;
}

export class DatasetStore {
  #datasets = new Map(); // id -> 生レコードを含む完全なデータセット（メモリのみ）
  #summaries = new Map(); // id -> 一覧/永続化用の要約（リロード後も残る）
  #listeners = new Set();
  #sequence = 0;
  #storage;

  constructor({ storage } = {}) {
    this.#storage = resolveStorage(storage);
    this.#restore();
    // 生レコードはIndexedDBから非同期で復元する（await不可なのでコンストラクタは同期のまま）。
    this.#hydrate();
  }

  /**
   * データ本体を会話履歴へ入れず、IDを介して後続ツールから参照できるようにする。
   * 要約はlocalStorageへ即時永続化し、生レコードはIndexedDBへ非同期保存する（quota回避）。
   */
  add(dataset) {
    this.#sequence += 1;
    const id = `dataset_${String(this.#sequence).padStart(3, "0")}`;
    const stored = {
      ...dataset,
      id,
      createdAt: new Date().toISOString(),
    };

    this.#datasets.set(id, stored);
    this.#summaries.set(id, summarizeDataset(stored));
    this.#persist();
    // 生レコードを含む完全なデータセットをIndexedDBへ永続化（リロード後のダウンロード用）。
    idbPut(stored).catch(() => {
      // 保存失敗してもメモリ保持は継続する。
    });
    this.#notify();
    return stored;
  }

  get(id) {
    const dataset = this.#datasets.get(id);
    if (!dataset) {
      // リロードで生レコードが失われた場合もここに来る。再fetchへ誘導する。
      throw new Error(`データセットが見つかりません: ${id}`);
    }
    return dataset;
  }

  list() {
    // availableは生レコードがメモリに在るか（リロード後は要約のみで復元され false）。
    return [...this.#summaries.values()].map((summary) => ({
      ...summary,
      available: this.#datasets.has(summary.id),
    }));
  }

  inspect(id, { sampleSize = 5, distinctColumn } = {}) {
    const dataset = this.get(id);
    const result = {
      ...summarizeDataset(dataset),
      sample: dataset.records.slice(0, sampleSize),
    };

    if (distinctColumn) {
      if (!dataset.columns.includes(distinctColumn)) {
        throw new Error(`列が見つかりません: ${distinctColumn}`);
      }
      result.distinct = [
        ...new Set(dataset.records.map((record) => record[distinctColumn])),
      ].slice(0, 100);
    }

    return result;
  }

  clear() {
    this.#datasets.clear();
    this.#summaries.clear();
    this.#sequence = 0;
    try {
      this.#storage?.removeItem(STORAGE_KEY);
    } catch {
      // 削除失敗は無視する。
    }
    idbClear().catch(() => {
      // 削除失敗は無視する。
    });
    this.#notify();
  }

  // 単体のデータセットを削除する（デバッグハーネスが一時投入したフィクスチャの後始末など）。
  remove(id) {
    const hadData = this.#datasets.delete(id);
    const hadSummary = this.#summaries.delete(id);
    if (!hadData && !hadSummary) return;
    this.#persist();
    idbDelete(id).catch(() => {
      // 削除失敗は無視する。
    });
    this.#notify();
  }

  subscribe(listener) {
    this.#listeners.add(listener);
    listener(this.list());
    return () => this.#listeners.delete(listener);
  }

  #restore() {
    let summaries = [];
    try {
      const raw = this.#storage?.getItem(STORAGE_KEY);
      summaries = raw ? JSON.parse(raw) : [];
    } catch {
      summaries = [];
    }
    if (!Array.isArray(summaries)) return;

    for (const summary of summaries) {
      if (!summary?.id) continue;
      this.#summaries.set(summary.id, summary);
      this.#sequence = Math.max(this.#sequence, sequenceFromId(summary.id));
    }
  }

  // IndexedDBから生レコードを復元し、availableをtrueへ戻してダウンロードを復活させる。
  async #hydrate() {
    let datasets;
    try {
      datasets = await idbGetAll();
    } catch {
      return;
    }
    if (!Array.isArray(datasets) || datasets.length === 0) return;

    for (const dataset of datasets) {
      if (!dataset?.id) continue;
      this.#datasets.set(dataset.id, dataset);
      // 要約がlocalStorageに無い場合（IndexedDBが永続ソース）に補完する。
      if (!this.#summaries.has(dataset.id)) {
        this.#summaries.set(dataset.id, summarizeDataset(dataset));
      }
      this.#sequence = Math.max(this.#sequence, sequenceFromId(dataset.id));
    }
    this.#notify();
  }

  #persist() {
    try {
      this.#storage?.setItem(
        STORAGE_KEY,
        JSON.stringify([...this.#summaries.values()]),
      );
    } catch {
      // quota超過などで保存に失敗してもメモリ保持は継続する。
    }
  }

  #notify() {
    const snapshot = this.list();
    for (const listener of this.#listeners) listener(snapshot);
  }
}
