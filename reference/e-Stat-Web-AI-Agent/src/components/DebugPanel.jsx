// ?debug=true のときだけ表示されるデバッグハーネス。実APIキーでエージェントを動かし、
// シナリオごとに「期待したツールを正しい順序で使えたか」を観測・判定して表示する。
// 本番経路（callClaude直叩き・実Worker・共有ストア）をそのまま通すため、本番に近い検証になる。

function CheckRow({ check }) {
  return (
    <li className={check.ok ? "debug-check ok" : "debug-check ng"}>
      <span className="debug-check-mark">{check.ok ? "✓" : "✗"}</span>
      <span className="debug-check-label">{check.label}</span>
      <small className="debug-check-detail">{check.detail}</small>
    </li>
  );
}

function ScenarioCard({
  scenario,
  state,
  apiKeyPresent,
  estatAppIdPresent,
  datasetReady,
  onRun,
}) {
  const status = state?.status ?? "idle";
  const evaluation = state?.evaluation;
  // データセット依存シナリオは保存済みデータが無いと実行できない。
  const blockedByDataset = scenario.requiresDataset && !datasetReady;
  // e-Stat疎通確認はClaude APIキー不要。それ以外はキー未設定だと実行できない。
  const blockedByApiKey = !scenario.estatPing && !apiKeyPresent;
  // e-Stat疎通確認はappId（ユーザー入力）が必要。
  const blockedByEstatAppId = scenario.estatPing && !estatAppIdPresent;
  const disabled =
    status === "running" ||
    blockedByApiKey ||
    blockedByEstatAppId ||
    blockedByDataset;

  return (
    <li className="debug-scenario">
      <div className="debug-scenario-head">
        <div>
          <strong>{scenario.title}</strong>
          <small>{scenario.description}</small>
          {scenario.directPing && (
            <small className="debug-dataset-hint">
              callClaudeへ最小リクエスト（ツール不使用・e-Stat不要）
            </small>
          )}
          {scenario.estatPing && (
            <small className="debug-dataset-hint">
              e-Stat APIへ最小リクエスト（ツール不使用・Claude API不要）
            </small>
          )}
          {scenario.seedDataset && (
            <small className="debug-dataset-hint">
              内蔵テストデータで実行（e-Stat不要・実行後に自動削除）
            </small>
          )}
          {scenario.requiresDataset && (
            <small className="debug-dataset-hint">
              {datasetReady
                ? "対象: 選択中の保存済みデータセット"
                : "※ 先に「データ取得」で保存済みデータセットが必要"}
            </small>
          )}
        </div>
        <div className="debug-scenario-status">
          {status === "running" && <span className="debug-badge">実行中…</span>}
          {status === "done" && (
            <span className={evaluation?.pass ? "debug-badge ok" : "debug-badge ng"}>
              {evaluation?.pass ? "PASS" : "FAIL"}
            </span>
          )}
          {status === "error" && <span className="debug-badge ng">エラー</span>}
          <button
            type="button"
            className="ghost-button"
            onClick={() => onRun(scenario)}
            disabled={disabled}
          >
            実行
          </button>
        </div>
      </div>

      {status === "error" && (
        <p className="debug-error">{state.error}</p>
      )}

      {status === "done" && (
        <div className="debug-result">
          <ul className="debug-checks">
            {evaluation.checks.map((check, i) => (
              <CheckRow key={i} check={check} />
            ))}
          </ul>

          <details className="debug-details">
            <summary>ツール呼び出し列（{state.toolCalls.length}）</summary>
            <ol className="debug-toolcalls">
              {state.toolCalls.map((call, i) => (
                <li key={i}>
                  <code>{call.name}</code>
                  {call.input && (
                    <small>
                      {" "}
                      {JSON.stringify(call.input).slice(0, 160)}
                    </small>
                  )}
                </li>
              ))}
            </ol>
          </details>

          {state.result?.content && (
            <details className="debug-details">
              <summary>エージェント最終回答</summary>
              <pre className="debug-answer">{state.result.content}</pre>
            </details>
          )}
        </div>
      )}
    </li>
  );
}

function DebugPanel({
  scenarios,
  states,
  apiKeyPresent,
  estatAppIdPresent,
  availableDatasets = [],
  selectedDatasetId,
  onSelectDataset,
  onRun,
  onRunAll,
  onReset,
}) {
  const datasetReady = availableDatasets.length > 0;
  // セレクタ未選択時は最新の保存済みデータセットを既定対象として示す。
  const effectiveId =
    selectedDatasetId &&
    availableDatasets.some((d) => d.id === selectedDatasetId)
      ? selectedDatasetId
      : availableDatasets.at(-1)?.id ?? "";

  return (
    <section className="panel compact-panel debug-panel">
      <div className="panel-heading">
        <div>
          <p className="section-label">Debug</p>
          <h2>ツール利用テスト</h2>
        </div>
        <div className="panel-heading-actions">
          <button
            type="button"
            className="ghost-button debug-reset-button"
            onClick={onReset}
          >
            リセット
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={onRunAll}
            disabled={!apiKeyPresent}
          >
            すべて順に実行
          </button>
        </div>
      </div>

      {!apiKeyPresent && (
        <p className="empty-state">
          APIキーが未登録です。「API設定」でAPIキーを保存してください（本番と共通のキーを使用します）。
        </p>
      )}

      {!estatAppIdPresent && (
        <p className="empty-state">
          e-Stat アプリケーションIDが未登録です。「API設定」で保存してください（e-Stat疎通確認・取得系シナリオに必要）。
        </p>
      )}

      {/* 集計・JS実行テストが対象にする保存済みデータセットの選択。 */}
      <div className="debug-dataset-select">
        <label htmlFor="debug-dataset">集計テストの対象データセット</label>
        {datasetReady ? (
          <select
            id="debug-dataset"
            value={effectiveId}
            onChange={(e) => onSelectDataset(e.target.value)}
          >
            {availableDatasets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.id}・{d.title || d.statsDataId}（{d.recordCount.toLocaleString()}件）
              </option>
            ))}
          </select>
        ) : (
          <small className="debug-dataset-hint">
            保存済みデータセットがありません。「データ取得」を実行すると選べるようになります。
          </small>
        )}
      </div>

      <ul className="debug-scenario-list">
        {scenarios.map((scenario) => (
          <ScenarioCard
            key={scenario.id}
            scenario={scenario}
            state={states[scenario.id]}
            apiKeyPresent={apiKeyPresent}
            estatAppIdPresent={estatAppIdPresent}
            datasetReady={datasetReady}
            onRun={onRun}
          />
        ))}
      </ul>
    </section>
  );
}

export default DebugPanel;
