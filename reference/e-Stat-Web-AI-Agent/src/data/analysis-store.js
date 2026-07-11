import {
  idbClearAnalyses,
  idbGetAllAnalyses,
  idbPutAnalysis,
} from "./idb.js";

const STORAGE_KEY = "estat-agent.analyses";

function resolveStorage(storage) {
  if (storage) return storage;
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

// 一覧/永続化用の要約。結果表(rows)や実行コード(code)など重い項目は含めない。
function summarizeAnalysis(analysis) {
  return {
    id: analysis.id,
    datasetId: analysis.datasetId,
    kind: analysis.kind, // "fixed" | "javascript"
    operation: analysis.operation ?? null,
    codeHash: analysis.codeHash ?? null,
    rowCount: Array.isArray(analysis.rows) ? analysis.rows.length : 0,
    warningCount: Array.isArray(analysis.warnings)
      ? analysis.warnings.length
      : 0,
    status: analysis.status ?? "success",
    durationMs: analysis.durationMs ?? null,
    computedAt: analysis.computedAt,
  };
}

function sequenceFromId(id) {
  const match = /^analysis_(\d+)$/.exec(id ?? "");
  return match ? Number(match[1]) : 0;
}

/**
 * 分析結果ログのストア。DatasetStoreと同じ二段構えの永続化を採る。
 * - 本体（パラメータ・結果表・警告・実行コード全文）はメモリ＋IndexedDB
 * - 要約はlocalStorageへ即時保存し、リロード直後の一覧描画を高速化する
 * Claudeへ返すのは別途ツール側が絞り込む。ここは監査・エクスポートの正本を持つ。
 */
export class AnalysisResultStore {
  #analyses = new Map(); // id -> 本体（rows/code含む完全なログ。メモリのみ）
  #summaries = new Map(); // id -> 要約（リロード後も残る）
  #listeners = new Set();
  #sequence = 0;
  #storage;

  constructor({ storage } = {}) {
    this.#storage = resolveStorage(storage);
    this.#restore();
    // 本体はIndexedDBから非同期復元する（コンストラクタは同期のまま）。
    this.#hydrate();
  }

  /**
   * 分析ログを保存する。analysisId(analysis_001形式)を採番して返す。
   */
  add(analysis) {
    this.#sequence += 1;
    const id = `analysis_${String(this.#sequence).padStart(3, "0")}`;
    const stored = {
      kind: "fixed",
      status: "success",
      warnings: [],
      rows: [],
      ...analysis,
      id,
      computedAt: analysis.computedAt ?? new Date().toISOString(),
    };

    this.#analyses.set(id, stored);
    this.#summaries.set(id, summarizeAnalysis(stored));
    this.#persist();
    // rows/code を含む本体をIndexedDBへ永続化（リロード後のエクスポート用）。
    idbPutAnalysis(stored).catch(() => {
      // 保存失敗してもメモリ保持は継続する。
    });
    this.#notify();
    return stored;
  }

  get(id) {
    const analysis = this.#analyses.get(id);
    if (!analysis) {
      throw new Error(`分析ログが見つかりません: ${id}`);
    }
    return analysis;
  }

  list() {
    // availableは本体(rows/code)がメモリに在るか（リロード直後は要約のみで false）。
    return [...this.#summaries.values()].map((summary) => ({
      ...summary,
      available: this.#analyses.has(summary.id),
    }));
  }

  clear() {
    this.#analyses.clear();
    this.#summaries.clear();
    this.#sequence = 0;
    try {
      this.#storage?.removeItem(STORAGE_KEY);
    } catch {
      // 削除失敗は無視する。
    }
    idbClearAnalyses().catch(() => {
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

  // IndexedDBから本体を復元し、availableをtrueへ戻してエクスポートを復活させる。
  async #hydrate() {
    let analyses;
    try {
      analyses = await idbGetAllAnalyses();
    } catch {
      return;
    }
    if (!Array.isArray(analyses) || analyses.length === 0) return;

    for (const analysis of analyses) {
      if (!analysis?.id) continue;
      this.#analyses.set(analysis.id, analysis);
      if (!this.#summaries.has(analysis.id)) {
        this.#summaries.set(analysis.id, summarizeAnalysis(analysis));
      }
      this.#sequence = Math.max(this.#sequence, sequenceFromId(analysis.id));
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
