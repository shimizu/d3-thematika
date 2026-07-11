function ApiSettings({
  isDebug,
  apiKey,
  estatAppId,
  model,
  maxTokens,
  toolWebSearch,
  isOpen,
  onToggle,
  onApiKeyChange,
  onEstatAppIdChange,
  onModelChange,
  onMaxTokensChange,
  onToolWebSearchChange,
  onSave,
  onDeleteKey,
}) {
  const handleSubmit = (event) => {
    event.preventDefault();
    onSave();
  };

  return (
    <div className="settings">
      <button
        className="secondary-button"
        type="button"
        onClick={onToggle}
      >
        API設定
      </button>

      {isOpen && (
        <form
          className="settings-popover"
          aria-label="API設定"
          onSubmit={handleSubmit}
        >
          <a
            className="settings-debug-link"
            href={isDebug ? "?" : "?debug=true"}
          >
            {isDebug ? "チャット" : "デバッグ"}
          </a>
          <label htmlFor="claude-api-key">Claude APIキー</label>
          <input
            id="claude-api-key"
            type="password"
            value={apiKey}
            placeholder="sk-ant-..."
            autoComplete="off"
            onChange={(event) => onApiKeyChange(event.target.value)}
          />
          <p className="field-help">
            APIキーは
            <a
              href="https://platform.claude.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              platform.claude.com
            </a>
            で取得できます。
          </p>

          <label htmlFor="estat-app-id">e-Stat アプリケーションID</label>
          <input
            id="estat-app-id"
            type="password"
            value={estatAppId}
            placeholder="e-Stat の appId"
            autoComplete="off"
            onChange={(event) => onEstatAppIdChange(event.target.value)}
          />
          <p className="field-help">
            アプリケーションIDは
            <a
              href="https://www.e-stat.go.jp/api/"
              target="_blank"
              rel="noopener noreferrer"
            >
              e-Stat API
            </a>
            で取得できます。
          </p>

          <label htmlFor="claude-model">Claudeモデル</label>
          <input
            id="claude-model"
            type="text"
            value={model}
            onChange={(event) => onModelChange(event.target.value)}
          />

          <label htmlFor="claude-max-tokens">最大出力トークン (max_tokens)</label>
          <input
            id="claude-max-tokens"
            type="number"
            min="1"
            value={maxTokens}
            onChange={(event) =>
              onMaxTokensChange(Number(event.target.value) || 0)
            }
          />
          <p className="field-help">
            回答が途中で切れる場合は大きくします（推奨16000、Sonnet 4.6は最大64000）。
          </p>

          <fieldset className="settings-tools">
            <legend>サーバー側ツール</legend>
            <p className="field-help tools-note">
              Anthropic側で実行されるツールです。別途課金されます。
            </p>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={toolWebSearch}
                onChange={(event) => onToolWebSearchChange(event.target.checked)}
              />
              Web検索
            </label>
            <p className="field-help checkbox-help">
              有効にするとAIがwebから最新の知識を取得できるようになります。
            </p>
          </fieldset>

          <div className="settings-actions">
            <button type="submit" className="save-button">
              保存して閉じる
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={onDeleteKey}
              disabled={!apiKey && !estatAppId}
            >
              キーを削除
            </button>
          </div>

          <p className="field-help">
            Claude APIキーと e-Stat アプリケーションIDはこのブラウザのlocalStorageに
            保存され、リロード後も復元されます。「キーを削除」で両方まとめて消去できます。
            共有端末では使用後に必ず削除してください。
          </p>
        </form>
      )}
    </div>
  );
}

export default ApiSettings;
