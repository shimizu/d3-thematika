import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function ChatPanel({
  messages,
  isRunning,
  onSubmit,
  onAbort,
  onReset,
  onExportReport,
}) {
  const [input, setInput] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    const content = input.trim();
    if (!content || isRunning) return;

    setInput("");
    onSubmit(content);
  };

  return (
    <section className="panel chat-panel">
      <div className="panel-heading">
        <div>
          <p className="section-label">Conversation</p>
          <h2>統計分析チャット</h2>
        </div>
        <div className="panel-heading-actions">
          <button
            type="button"
            className="ghost-button"
            onClick={onReset}
            disabled={isRunning}
          >
            新しい会話
          </button>
          <span className={`status ${isRunning ? "is-running" : ""}`}>
            {isRunning ? "実行中" : "待機中"}
          </span>
        </div>
      </div>

      <div className="message-list" aria-live="polite">
        {messages.map((message) => {
          const isProgress = message.kind === "progress";
          const isNotice = message.kind === "notice";
          const isReport =
            message.role === "assistant" &&
            !isProgress &&
            !isNotice &&
            message.id !== "welcome" &&
            Boolean(message.content?.trim());
          const label =
            message.role === "user"
              ? "You"
              : isProgress
                ? "途中経過"
                : isNotice
                  ? "お知らせ"
                  : "Agent";

          return (
            <article
              className={`message message-${message.role}${
                isProgress ? " message-progress" : ""
              }${isNotice ? " message-notice" : ""}`}
              key={message.id}
            >
              <span>{label}</span>
              {message.role === "assistant" && !isProgress && !isNotice ? (
                <div className="message-markdown">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <p>{message.content}</p>
              )}
              {isReport && (
                <div className="message-actions">
                  <button
                    type="button"
                    className="ghost-button export-button"
                    onClick={() => onExportReport(message)}
                  >
                    レポートをダウンロード
                  </button>
                </div>
              )}
            </article>
          );
        })}
        {isRunning && (
          <div className="message-spinner" role="status" aria-label="処理中">
            <span className="spinner" aria-hidden="true" />
            <span>処理中…</span>
          </div>
        )}
      </div>

      <form className="prompt-form" onSubmit={handleSubmit}>
        <label htmlFor="prompt">分析したい内容</label>
        <textarea
          id="prompt"
          value={input}
          rows={4}
          placeholder="例: 2020年から2025年までの日本のコーヒー輸入額を国別に比較して"
          onChange={(event) => setInput(event.target.value)}
        />
        <div className="prompt-actions">
          <p>統計表IDや分類コードはエージェントが調査します。</p>
          {isRunning ? (
            <button type="button" onClick={onAbort}>
              中断
            </button>
          ) : (
            <button type="submit" disabled={!input.trim()}>
              分析を開始
            </button>
          )}
        </div>
      </form>
    </section>
  );
}

export default ChatPanel;

