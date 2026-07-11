import { useEffect, useMemo, useRef, useState } from "react";
import { callClaude } from "./agent/claude-client.js";
import { ConversationStore } from "./agent/conversation-store.js";
import { runAgent } from "./agent/runtime.js";
import { composeSystemPrompt } from "./agent/system-prompt.js";
import AnalysisPanel from "./components/AnalysisPanel.jsx";
import ApiSettings from "./components/ApiSettings.jsx";
import ChatPanel from "./components/ChatPanel.jsx";
import DatasetPanel from "./components/DatasetPanel.jsx";
import DebugPanel from "./components/DebugPanel.jsx";
import ExecutionLog from "./components/ExecutionLog.jsx";
import { AnalysisResultStore } from "./data/analysis-store.js";
import { DatasetStore } from "./data/dataset-store.js";
import {
  SCENARIOS,
  evaluateScenario,
  resolvePrompt,
} from "./test-harness/scenarios.js";
import { searchStatsTables } from "./tools/estat-client.js";
import { createAppToolRegistry } from "./tools/register-tools.js";
import { buildServerTools } from "./tools/server-tools.js";
import {
  analysisToJson,
  downloadText,
  recordsToCsv,
  sanitizeFilename,
} from "./utils/export.js";

const WELCOME_MESSAGE = {
  id: "welcome",
  role: "assistant",
  content:
    "分析したい統計について入力してください。統計表の検索、データ取得、分析を順に実行します。",
};

const datasetStore = new DatasetStore();
const analysisStore = new AnalysisResultStore();
const conversationStore = new ConversationStore();
const SYSTEM_PROMPT = composeSystemPrompt();
const MAX_LOG_ENTRIES = 300;

const API_KEY_STORAGE = "estat-agent.apiKey";
const ESTAT_APP_ID_STORAGE = "estat-agent.estatAppId";
const MODEL_STORAGE = "estat-agent.model";
const MAX_TOKENS_STORAGE = "estat-agent.maxTokens";
const TOOL_WEB_SEARCH_STORAGE = "estat-agent.tools.webSearch";
const TOOL_WEB_FETCH_STORAGE = "estat-agent.tools.webFetch";
const TOOL_CODE_EXEC_STORAGE = "estat-agent.tools.codeExecution";
const DEFAULT_MODEL = "claude-sonnet-4-6";
const DEFAULT_MAX_TOKENS = 16000;

// ?debug=true のときだけデバッグハーネスを表示する（本番利用には影響しない）。
const IS_DEBUG =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("debug") === "true";

// localStorageはSSRやアクセス制限環境で例外を投げ得るため、安全に読み書きする。
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

/**
 * 永続化されたAnthropic形式の会話履歴から、画面表示用のチャットバブルを復元する。
 * userの自然言語依頼とassistantの最終テキストだけを取り出し、tool_use/tool_resultは除く。
 */
function toDisplayMessages(apiMessages) {
  const bubbles = [];
  apiMessages.forEach((message, index) => {
    if (message.role === "user" && typeof message.content === "string") {
      bubbles.push({
        id: `restored-${index}`,
        role: "user",
        content: message.content,
      });
      return;
    }
    if (message.role === "assistant" && Array.isArray(message.content)) {
      const text = message.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("\n")
        .trim();
      if (text) {
        // tool_useを含むターンは「途中経過」、含まない最終ターンは通常回答として区別する。
        const isProgress = message.content.some(
          (block) => block.type === "tool_use",
        );
        bubbles.push({
          id: `restored-${index}`,
          role: "assistant",
          content: text,
          ...(isProgress ? { kind: "progress" } : {}),
        });
      }
    }
  });
  return bubbles;
}

function initialDisplayMessages() {
  return [WELCOME_MESSAGE, ...toDisplayMessages(conversationStore.getMessages())];
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

function App() {
  const [messages, setMessages] = useState(initialDisplayMessages);
  const [logs, setLogs] = useState([]);
  const [datasets, setDatasets] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [apiKey, setApiKey] = useState(() => loadSetting(API_KEY_STORAGE));
  const [estatAppId, setEstatAppId] = useState(() =>
    loadSetting(ESTAT_APP_ID_STORAGE),
  );
  const [model, setModel] = useState(
    () => loadSetting(MODEL_STORAGE) || DEFAULT_MODEL,
  );
  const [maxTokens, setMaxTokens] = useState(
    () =>
      Number(loadSetting(MAX_TOKENS_STORAGE, String(DEFAULT_MAX_TOKENS))) ||
      DEFAULT_MAX_TOKENS,
  );
  // サーバー側ツールは別途課金されるため、既定はオフ（オプトイン）。
  const [toolWebSearch, setToolWebSearch] = useState(
    () => loadSetting(TOOL_WEB_SEARCH_STORAGE) === "true",
  );
  const [toolWebFetch, setToolWebFetch] = useState(
    () => loadSetting(TOOL_WEB_FETCH_STORAGE) === "true",
  );
  const [toolCodeExec, setToolCodeExec] = useState(
    () => loadSetting(TOOL_CODE_EXEC_STORAGE) === "true",
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  // デバッグハーネスのシナリオ別実行状態（id -> { status, toolCalls, result, evaluation }）。
  const [debugStates, setDebugStates] = useState({});
  // データセット依存シナリオ（固定集計・JS実行）が対象にする保存済みデータセットID。
  const [debugDatasetId, setDebugDatasetId] = useState("");
  const abortControllerRef = useRef(null);

  // e-Stat の appId はユーザー入力（state）なので、変更時だけツールレジストリを
  // 作り直す。datasetStore / analysisStore はモジュールスコープで参照を維持する。
  const toolRegistry = useMemo(
    () => createAppToolRegistry(datasetStore, analysisStore, { estatAppId }),
    [estatAppId],
  );

  useEffect(() => datasetStore.subscribe(setDatasets), []);
  useEffect(() => analysisStore.subscribe(setAnalyses), []);

  const handleAbort = () => {
    abortControllerRef.current?.abort();
  };

  const handleReset = () => {
    if (isRunning) return;
    conversationStore.clear();
    datasetStore.clear();
    analysisStore.clear();
    setMessages([WELCOME_MESSAGE]);
    setLogs([]);
  };

  // APIキーとモデルをブラウザへ保存し、設定ダイアログを閉じる。
  const handleSaveSettings = () => {
    saveSetting(API_KEY_STORAGE, apiKey);
    saveSetting(ESTAT_APP_ID_STORAGE, estatAppId);
    saveSetting(MODEL_STORAGE, model);
    saveSetting(MAX_TOKENS_STORAGE, String(maxTokens));
    saveSetting(TOOL_WEB_SEARCH_STORAGE, String(toolWebSearch));
    saveSetting(TOOL_WEB_FETCH_STORAGE, String(toolWebFetch));
    saveSetting(TOOL_CODE_EXEC_STORAGE, String(toolCodeExec));
    setIsSettingsOpen(false);
  };

  // 保存済みの Claude APIキーと e-Stat appId をまとめて削除する（モデル設定は残す）。
  const handleDeleteKey = () => {
    setApiKey("");
    removeSetting(API_KEY_STORAGE);
    setEstatAppId("");
    removeSetting(ESTAT_APP_ID_STORAGE);
  };

  // 取得済みデータセットをCSV/JSONでダウンロードする（生レコードはメモリ保持）。
  const handleExportDataset = (id, format) => {
    let dataset;
    try {
      dataset = datasetStore.get(id);
    } catch {
      // リロード等で生レコードが失われている場合は何もしない。
      return;
    }

    const baseName = `${sanitizeFilename(
      dataset.title || dataset.statsDataId,
    )}_${dataset.id}`;

    if (format === "csv") {
      // ExcelでUTF-8日本語が文字化けしないようBOMを付与する。
      const csv = `﻿${recordsToCsv(dataset.columns, dataset.records)}`;
      downloadText(`${baseName}.csv`, csv, "text/csv");
      return;
    }

    const json = JSON.stringify(
      {
        id: dataset.id,
        statsDataId: dataset.statsDataId,
        title: dataset.title,
        filters: dataset.filters,
        columns: dataset.columns,
        measures: dataset.measures,
        records: dataset.records,
        createdAt: dataset.createdAt,
      },
      null,
      2,
    );
    downloadText(`${baseName}.json`, json, "application/json");
  };

  // 分析ログをJSON/CSV/JS形式でダウンロードする（本体はメモリ保持時のみ）。
  const handleExportAnalysis = (id, format) => {
    let analysis;
    try {
      analysis = analysisStore.get(id);
    } catch {
      // リロード等で本体が失われている場合は何もしない。
      return;
    }

    const baseName = `${sanitizeFilename(analysis.datasetId)}_${analysis.id}_analysis`;

    if (format === "csv") {
      // ExcelでUTF-8日本語が文字化けしないようBOMを付与する。
      const csv = `﻿${recordsToCsv(
        analysis.resultColumns ?? [],
        analysis.rows ?? [],
      )}`;
      downloadText(`${baseName}.csv`, csv, "text/csv");
      return;
    }

    if (format === "js") {
      // JS実行ログは生成コード本文を単体で書き出す（再実行・監査用）。
      downloadText(`${baseName}.js`, analysis.code ?? "", "text/javascript");
      return;
    }

    downloadText(`${baseName}.json`, analysisToJson(analysis), "application/json");
  };

  // 全分析ログを1つのJSON配列としてまとめて書き出す（監査証跡）。
  const handleExportAllAnalyses = () => {
    const all = analyses
      .map((summary) => {
        try {
          return JSON.parse(analysisToJson(analysisStore.get(summary.id)));
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    if (all.length === 0) return;
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    downloadText(
      `analyses_${stamp}.json`,
      JSON.stringify(all, null, 2),
      "application/json",
    );
  };

  // エージェントのMarkdown回答を.mdファイルとしてダウンロードする。
  const handleExportReport = (message) => {
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    downloadText(`report_${stamp}.md`, message.content, "text/markdown");
  };

  // デバッグハーネス: 1シナリオを本番経路（実callClaude・共有ストア）で実行し、
  // ツール呼び出し列を観測して期待値と照合する。会話履歴には残さない（messages:[]）。
  // requiresDataset のシナリオは保存済みデータセットを対象にするため、対象IDを解決して
  // プロンプトへ差し込む（取得テストと分離し、集計・JS実行を e-Stat 非依存にする）。
  const runDebugScenario = async (scenario, explicitDatasetId) => {
    // 疎通確認: runAgent/ツールを通さず callClaude を直接叩き、APIキー・接続の有効性だけを見る。
    if (scenario.directPing) {
      setDebugStates((current) => ({
        ...current,
        [scenario.id]: { status: "running", toolCalls: [] },
      }));
      try {
        const response = await callClaude({
          apiKey,
          model,
          maxTokens: 64,
          system: "接続確認です。指示どおり短く返答してください。",
          messages: [
            { role: "user", content: "接続確認です。「OK」とだけ返答してください。" },
          ],
          tools: [],
        });
        const content = (response?.content ?? [])
          .filter((block) => block.type === "text")
          .map((block) => block.text)
          .join("")
          .trim();
        const result = {
          status: "completed",
          content,
          stopReason: response?.stop_reason,
        };
        const ctx = { toolCalls: [], result, datasets: [], analyses: [] };
        const evaluation = evaluateScenario(scenario, ctx);
        setDebugStates((current) => ({
          ...current,
          [scenario.id]: { status: "done", toolCalls: [], result, evaluation },
        }));
        return evaluation;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setDebugStates((current) => ({
          ...current,
          [scenario.id]: { status: "error", toolCalls: [], error: message },
        }));
        return null;
      }
    }

    // e-Stat疎通確認: runAgent/Claudeを通さず searchStatsTables を直接叩き、
    // サーバー稼働・接続の有効性だけを見る（Claude APIキー不要）。
    if (scenario.estatPing) {
      setDebugStates((current) => ({
        ...current,
        [scenario.id]: { status: "running", toolCalls: [] },
      }));
      try {
        const response = await searchStatsTables(
          {
            searchWord: "輸入",
            limit: 1,
          },
          { appId: estatAppId },
        );
        const result = {
          status: "completed",
          tableCount: response?.tables?.length ?? 0,
          totalCount: response?.total,
          content: `e-Stat検索ヒット ${response?.total ?? "?"}件`,
        };
        const ctx = { toolCalls: [], result, datasets: [], analyses: [] };
        const evaluation = evaluateScenario(scenario, ctx);
        setDebugStates((current) => ({
          ...current,
          [scenario.id]: { status: "done", toolCalls: [], result, evaluation },
        }));
        return evaluation;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setDebugStates((current) => ({
          ...current,
          [scenario.id]: { status: "error", toolCalls: [], error: message },
        }));
        return null;
      }
    }

    let instruction;
    // seedDataset シナリオは実行前に内蔵フィクスチャを一時投入し、終了後に削除する。
    let seededId = null;

    if (scenario.seedDataset) {
      const stored = datasetStore.add(scenario.seedDataset);
      seededId = stored.id;
      instruction = resolvePrompt(scenario, stored.id);
    } else if (scenario.requiresDataset) {
      const available = datasetStore.list().filter((d) => d.available);
      const targetId =
        explicitDatasetId ||
        (available.some((d) => d.id === debugDatasetId)
          ? debugDatasetId
          : available.at(-1)?.id);
      if (!targetId) {
        setDebugStates((current) => ({
          ...current,
          [scenario.id]: {
            status: "error",
            toolCalls: [],
            error:
              "保存済みのデータセットがありません。先に「データ取得」を実行してください。",
          },
        }));
        return null;
      }
      instruction = resolvePrompt(scenario, targetId);
    } else {
      instruction = resolvePrompt(scenario);
    }

    setDebugStates((current) => ({
      ...current,
      [scenario.id]: { status: "running", toolCalls: [] },
    }));

    const toolCalls = [];
    const controller = new AbortController();

    try {
      const result = await runAgent({
        instruction,
        messages: [],
        toolRegistry,
        system: SYSTEM_PROMPT,
        signal: controller.signal,
        callModel: (request) =>
          callClaude({ ...request, apiKey, model, maxTokens }),
        onEvent: (event) => {
          if (event.type === "tool_start") {
            toolCalls.push({ name: event.name, input: event.input });
          }
        },
      });

      const ctx = {
        toolCalls,
        result,
        datasets: datasetStore.list(),
        // 数値の正しさを照合するため、要約でなくrows/codeを含む完全ログを渡す。
        analyses: analysisStore.list().map((s) => {
          try {
            return analysisStore.get(s.id);
          } catch {
            return s;
          }
        }),
      };
      const evaluation = evaluateScenario(scenario, ctx);

      setDebugStates((current) => ({
        ...current,
        [scenario.id]: { status: "done", toolCalls, result, evaluation },
      }));
      return evaluation;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setDebugStates((current) => ({
        ...current,
        [scenario.id]: { status: "error", toolCalls, error: message },
      }));
      return null;
    } finally {
      // 投入したテスト用フィクスチャはストア/IndexedDBへ残さない。
      if (seededId) datasetStore.remove(seededId);
    }
  };

  // デバッグハーネスのリセット：シナリオ結果（デバッグログ）・データセット・分析ログを消す。
  const handleDebugReset = () => {
    setDebugStates({});
    setDebugDatasetId("");
    datasetStore.clear();
    analysisStore.clear();
  };

  // すべてのシナリオを依存順（取得→データセット依存）で実行する。取得で保存された
  // 最新データセットIDを後続の集計・JS実行へ引き継ぎ、state更新の遅延を避ける。
  const runAllDebugScenarios = async () => {
    for (const scenario of SCENARIOS) {
      // eslint-disable-next-line no-await-in-loop
      const latestId = datasetStore
        .list()
        .filter((d) => d.available)
        .at(-1)?.id;
      // eslint-disable-next-line no-await-in-loop
      await runDebugScenario(scenario, scenario.requiresDataset ? latestId : undefined);
    }
  };

  const handleSubmit = async (content) => {
    const message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
    };

    setMessages((current) => [...current, message]);

    // e-Stat の appId が未設定だと検索・取得が認証エラーになる。エージェントを
    // 走らせる前に案内して止める（無駄なリトライ・API消費を防ぐ）。
    if (!estatAppId) {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "e-Stat アプリケーションIDが未設定です。「API設定」で入力してください（https://www.e-stat.go.jp/api/ で発行できます）。",
        },
      ]);
      return;
    }

    setIsRunning(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const result = await runAgent({
        instruction: content,
        messages: conversationStore.getMessages(),
        toolRegistry,
        system: SYSTEM_PROMPT,
        signal: controller.signal,
        callModel: (request) =>
          callClaude({
            ...request,
            tools: [
              ...request.tools,
              ...buildServerTools({
                webSearch: toolWebSearch,
                webFetch: toolWebFetch,
                codeExecution: toolCodeExec,
              }),
            ],
            apiKey,
            model,
            maxTokens,
          }),
        onEvent: (event) => {
          // モデルの途中解説はチャットへ「途中経過」として出し、実行ログには載せない。
          if (event.type === "assistant_text") {
            setMessages((current) => [
              ...current,
              {
                id: crypto.randomUUID(),
                role: "assistant",
                kind: "progress",
                content: event.text,
              },
            ]);
            return;
          }

          setLogs((current) =>
            [
              ...current,
              {
                id: crypto.randomUUID(),
                message: describeEvent(event),
              },
            ].slice(-MAX_LOG_ENTRIES),
          );
        },
      });

      // 次ターンへ文脈を引き継ぐため、更新後の会話履歴を保存する。
      conversationStore.setMessages(result.messages);

      const pushAssistant = (extra) =>
        setMessages((current) => [
          ...current,
          { id: crypto.randomUUID(), role: "assistant", ...extra },
        ]);

      if (result.status === "iteration_limit") {
        // 反復上限で停止したことを分かりやすく明示する。
        pushAssistant({
          kind: "notice",
          content:
            "⚠️ 反復上限に達したため、処理を途中で停止しました。続けて送信すると取得済みの情報から再開できます。対象の国や期間を絞ると、より確実に完了します。",
        });
        if (result.content) {
          pushAssistant({ content: result.content });
        }
      } else {
        const response =
          result.content ||
          (result.status === "aborted"
            ? "処理を中断しました。"
            : `処理を完了できませんでした（状態: ${result.status}）。`);
        pushAssistant({ content: response });
      }
    } catch (error) {
      const aborted = error?.name === "AbortError";
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: aborted ? "処理を中断しました。" : `エラー: ${errorMessage}`,
        },
      ]);
    } finally {
      abortControllerRef.current = null;
      setIsRunning(false);
    }
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Browser-based statistical agent</p>
          <h1>e-Stat Web AI Agent</h1>
        </div>
        <ApiSettings
          isDebug={IS_DEBUG}
          apiKey={apiKey}
          estatAppId={estatAppId}
          model={model}
          maxTokens={maxTokens}
          toolWebSearch={toolWebSearch}
          isOpen={isSettingsOpen}
          onToggle={() => setIsSettingsOpen((current) => !current)}
          onApiKeyChange={setApiKey}
          onEstatAppIdChange={setEstatAppId}
          onModelChange={setModel}
          onMaxTokensChange={setMaxTokens}
          onToolWebSearchChange={setToolWebSearch}
          onSave={handleSaveSettings}
          onDeleteKey={handleDeleteKey}
        />
      </header>

      <main className="workspace">
        {/* デバッグモードでは統計分析チャットを隠し、その位置にデバッグパネルを表示する。 */}
        {IS_DEBUG ? (
          <DebugPanel
            scenarios={SCENARIOS}
            states={debugStates}
            apiKeyPresent={Boolean(apiKey)}
            estatAppIdPresent={Boolean(estatAppId)}
            availableDatasets={datasets.filter((d) => d.available)}
            selectedDatasetId={debugDatasetId}
            onSelectDataset={setDebugDatasetId}
            onRun={runDebugScenario}
            onRunAll={runAllDebugScenarios}
            onReset={handleDebugReset}
          />
        ) : (
          <ChatPanel
            messages={messages}
            isRunning={isRunning}
            onSubmit={handleSubmit}
            onAbort={handleAbort}
            onReset={handleReset}
            onExportReport={handleExportReport}
          />
        )}

        <aside className="side-panel">
          {/* 実行ログはデバッグモードでは使われないため非表示にする。 */}
          {!IS_DEBUG && <ExecutionLog logs={logs} />}
          <DatasetPanel datasets={datasets} onExport={handleExportDataset} />
          <AnalysisPanel
            analyses={analyses}
            onExport={handleExportAnalysis}
            onExportAll={handleExportAllAnalyses}
          />
          <p className="privacy-note">
            会話と取得データの要約はこのブラウザのlocalStorageに保存され、リロード後も復元されます。
            「新しい会話」で削除できます。共有端末では使用後に削除してください。
          </p>
        </aside>
      </main>
    </div>
  );
}

export default App;
