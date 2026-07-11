// 使い捨てWeb Worker本体。メインスレッドから分離された環境で生成JavaScriptを実行する。
// 受信: { code, input }（input = { records, columns, metadata, datasets, args }）
// 返信: { ok: true, result } または { ok: false, error }
//
// 完全なセキュリティ境界とはみなさない。外部通信はCSP(connect-src 'none')で遮断し、
// ここでも主要なネットワーク/ストレージAPIをundefined化して多重に防ぐ。

// ネットワーク・ストレージAPIを無効化する（CSPと合わせた多重防御）。
function lockdown(scope) {
  const blocked = [
    "fetch",
    "XMLHttpRequest",
    "WebSocket",
    "EventSource",
    "importScripts",
    "indexedDB",
    "localStorage",
    "sessionStorage",
  ];
  for (const name of blocked) {
    try {
      Object.defineProperty(scope, name, {
        value: undefined,
        configurable: false,
        writable: false,
      });
    } catch {
      // 再定義できないプロパティは無視（CSPが最終防衛）。
    }
  }
}

// 生成コードを関数スコープで評価し、analyze関数を取り出して実行する。
function runUserCode(code, input) {
  // code内の `function analyze(...) {}` を定義させ、それを返して呼び出す。
  // eslint-disable-next-line no-new-func
  const factory = new Function(`"use strict";\n${code}\nreturn analyze;`);
  const analyze = factory();
  if (typeof analyze !== "function") {
    throw new Error("analyze関数が定義されていません");
  }
  return analyze(input);
}

// Workerコンテキストでのみメッセージ購読を登録する（Nodeテストでの誤importを避ける）。
if (typeof self !== "undefined" && typeof self.addEventListener === "function") {
  lockdown(self);
  self.addEventListener("message", (event) => {
    const { code, input } = event.data ?? {};
    try {
      const result = runUserCode(code, input);
      self.postMessage({ ok: true, result });
    } catch (error) {
      self.postMessage({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });
}

export { runUserCode };
