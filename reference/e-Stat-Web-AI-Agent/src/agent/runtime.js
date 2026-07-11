import { compactConversation } from "./compaction.js";

const DEFAULT_MAX_ITERATIONS = 30;
export const TOOL_RESULT_CHAR_CAP = 8000;

const ITERATION_LIMIT_WRAP_UP =
  "反復上限に達し、これ以上ツールは使えません。ここまでに取得した統計表・データセット・分かったことを簡潔にまとめ、未完了なら残りの手順も示してください。";

function toText(content) {
  return content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

/**
 * 大きなツール結果をそのままLLMへ送るとトークンの無駄になるため、一定文字数で打ち切る。
 * fetch_stats_dataは既に要約済みだが、search/metadata等も含めて一律で上限を保証する。
 */
function capToolResultText(text) {
  if (text.length <= TOOL_RESULT_CHAR_CAP) return text;
  return `${text.slice(0, TOOL_RESULT_CHAR_CAP)}…（結果が大きいため省略しました。inspect_dataset等で必要な詳細だけ取得してください）`;
}

function createToolResult(call, result, isError = false) {
  const text =
    typeof result === "string" ? result : JSON.stringify(result ?? null);
  return {
    type: "tool_result",
    tool_use_id: call.id,
    content: capToolResultText(text),
    ...(isError ? { is_error: true } : {}),
  };
}

/**
 * Claudeのtool useをクライアント側で反復実行する。
 * API呼び出しとツール実装は注入し、ブラウザ以外でも単体テストできる形に保つ。
 */
export async function runAgent({
  instruction,
  messages: history = [],
  callModel,
  toolRegistry,
  system,
  maxIterations = DEFAULT_MAX_ITERATIONS,
  signal,
  onEvent = () => {},
}) {
  // 過去履歴を引き継いで会話を継続する。古いツール結果は縮約してトークンを抑える。
  const messages = [
    ...compactConversation(history),
    { role: "user", content: instruction },
  ];

  for (let iteration = 1; iteration <= maxIterations; iteration++) {
    if (signal?.aborted) {
      return { status: "aborted", messages };
    }

    onEvent({ type: "model_request", iteration });
    const response = await callModel({
      messages,
      tools: toolRegistry.definitions(),
      system,
      signal,
    });

    messages.push({ role: "assistant", content: response.content });
    onEvent({
      type: "model_response",
      iteration,
      stopReason: response.stop_reason,
    });

    if (response.stop_reason === "pause_turn") {
      // サーバー側ツール（web検索等）がAnthropic側の反復上限で中断した状態。
      // 追加のuserメッセージを足さず、同一履歴のまま再送すればサーバーが処理を継続する。
      const interimText = toText(response.content);
      if (interimText.trim()) {
        onEvent({ type: "assistant_text", iteration, text: interimText });
      }
      continue;
    }

    if (response.stop_reason === "tool_use") {
      // ツール実行の合間に出るモデルの解説テキストを、進行状況としてUIへ流す。
      const interimText = toText(response.content);
      if (interimText.trim()) {
        onEvent({ type: "assistant_text", iteration, text: interimText });
      }

      const calls = response.content.filter(
        (block) => block.type === "tool_use",
      );
      const results = [];

      // Dataset StoreやPython状態へ依存するツールがあるため、呼び出し順を維持する。
      for (const call of calls) {
        onEvent({
          type: "tool_start",
          iteration,
          name: call.name,
          input: call.input,
        });

        try {
          const result = await toolRegistry.execute(call.name, call.input, {
            signal,
          });
          results.push(createToolResult(call, result));
          onEvent({ type: "tool_success", iteration, name: call.name });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          results.push(createToolResult(call, message, true));
          onEvent({
            type: "tool_error",
            iteration,
            name: call.name,
            message,
          });
        }
      }

      messages.push({ role: "user", content: results });
      continue;
    }

    const content = toText(response.content);
    switch (response.stop_reason) {
      case "end_turn":
        return { status: "completed", content, messages };
      case "max_tokens":
        return { status: "truncated", content, messages };
      case "refusal":
        return { status: "refused", content, messages };
      default:
        return {
          status: "stopped",
          reason: response.stop_reason,
          content,
          messages,
        };
    }
  }

  // 反復上限に達しても何も返さないと利用者に進捗が伝わらないため、
  // ツール無しでもう一度だけ呼び、取得済みの情報で要約回答を作る。
  if (signal?.aborted) {
    return { status: "aborted", messages };
  }
  try {
    onEvent({ type: "model_request", iteration: maxIterations + 1 });
    const response = await callModel({
      messages: [...messages, { role: "user", content: ITERATION_LIMIT_WRAP_UP }],
      tools: [],
      system,
      signal,
    });
    // ノッジは履歴に残さず、要約のassistantメッセージだけを積む。
    messages.push({ role: "assistant", content: response.content });
    onEvent({
      type: "model_response",
      iteration: maxIterations + 1,
      stopReason: response.stop_reason,
    });
    return { status: "iteration_limit", content: toText(response.content), messages };
  } catch {
    return { status: "iteration_limit", messages };
  }
}

