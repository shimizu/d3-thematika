const DB_NAME = "estat-agent";
const DB_VERSION = 2;
const DATASETS_STORE = "datasets";
const ANALYSES_STORE = "analyses";
const STORE_NAMES = [DATASETS_STORE, ANALYSES_STORE];

function resolveIndexedDB() {
  try {
    return globalThis.indexedDB ?? null;
  } catch {
    return null;
  }
}

// DBを開く。IndexedDB不在（Nodeテスト等）ならnullを返し、呼び出し側でno-opにする。
function openDb() {
  const idb = resolveIndexedDB();
  if (!idb) return Promise.resolve(null);

  return new Promise((resolve) => {
    let request;
    try {
      request = idb.open(DB_NAME, DB_VERSION);
    } catch {
      resolve(null);
      return;
    }

    request.onupgradeneeded = () => {
      const db = request.result;
      // datasets/analyses を冪等に用意する（バージョン1からの昇格でも安全）。
      for (const name of STORE_NAMES) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: "id" });
        }
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

// 指定ストアへの書き込みをPromise化し、トランザクション完了で解決する。
function runWrite(storeName, mode, action) {
  return openDb().then((db) => {
    if (!db) return undefined;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      action(store);
      tx.oncomplete = () => resolve(undefined);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  });
}

// 指定ストアの全件取得。不在環境では空配列。
function getAll(storeName) {
  return openDb().then((db) => {
    if (!db) return [];
    return new Promise((resolve) => {
      const tx = db.transaction(storeName, "readonly");
      const request = tx.objectStore(storeName).getAll();
      request.onsuccess = () => resolve(request.result ?? []);
      request.onerror = () => resolve([]);
    });
  });
}

// datasets ストア（既存API、互換維持）
export function idbPut(record) {
  return runWrite(DATASETS_STORE, "readwrite", (store) => store.put(record));
}

export function idbDelete(id) {
  return runWrite(DATASETS_STORE, "readwrite", (store) => store.delete(id));
}

export function idbClear() {
  return runWrite(DATASETS_STORE, "readwrite", (store) => store.clear());
}

export function idbGetAll() {
  return getAll(DATASETS_STORE);
}

// analyses ストア（分析結果ログ用）
export function idbPutAnalysis(record) {
  return runWrite(ANALYSES_STORE, "readwrite", (store) => store.put(record));
}

export function idbDeleteAnalysis(id) {
  return runWrite(ANALYSES_STORE, "readwrite", (store) => store.delete(id));
}

export function idbClearAnalyses() {
  return runWrite(ANALYSES_STORE, "readwrite", (store) => store.clear());
}

export function idbGetAllAnalyses() {
  return getAll(ANALYSES_STORE);
}
