const CLAUDE_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

// 一時的な障害（レート制限・過負荷・サーバーエラー）は指数バックオフで再試行する。
const RETRYABLE_STATUSES = new Set([429, 500, 529]);
const DEFAULT_MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 1000;

/**
 * 中断シグナルを尊重しながら指定ミリ秒待機する。
 * 待機中にabortされたら即座にAbortErrorで失敗させ、無駄な再試行を防ぐ。
 */
function delay(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener?.("abort", onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    }
    signal?.addEventListener?.("abort", onAbort, { once: true });
  });
}

/**
 * Retry-Afterヘッダ（秒）を優先し、なければ指数バックオフの待機時間を決める。
 */
function backoffMs(response, attempt) {
  const retryAfter = Number(response?.headers?.get?.("retry-after"));
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    return retryAfter * 1000;
  }
  return BASE_BACKOFF_MS * 2 ** attempt;
}

/**
 * Claude Messages APIを呼び出す薄いクライアント。
 * Agent RuntimeからHTTPの詳細を分離し、テスト時に差し替えやすくする。
 */
export async function callClaude({
  apiKey,
  model,
  messages,
  tools,
  system,
  maxTokens = 16000,
  signal,
  maxRetries = DEFAULT_MAX_RETRIES,
  fetchImpl = globalThis.fetch,
}) {
  if (!apiKey) {
    throw new Error("Claude APIキーが設定されていません。");
  }

  const body = {
    model,
    max_tokens: maxTokens,
    messages,
  };

  // システムプロンプトはプロンプトキャッシュ対象にする。
  // レンダー順は tools → system のため、systemブロックのbreakpointで tools+system がまとめてキャッシュされる。
  if (system) {
    body.system =
      typeof system === "string"
        ? [
            {
              type: "text",
              text: system,
              cache_control: { type: "ephemeral" },
            },
          ]
        : system;
  }
  if (tools && tools.length > 0) body.tools = tools;

  let lastResponse = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetchImpl(CLAUDE_MESSAGES_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify(body),
      signal,
    });

    if (response.ok) {
      return response.json();
    }

    // リトライ可能なステータスで、まだ試行回数が残っていれば待って再試行する。
    if (RETRYABLE_STATUSES.has(response.status) && attempt < maxRetries) {
      lastResponse = response;
      await delay(backoffMs(response, attempt), signal);
      continue;
    }

    const payload = await response.json().catch(() => null);
    const message =
      payload?.error?.message ??
      `Claude APIの呼び出しに失敗しました（HTTP ${response.status}）。`;
    throw new Error(message);
  }

  // ループを抜けた＝再試行が尽きた場合。最後のレスポンスからエラーメッセージを組み立てる。
  const payload = await lastResponse?.json().catch(() => null);
  const message =
    payload?.error?.message ??
    `Claude APIの呼び出しに失敗しました（HTTP ${lastResponse?.status ?? "?"}、再試行上限）。`;
  throw new Error(message);
}
