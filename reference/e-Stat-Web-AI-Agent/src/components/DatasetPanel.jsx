function DatasetPanel({ datasets, onExport }) {
  return (
    <section className="panel compact-panel">
      <div className="panel-heading">
        <div>
          <p className="section-label">Data</p>
          <h2>データセット</h2>
        </div>
        <span className="count-badge">{datasets.length}</span>
      </div>

      {datasets.length === 0 ? (
        <p className="empty-state">
          e-Statから取得したデータセットがここに表示されます。
        </p>
      ) : (
        <ul className="dataset-list">
          {datasets.map((dataset) => (
            <li key={dataset.id}>
              <div className="dataset-meta">
                <strong>{dataset.title || dataset.statsDataId}</strong>
                <small>
                  {dataset.id} ・ {dataset.recordCount.toLocaleString()}件
                </small>
              </div>
              <div
                className="dataset-actions"
                title={
                  dataset.available
                    ? undefined
                    : "リロードで生データが消えたため再取得が必要です"
                }
              >
                <button
                  type="button"
                  className="ghost-button export-button"
                  onClick={() => onExport(dataset.id, "csv")}
                  disabled={!dataset.available}
                >
                  CSV
                </button>
                <button
                  type="button"
                  className="ghost-button export-button"
                  onClick={() => onExport(dataset.id, "json")}
                  disabled={!dataset.available}
                >
                  JSON
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default DatasetPanel;
