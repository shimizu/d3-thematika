/**
 * Anthropic側で実行されるサーバー側ツールの宣言。
 * ローカルハンドラを持たないため ToolRegistry には登録せず、
 * App.jsx の callModel クロージャで tools 配列へ連結して送る。
 *
 * 型文字列はGA版を使用（web検索/取得は _20260209、コード実行は _20260120）。
 */
export const SERVER_TOOL_DEFS = {
  webSearch: { type: "web_search_20260209", name: "web_search" },
  webFetch: { type: "web_fetch_20260209", name: "web_fetch" },
  codeExecution: { type: "code_execution_20260120", name: "code_execution" },
};

/**
 * トグル状態から、有効なサーバー側ツール定義の配列を組み立てる。
 * 出力順は固定（webSearch→webFetch→codeExecution）。同じトグルなら同じ配列になり、
 * プロンプトキャッシュのプレフィックス安定性を保つ。
 */
export function buildServerTools({ webSearch, webFetch, codeExecution } = {}) {
  const tools = [];
  if (webSearch) tools.push(SERVER_TOOL_DEFS.webSearch);
  if (webFetch) tools.push(SERVER_TOOL_DEFS.webFetch);
  if (codeExecution) tools.push(SERVER_TOOL_DEFS.codeExecution);
  return tools;
}
