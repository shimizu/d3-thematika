import assert from "node:assert/strict";
import test from "node:test";
import {
  analysisToJson,
  recordsToCsv,
  sanitizeFilename,
} from "../src/utils/export.js";

test("ヘッダと列順でCSVを生成する", () => {
  const csv = recordsToCsv(
    ["area_name", "value"],
    [
      { area_name: "ブラジル", value: 100 },
      { area_name: "コロンビア", value: 200 },
    ],
  );
  assert.equal(csv, "area_name,value\r\nブラジル,100\r\nコロンビア,200");
});

test("カンマ・引用符・改行を含む値をエスケープする", () => {
  const csv = recordsToCsv(
    ["name"],
    [{ name: 'a,b' }, { name: 'he said "hi"' }, { name: "line1\nline2" }],
  );
  assert.equal(
    csv,
    'name\r\n"a,b"\r\n"he said ""hi"""\r\n"line1\nline2"',
  );
});

test("欠損値は空文字にする", () => {
  const csv = recordsToCsv(["a", "b"], [{ a: 1 }]);
  assert.equal(csv, "a,b\r\n1,");
});

test("ファイル名の禁則文字と空白を置換する", () => {
  assert.equal(sanitizeFilename("品別国別表 輸入/確報"), "品別国別表_輸入_確報");
  assert.equal(sanitizeFilename('a:b*c?"d"'), "a_b_c_d");
});

test("空のファイル名は既定値を返す", () => {
  assert.equal(sanitizeFilename(""), "export");
  assert.equal(sanitizeFilename("   "), "export");
  assert.equal(sanitizeFilename(null, "dataset"), "dataset");
});

test("analysisToJson: 全項目を含むJSONを整形出力する", () => {
  const json = analysisToJson({
    id: "analysis_001",
    datasetId: "dataset_001",
    kind: "fixed",
    operation: "group_sum",
    parameters: { groupBy: ["area"] },
    resultColumns: ["area", "sum"],
    rows: [{ area: "01", sum: 250 }],
    warnings: ["注意"],
    status: "success",
    computedAt: "2026-06-14T00:00:00.000Z",
  });
  const parsed = JSON.parse(json);
  assert.equal(parsed.id, "analysis_001");
  assert.equal(parsed.operation, "group_sum");
  assert.deepEqual(parsed.rows, [{ area: "01", sum: 250 }]);
  assert.deepEqual(parsed.warnings, ["注意"]);
  // 整形（インデント）されている。
  assert.ok(json.includes("\n  "));
});

test("analysisToJson: javascript種別はコード全文を含む", () => {
  const json = analysisToJson({
    id: "analysis_002",
    datasetId: "dataset_001",
    kind: "javascript",
    code: "function analyze(){ return { columns: [], rows: [] }; }",
    codeHash: "abc123",
  });
  const parsed = JSON.parse(json);
  assert.ok(parsed.code.includes("analyze"));
  assert.equal(parsed.codeHash, "abc123");
});

test("分析ログのファイル名規則をsanitizeFilenameで組み立てる", () => {
  const base = `${sanitizeFilename("dataset_001")}_analysis_001_analysis`;
  assert.equal(base, "dataset_001_analysis_001_analysis");
});
