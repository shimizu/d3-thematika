const MESSAGE_SOURCE = "thematika-playground";
const RENDER_TIMEOUT_MS = 8000;

// thematika.umd.js の場所は配信形態で異なる:
// ローカル（リポジトリroot配信）は ../dist/、site/ 配下へのコピー公開時は ../js/。
const LIBRARY_CANDIDATES = ["../dist/thematika.umd.js", "../js/thematika.umd.js"];

function escapeScriptContent(source) {
  return String(source ?? "").replace(/<\/script>/gi, "<\\/script>");
}

/**
 * プレビューiframeの実行環境。
 *
 * - アップロードデータへの fetch shim: 生成コードは `d3.json('./data/<name>')` で
 *   データを読む規約。iframe内のfetchを差し替え、親windowに置いたデータで解決する。
 *   これによりプレビューとエクスポート後のコードが同一になる。
 * - console/エラーの捕捉: postMessageで親へ転送し、UIコンソール表示と
 *   render_preview ツールの戻り値（自己修正ループの材料）の両方に使う。
 * - 描画完了レポート: ユーザースクリプト完了後にSVG要素数を集計して返す。
 */
export class PreviewRunner {
  #frame;
  #onConsole;
  #libraryUrl = null;
  #runId = 0;
  #currentRun = null;

  /**
   * @param {object} options
   * @param {HTMLIFrameElement} options.frame - プレビュー用iframe
   * @param {(level: string, message: string) => void} [options.onConsole] - コンソール転送先
   */
  constructor({ frame, onConsole } = {}) {
    this.#frame = frame;
    this.#onConsole = onConsole ?? (() => {});

    globalThis.addEventListener?.("message", (event) => {
      const data = event.data;
      if (data?.source !== MESSAGE_SOURCE) return;
      this.#handleMessage(data);
    });
  }

  /** 配信形態ごとに異なるUMDライブラリの場所を実在チェックで解決する（結果はキャッシュ）。 */
  async resolveLibraryUrl() {
    if (this.#libraryUrl) return this.#libraryUrl;
    for (const candidate of LIBRARY_CANDIDATES) {
      const url = new URL(candidate, globalThis.location.href).href;
      try {
        const response = await fetch(url, { method: "HEAD" });
        if (response.ok) {
          this.#libraryUrl = url;
          return url;
        }
      } catch {
        // 次の候補を試す。
      }
    }
    throw new Error(
      "thematika.umd.js が見つかりません。npm run build を実行してから起動してください。",
    );
  }

  /**
   * コードをプレビューiframeで実行し、コンソール出力とSVG統計を返す。
   * @param {object} params
   * @param {string} params.html - bodyに挿入するHTML
   * @param {string} params.css - 適用するCSS
   * @param {string} params.js - 実行するJavaScript
   * @param {Record<string, object>} params.dataMap - name -> GeoJSONオブジェクト
   * @returns {Promise<{logs: Array<{level: string, message: string}>, errors: string[], svgStats: object|null, timedOut: boolean}>}
   */
  async run({ html, css, js, dataMap = {} }) {
    const libraryUrl = await this.resolveLibraryUrl();

    // 前回実行の未解決Promiseがあれば打ち切って解決させる
    // （古いiframeからのメッセージはrunId不一致で無視される）。
    this.#currentRun?.finish({ timedOut: true });

    const runId = ++this.#runId;
    const logs = [];
    const errors = [];

    // fetch shim が参照するデータを親windowへ置く（srcdocへの埋め込みを避け、大きなデータでも速い）。
    globalThis.__thematikaPreviewData = dataMap;

    const resultPromise = new Promise((resolve) => {
      const timer = setTimeout(() => {
        finish({ timedOut: true });
      }, RENDER_TIMEOUT_MS);

      const finish = ({ svgStats = null, timedOut = false } = {}) => {
        if (this.#currentRun?.runId !== runId) return;
        clearTimeout(timer);
        this.#currentRun = null;
        resolve({ logs, errors, svgStats, timedOut });
      };

      this.#currentRun = { runId, logs, errors, finish };
    });

    this.#frame.srcdoc = this.#buildDocument({ html, css, js, libraryUrl, runId });
    return resultPromise;
  }

  #handleMessage(data) {
    const run = this.#currentRun;
    if (!run || data.runId !== run.runId) return;

    if (data.type === "render-report") {
      run.finish({ svgStats: data.svgStats ?? null });
      return;
    }

    const message = String(data.message ?? "");
    run.logs.push({ level: data.type, message });
    if (data.type === "error") run.errors.push(message);
    this.#onConsole(data.type, message);
  }

  #buildDocument({ html, css, js, libraryUrl, runId }) {
    const userScript = escapeScriptContent(js);
    const userCss = escapeScriptContent(css);
    const userHtml = String(html ?? "");

    return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://d3js.org/d3.v7.min.js"><\/script>
  <script src="https://cdn.jsdelivr.net/npm/d3-geo-projection@4"><\/script>
  <script src="${libraryUrl}"><\/script>
  <style>
    html, body {
      margin: 0;
      min-height: 100%;
    }
    ${userCss}
  </style>
</head>
<body>
  ${userHtml}
  <script>
    const RUN_ID = ${runId};
    const send = (type, payload) => {
      window.parent.postMessage({
        source: '${MESSAGE_SOURCE}',
        runId: RUN_ID,
        type,
        ...payload
      }, '*');
    };

    const sendConsole = (type, args) => {
      send(type, {
        message: args.map((arg) => {
          if (typeof arg === 'string') return arg;
          if (arg instanceof Error) return arg.stack || arg.message;
          try {
            return JSON.stringify(arg, null, 2);
          } catch {
            return String(arg);
          }
        }).join(' ')
      });
    };

    ['log', 'warn', 'error'].forEach((level) => {
      const original = console[level];
      console[level] = (...args) => {
        sendConsole(level, args);
        original.apply(console, args);
      };
    });

    window.addEventListener('error', (event) => {
      sendConsole('error', [event.message]);
    });

    window.addEventListener('unhandledrejection', (event) => {
      sendConsole('error', [event.reason?.stack || event.reason?.message || String(event.reason)]);
    });

    // fetch shim: './data/<name>' へのリクエストを親windowのアップロードデータで解決する。
    // 生成コードはエクスポート後（実ファイル配置）と同一のままプレビューで動く。
    const originalFetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
      const url = typeof input === 'string' ? input : input?.url || '';
      const match = url.match(/^(?:\\.\\/)?data\\/(.+)$/);
      if (match) {
        const name = decodeURIComponent(match[1]);
        const dataMap = window.parent.__thematikaPreviewData || {};
        const data = dataMap[name];
        if (data !== undefined) {
          return Promise.resolve(new Response(JSON.stringify(data), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }));
        }
        return Promise.resolve(new Response(
          JSON.stringify({ error: 'データ「' + name + '」はアップロードされていません。' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        ));
      }
      return originalFetch(input, init);
    };

    window.d3GeoProjection = window.d3;

    const reportRender = () => {
      const count = (selector) => document.querySelectorAll(selector).length;
      send('render-report', {
        svgStats: {
          svgCount: count('svg'),
          pathCount: count('svg path'),
          circleCount: count('svg circle'),
          rectCount: count('svg rect'),
          textCount: count('svg text'),
          imageCount: count('svg image')
        }
      });
    };

    (async () => {
      try {
        ${userScript}
      } catch (error) {
        console.error(error && error.stack ? error.stack : String(error));
      } finally {
        // レイアウト・描画の反映を待ってからDOMを集計する。
        requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(reportRender, 100)));
      }
    })();
  <\/script>
</body>
</html>`;
  }
}
