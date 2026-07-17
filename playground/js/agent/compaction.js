export const COMPACT_KEEP_RECENT_MESSAGES = 8;
export const COMPACT_PLACEHOLDER =
  "[古い結果は省略しました。必要ならinspect_dataやget_code等で再取得してください]";

/**
 * 会話履歴のトークンを抑えるため、直近以外のメッセージに含まれるtool_resultの
 * 本文だけをプレースホルダへ置換する。tool_useとtool_resultの対応（ブロックとID）は
 * 保持し、生データはDataset Storeに残るため後から再取得できる。
 */
export function compactConversation(
  messages,
  {
    keepRecentMessages = COMPACT_KEEP_RECENT_MESSAGES,
    placeholder = COMPACT_PLACEHOLDER,
  } = {},
) {
  if (messages.length <= keepRecentMessages) return messages;

  const cutoff = messages.length - keepRecentMessages;

  return messages.map((message, index) => {
    if (index >= cutoff) return message;
    if (!Array.isArray(message.content)) return message;

    let changed = false;
    const content = message.content.map((block) => {
      if (block?.type !== "tool_result") return block;
      if (block.content === placeholder) return block;
      changed = true;
      return { ...block, content: placeholder };
    });

    return changed ? { ...message, content } : message;
  });
}
