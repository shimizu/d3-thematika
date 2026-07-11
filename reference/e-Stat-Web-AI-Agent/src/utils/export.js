/**
 * 1つのCSVフィールドをエスケープする。カンマ・引用符・改行を含む場合のみ
 * ダブルクオートで囲み、内部の引用符を二重化する（RFC 4180準拠）。
 */
function escapeCsvField(value) {
  if (value === undefined || value === null) return "";
  const text = String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/**
 * 正規化済みレコード配列を、columns順のCSV文字列へ変換する。
 * 先頭行はヘッダ。欠損値は空文字。BOMは付けない（ダウンロード側で付与）。
 */
export function recordsToCsv(columns, records) {
  const header = columns.map(escapeCsvField).join(",");
  const rows = records.map((record) =>
    columns.map((column) => escapeCsvField(record[column])).join(","),
  );
  return [header, ...rows].join("\r\n");
}

/**
 * ファイル名に使えない文字と空白連続を `_` へ置換する。空になったら既定値を返す。
 */
export function sanitizeFilename(name, fallback = "export") {
  const cleaned = String(name ?? "")
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .trim();
  return cleaned || fallback;
}

/**
 * 分析ログを監査・再現用のJSON文字列へ整形する。実行コード全文(code)を含む
 * 全項目を出力するため、Claudeへ返すtool resultとは別物（こちらが正本）。
 */
export function analysisToJson(analysis) {
  return JSON.stringify(
    {
      id: analysis.id,
      datasetId: analysis.datasetId,
      kind: analysis.kind,
      operation: analysis.operation ?? null,
      parameters: analysis.parameters ?? null,
      resultColumns: analysis.resultColumns ?? [],
      rows: analysis.rows ?? [],
      warnings: analysis.warnings ?? [],
      status: analysis.status ?? null,
      durationMs: analysis.durationMs ?? null,
      code: analysis.code ?? null,
      codeHash: analysis.codeHash ?? null,
      computedAt: analysis.computedAt ?? null,
    },
    null,
    2,
  );
}

/**
 * テキストをBlob化してブラウザのダウンロードを発火する。DOM依存のため単体テスト対象外。
 */
export function downloadText(filename, text, mimeType) {
  const blob = new Blob([text], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
