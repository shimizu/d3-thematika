import { callClaude } from "./agent/claude-client.js";
import { ConversationStore } from "./agent/conversation-store.js";
import { runAgent } from "./agent/runtime.js";
import {
  composeSystemPrompt,
  loadThematikaReference,
} from "./agent/system-prompt.js";
import { GeoDataStore } from "./data-store.js";
import { exportProject } from "./export.js";
import { PreviewRunner } from "./preview.js";
import { createPlaygroundToolRegistry } from "./tools/register-tools.js";

const API_KEY_STORAGE = "thematika-playground.apiKey";
const MODEL_STORAGE = "thematika-playground.model";
const MAX_TOKENS_STORAGE = "thematika-playground.maxTokens";
const EDITOR_STORAGE = "thematika-playground.editors";
const DEFAULT_MODEL = "claude-sonnet-4-6";
const DEFAULT_MAX_TOKENS = 16000;
const MAX_LOG_ENTRIES = 300;

const WELCOME_MESSAGE =
  "GeoJSONをアップロードして、作りたい地図を日本語で指示してください。\n例:「都道府県を人口で5階級のコロプレスに。タイトルと凡例付きで」";

const DEFAULT_EDITORS = {
  html: '<div id="map"></div>\n',
  css: "#map {\n  width: 100%;\n  height: 600px;\n}\n",
  js: [
    "// 左のチャットでAIに指示すると、ここに描画コードが生成されます。",
    "// 手動で書くこともできます。プレビュー内では Thematika と d3 が使えます。",
    "// アップロードしたデータは await d3.json('./data/<ファイル名>') で読めます。",
    "",
  ].join("\n"),
};

// ── DOM ──────────────────────────────────────────────────────────

const el = (id) => document.getElementById(id);

const htmlEditor = el("html-editor");
const cssEditor = el("css-editor");
const jsEditor = el("js-editor");
const consoleOutput = el("console-output");
const chatMessages = el("chat-messages");
const chatForm = el("chat-form");
const chatInput = el("chat-input");
const chatSubmit = el("chat-submit");
const chatAbort = el("chat-abort");
const executionLog = el("execution-log");
const dataPanel = el("data-panel");
const dataList = el("data-list");
const fileInput = el("file-input");
const settingsPopover = el("settings-popover");
const apiKeyInput = el("api-key-input");
const modelInput = el("model-input");
const maxTokensInput = el("max-tokens-input");

// ── 設定（localStorage、参考実装と同一機構） ─────────────────────

function loadSetting(key, fallback = "") {
  try {
    return globalThis.localStorage?.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function saveSetting(key, value) {
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    // 保存失敗はメモリ保持のみで継続する。
  }
}

function removeSetting(key) {
  try {
    globalThis.localStorage?.removeItem(key);
  } catch {
    // 削除失敗は無視する。
  }
}

let apiKey = loadSetting(API_KEY_STORAGE);
let model = loadSetting(MODEL_STORAGE) || DEFAULT_MODEL;
let maxTokens =
  Number(loadSetting(MAX_TOKENS_STORAGE, String(DEFAULT_MAX_TOKENS))) ||
  DEFAULT_MAX_TOKENS;

// ── エディタ ─────────────────────────────────────────────────────

const editors = {
  get: () => ({
    html: htmlEditor.value,
    css: cssEditor.value,
    js: jsEditor.value,
  }),
  set: (partial) => {
    if (typeof partial.html === "string") htmlEditor.value = partial.html;
    if (typeof partial.css === "string") cssEditor.value = partial.css;
    if (typeof partial.js === "string") jsEditor.value = partial.js;
    persistEditors();
  },
};

function persistEditors() {
  saveSetting(EDITOR_STORAGE, JSON.stringify(editors.get()));
}

function restoreEditors() {
  try {
    const saved = JSON.parse(loadSetting(EDITOR_STORAGE) || "null");
    if (saved?.html || saved?.css || saved?.js) {
      editors.set({ ...DEFAULT_EDITORS, ...saved });
      return;
    }
  } catch {
    // 壊れた保存状態は無視して初期値を使う。
  }
  editors.set(DEFAULT_EDITORS);
}

// ── コンソール表示 ───────────────────────────────────────────────

function appendConsole(level, message) {
  const prefix = level.toUpperCase().padEnd(5, " ");
  consoleOutput.textContent += `[${prefix}] ${message}\n`;
  consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

// ── ストアとプレビュー ───────────────────────────────────────────

const dataStore = new GeoDataStore();
const conversationStore = new ConversationStore();
const previewRunner = new PreviewRunner({
  frame: el("preview-frame"),
  onConsole: appendConsole,
});

function buildDataMap() {
  const map = {};
  for (const summary of dataStore.list()) {
    if (!summary.available) continue;
    map[summary.name] = dataStore.get(summary.name);
  }
  return map;
}

async function runPreview() {
  consoleOutput.textContent = "";
  return previewRunner.run({ ...editors.get(), dataMap: buildDataMap() });
}

const toolRegistry = createPlaygroundToolRegistry({
  dataStore,
  editors,
  runPreview,
});

// システムプロンプトは起動時に一度だけ組み立てる（リファレンスはfetch）。
const systemPromptPromise = loadThematikaReference().then((reference) => {
  if (!reference) {
    console.warn(
      "d3-thematikaリファレンス（docs/d3-thematika_llm.md）を取得できませんでした。ベースプロンプトのみで動作します。",
    );
  }
  return composeSystemPrompt(reference);
});

// ── チャット表示 ─────────────────────────────────────────────────

function addChatMessage(role, content, kind) {
  const div = document.createElement("div");
  div.className = `chat-message ${kind ?? role}`;
  div.textContent = content;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return div;
}

function addLog(message) {
  const li = document.createElement("li");
  li.textContent = message;
  executionLog.appendChild(li);
  while (executionLog.children.length > MAX_LOG_ENTRIES) {
    executionLog.removeChild(executionLog.firstChild);
  }
  executionLog.scrollTop = executionLog.scrollHeight;
}

function describeEvent(event) {
  switch (event.type) {
    case "model_request":
      return `Claudeへ第${event.iteration}回のリクエストを送信`;
    case "model_response":
      return `Claude応答: ${event.stopReason}`;
    case "tool_start":
      return `ツール開始: ${event.name}`;
    case "tool_success":
      return `ツール完了: ${event.name}`;
    case "tool_error":
      return `ツール失敗: ${event.name} - ${event.message}`;
    default:
      return event.type;
  }
}

/**
 * 永続化されたAnthropic形式の会話履歴から表示用バブルを復元する。
 * userの依頼とassistantのテキストだけを取り出し、tool_use/tool_resultは除く。
 */
function restoreChatDisplay() {
  chatMessages.textContent = "";
  addChatMessage("assistant", WELCOME_MESSAGE);
  for (const message of conversationStore.getMessages()) {
    if (message.role === "user" && typeof message.content === "string") {
      addChatMessage("user", message.content);
      continue;
    }
    if (message.role === "assistant" && Array.isArray(message.content)) {
      const text = message.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("\n")
        .trim();
      if (!text) continue;
      const isProgress = message.content.some(
        (block) => block.type === "tool_use",
      );
      addChatMessage("assistant", text, isProgress ? "progress" : undefined);
    }
  }
}

// ── エージェント実行 ─────────────────────────────────────────────

let abortController = null;

function setRunning(running) {
  chatSubmit.disabled = running;
  chatInput.disabled = running;
  chatAbort.hidden = !running;
}

async function handleChatSubmit(content) {
  addChatMessage("user", content);

  if (!apiKey) {
    addChatMessage(
      "assistant",
      "Claude APIキーが未設定です。「API設定」から入力してください（https://platform.claude.com/ で取得できます）。",
      "notice",
    );
    settingsPopover.hidden = false;
    return;
  }

  setRunning(true);
  const runningIndicator = addChatMessage("assistant", "考えています…", "running");
  abortController = new AbortController();

  try {
    const system = await systemPromptPromise;
    const result = await runAgent({
      instruction: content,
      messages: conversationStore.getMessages(),
      toolRegistry,
      system,
      signal: abortController.signal,
      callModel: (request) =>
        callClaude({ ...request, apiKey, model, maxTokens }),
      onEvent: (event) => {
        if (event.type === "assistant_text") {
          addChatMessage("assistant", event.text, "progress");
          return;
        }
        addLog(describeEvent(event));
      },
    });

    // 次ターンへ文脈を引き継ぐため、更新後の会話履歴を保存する。
    conversationStore.setMessages(result.messages);

    if (result.status === "iteration_limit") {
      addChatMessage(
        "assistant",
        "⚠️ 反復上限に達したため処理を途中で停止しました。続けて送信すると再開できます。指示を絞るとより確実に完了します。",
        "notice",
      );
      if (result.content) addChatMessage("assistant", result.content);
    } else {
      const response =
        result.content ||
        (result.status === "aborted"
          ? "処理を中断しました。"
          : `処理を完了できませんでした（状態: ${result.status}）。`);
      addChatMessage("assistant", response);
    }
  } catch (error) {
    const aborted = error?.name === "AbortError";
    const message = error instanceof Error ? error.message : String(error);
    addChatMessage(
      "assistant",
      aborted ? "処理を中断しました。" : `エラー: ${message}`,
      aborted ? undefined : "notice",
    );
  } finally {
    runningIndicator.remove();
    abortController = null;
    setRunning(false);
  }
}

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const content = chatInput.value.trim();
  if (!content || chatSubmit.disabled) return;
  chatInput.value = "";
  handleChatSubmit(content);
});

chatInput.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
    event.preventDefault();
    chatForm.requestSubmit();
  }
});

chatAbort.addEventListener("click", () => abortController?.abort());

el("new-conversation").addEventListener("click", () => {
  if (chatSubmit.disabled) return;
  conversationStore.clear();
  executionLog.textContent = "";
  restoreChatDisplay();
});

// ── データパネル ─────────────────────────────────────────────────

function formatBytes(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${bytes}B`;
}

function renderDataList(summaries) {
  dataList.textContent = "";
  for (const summary of summaries) {
    const li = document.createElement("li");
    li.className = "data-item";

    const nameRow = document.createElement("div");
    nameRow.className = "data-item-name";
    const nameSpan = document.createElement("span");
    nameSpan.textContent = summary.path;
    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.textContent = "削除";
    removeButton.addEventListener("click", () => dataStore.remove(summary.name));
    nameRow.append(nameSpan, removeButton);
    li.appendChild(nameRow);

    const meta = document.createElement("div");
    meta.className = "data-item-meta";
    meta.textContent = `${summary.featureCount} features / ${summary.geometryTypes.join(", ")} / ${formatBytes(summary.sizeBytes)}`;
    li.appendChild(meta);

    if (summary.windingSuspects > 0) {
      const warning = document.createElement("div");
      warning.className = "data-item-warning";
      warning.textContent = `⚠ ${summary.windingSuspects}個のポリゴンがD3と逆のリング順序（CCW）の疑い。描画が壊れる場合は scripts/fix-geojson-winding.js --d3 で修正してください。`;
      li.appendChild(warning);
    }

    if (!summary.available) {
      const warning = document.createElement("div");
      warning.className = "data-item-warning";
      warning.textContent =
        "⚠ 本体がこのセッションにありません（容量超過のため保存されませんでした）。再アップロードしてください。";
      li.appendChild(warning);
    }

    dataList.appendChild(li);
  }
}

dataStore.subscribe(renderDataList);

async function addFiles(files) {
  for (const file of files) {
    try {
      const text = await file.text();
      const summary = dataStore.add(file.name, text);
      addChatMessage(
        "assistant",
        `「${summary.path}」を追加しました（${summary.featureCount} features）。`,
        "progress",
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      addChatMessage("assistant", `「${file.name}」を追加できません: ${message}`, "notice");
    }
  }
}

fileInput.addEventListener("change", () => {
  addFiles([...fileInput.files]);
  fileInput.value = "";
});

["dragover", "dragenter"].forEach((type) => {
  dataPanel.addEventListener(type, (event) => {
    event.preventDefault();
    dataPanel.classList.add("drag-over");
  });
});

["dragleave", "drop"].forEach((type) => {
  dataPanel.addEventListener(type, (event) => {
    event.preventDefault();
    dataPanel.classList.remove("drag-over");
  });
});

dataPanel.addEventListener("drop", (event) => {
  const files = [...(event.dataTransfer?.files ?? [])];
  if (files.length > 0) addFiles(files);
});

// ── API設定 ──────────────────────────────────────────────────────

el("toggle-settings").addEventListener("click", () => {
  settingsPopover.hidden = !settingsPopover.hidden;
  if (!settingsPopover.hidden) {
    apiKeyInput.value = apiKey;
    modelInput.value = model;
    maxTokensInput.value = String(maxTokens);
  }
});

settingsPopover.addEventListener("submit", (event) => {
  event.preventDefault();
  apiKey = apiKeyInput.value.trim();
  model = modelInput.value.trim() || DEFAULT_MODEL;
  maxTokens = Number(maxTokensInput.value) || DEFAULT_MAX_TOKENS;
  saveSetting(API_KEY_STORAGE, apiKey);
  saveSetting(MODEL_STORAGE, model);
  saveSetting(MAX_TOKENS_STORAGE, String(maxTokens));
  settingsPopover.hidden = true;
});

el("delete-api-key").addEventListener("click", () => {
  apiKey = "";
  apiKeyInput.value = "";
  removeSetting(API_KEY_STORAGE);
});

// ── エディタ・プレビューの手動操作 ───────────────────────────────

document.querySelectorAll(".editor-tab").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".editor-tab").forEach((b) => {
      b.classList.toggle("active", b === button);
    });
    document.querySelectorAll(".editor-panel").forEach((panel) => {
      panel.classList.toggle("active", panel.dataset.panel === button.dataset.panel);
    });
  });
});

document.querySelectorAll(".viewer-tab").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".viewer-tab").forEach((b) => {
      b.classList.toggle("active", b === button);
    });
    document.querySelectorAll(".viewer-panel").forEach((panel) => {
      panel.classList.toggle(
        "active",
        panel.dataset.viewerPanel === button.dataset.viewerPanel,
      );
    });
  });
});

[htmlEditor, cssEditor, jsEditor].forEach((editor) => {
  editor.addEventListener("input", persistEditors);
  editor.addEventListener("keydown", (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      runPreview();
    }
  });
});

el("run-preview").addEventListener("click", () => runPreview());
el("clear-console").addEventListener("click", () => {
  consoleOutput.textContent = "";
});

// ── エクスポート ─────────────────────────────────────────────────

el("export-zip").addEventListener("click", async () => {
  try {
    const datasets = dataStore
      .list()
      .filter((summary) => summary.available)
      .map((summary) => ({
        name: summary.name,
        geojson: dataStore.get(summary.name),
      }));

    await exportProject({
      code: editors.get(),
      datasets,
      libraryUrl: await previewRunner.resolveLibraryUrl(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    addChatMessage("assistant", `エクスポートに失敗しました: ${message}`, "notice");
  }
});

// ── 初期化 ───────────────────────────────────────────────────────

restoreEditors();
restoreChatDisplay();
runPreview().catch((error) => {
  appendConsole("error", error instanceof Error ? error.message : String(error));
});
