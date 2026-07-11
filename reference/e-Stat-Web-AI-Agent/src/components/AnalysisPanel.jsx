// 分析ログの種別を日本語ラベルへ。
const KIND_LABEL = {
  fixed: "固定分析",
  javascript: "JS実行",
};

function AnalysisPanel({ analyses, onExport, onExportAll }) {
  return (
    <section className="panel compact-panel">
      <div className="panel-heading">
        <div>
          <p className="section-label">Analysis</p>
          <h2>分析ログ</h2>
        </div>
        <span className="count-badge">{analyses.length}</span>
      </div>

      {analyses.length === 0 ? (
        <p className="empty-state">
          analyze_datasetやJavaScript実行の記録がここに表示されます。
        </p>
      ) : (
        <>
          <ul className="dataset-list">
            {analyses.map((analysis) => (
              <li key={analysis.id}>
                <div className="dataset-meta">
                  <strong>
                    {KIND_LABEL[analysis.kind] ?? analysis.kind}
                    {analysis.operation ? ` ・ ${analysis.operation}` : ""}
                  </strong>
                  <small>
                    {analysis.id} ・ {analysis.datasetId} ・{" "}
                    {analysis.rowCount.toLocaleString()}行
                    {analysis.status !== "success"
                      ? ` ・ ${analysis.status}`
                      : ""}
                    {analysis.warningCount > 0
                      ? ` ・ 警告${analysis.warningCount}`
                      : ""}
                  </small>
                </div>
                <div
                  className="dataset-actions"
                  title={
                    analysis.available
                      ? undefined
                      : "リロードで分析結果が消えたため再実行が必要です"
                  }
                >
                  <button
                    type="button"
                    className="ghost-button export-button"
                    onClick={() => onExport(analysis.id, "json")}
                    disabled={!analysis.available}
                  >
                    JSON
                  </button>
                  {analysis.kind !== "javascript" && (
                    <button
                      type="button"
                      className="ghost-button export-button"
                      onClick={() => onExport(analysis.id, "csv")}
                      disabled={!analysis.available}
                    >
                      CSV
                    </button>
                  )}
                  {analysis.kind === "javascript" && (
                    <button
                      type="button"
                      className="ghost-button export-button"
                      onClick={() => onExport(analysis.id, "js")}
                      disabled={!analysis.available}
                    >
                      .js
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="ghost-button export-button"
            onClick={onExportAll}
          >
            全ログをJSONで書き出し
          </button>
        </>
      )}
    </section>
  );
}

export default AnalysisPanel;
