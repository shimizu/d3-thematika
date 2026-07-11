// 生成JavaScriptの実行前検査。文字列検索だけで安全性は保証できないため、
// これは誤操作の早期検出にすぎない（主防御は使い捨てWorker・CSP・タイムアウト・
// データ受け渡し制限）。plan.md §7.3 の禁止トークンを拒否する。

const FORBIDDEN_PATTERNS = [
  { name: "fetch", re: /\bfetch\s*\(/ },
  { name: "WebSocket", re: /\bWebSocket\b/ },
  { name: "XMLHttpRequest", re: /\bXMLHttpRequest\b/ },
  { name: "EventSource", re: /\bEventSource\b/ },
  { name: "importScripts", re: /\bimportScripts\s*\(/ },
  { name: "動的import", re: /\bimport\s*\(/ },
  { name: "indexedDB", re: /\bindexedDB\b/ },
  { name: "localStorage", re: /\blocalStorage\b/ },
  { name: "sessionStorage", re: /\bsessionStorage\b/ },
  { name: "postMessage", re: /\bpostMessage\s*\(/ },
];

/**
 * 生成コードを検査し、禁止トークンに当たれば理由配列を返す。問題なければ空配列。
 */
export function findForbiddenTokens(code) {
  const text = String(code ?? "");
  return FORBIDDEN_PATTERNS.filter(({ re }) => re.test(text)).map(
    ({ name }) => name,
  );
}

/**
 * コードが安全側の事前検査を通るか。{ ok, reasons } を返す。
 */
export function inspectCode(code) {
  const reasons = findForbiddenTokens(code);
  return { ok: reasons.length === 0, reasons };
}

/**
 * 実行コードの同一性確認用の簡易ハッシュ（FNV-1a, 非暗号）。
 * ログの突き合わせ・重複検出に使う。衝突耐性は要求しない。
 */
export function hashCode(code) {
  const text = String(code ?? "");
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  // 符号なし16進へ。
  return (hash >>> 0).toString(16).padStart(8, "0");
}
