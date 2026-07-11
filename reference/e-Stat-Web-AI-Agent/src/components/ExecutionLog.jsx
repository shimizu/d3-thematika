import { useEffect, useRef } from "react";

function ExecutionLog({ logs }) {
  const listRef = useRef(null);

  // 新しいログが追加されたら最下部へスクロールし、最新行を見せる。
  useEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [logs]);

  return (
    <section className="panel compact-panel">
      <div className="panel-heading">
        <div>
          <p className="section-label">Activity</p>
          <h2>実行ログ</h2>
        </div>
        <span className="count-badge">{logs.length}</span>
      </div>

      {logs.length === 0 ? (
        <p className="empty-state">
          ツールの選択やAPI呼び出しの履歴がここに表示されます。
        </p>
      ) : (
        <ol className="log-list" ref={listRef}>
          {logs.map((log) => (
            <li key={log.id}>{log.message}</li>
          ))}
        </ol>
      )}
    </section>
  );
}

export default ExecutionLog;

