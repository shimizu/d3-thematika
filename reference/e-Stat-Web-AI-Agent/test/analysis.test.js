import assert from "node:assert/strict";
import test from "node:test";
import {
  distinctValues,
  groupAverage,
  groupSum,
  ranking,
  summary,
  validateMeasure,
  yearOverYear,
} from "../src/analysis/operations.js";
import { runAnalysis, SUPPORTED_OPERATIONS } from "../src/analysis/index.js";

const SAMPLE = [
  { area: "01", area_name: "東京", time: "2020", value: 100, unit: "千円" },
  { area: "01", area_name: "東京", time: "2021", value: 150, unit: "千円" },
  { area: "02", area_name: "大阪", time: "2020", value: 200, unit: "千円" },
  { area: "02", area_name: "大阪", time: "2021", value: 180, unit: "千円" },
  { area: "02", area_name: "大阪", time: "2021", value: null, unit: "千円" },
];

test("summary: 件数・欠損・合計・平均・最小最大", () => {
  const { rows, warnings } = summary(SAMPLE, { valueColumn: "value" });
  const r = rows[0];
  assert.equal(r.count, 5);
  assert.equal(r.missing, 1);
  assert.equal(r.sum, 630);
  assert.equal(r.min, 100);
  assert.equal(r.max, 200);
  assert.equal(r.average, 630 / 4);
  assert.deepEqual(warnings, []);
});

test("summary: 存在しない列は警告し合計0", () => {
  const { rows, warnings } = summary(SAMPLE, { valueColumn: "nope" });
  assert.equal(rows[0].sum, 0);
  assert.equal(rows[0].missing, 5);
  assert.ok(warnings.some((w) => w.includes("nope")));
});

test("group_sum: グループごとの合計をdesc順で返す", () => {
  const { resultColumns, rows } = groupSum(SAMPLE, {
    groupBy: ["area_name"],
    valueColumn: "value",
    sort: "desc",
  });
  assert.deepEqual(resultColumns, ["area_name", "sum", "count"]);
  assert.equal(rows[0].area_name, "大阪");
  assert.equal(rows[0].sum, 380);
  assert.equal(rows[0].count, 2);
  assert.equal(rows[1].area_name, "東京");
  assert.equal(rows[1].sum, 250);
});

test("group_sum: limit超過は警告して絞り込む", () => {
  const { rows, warnings } = groupSum(SAMPLE, {
    groupBy: ["area_name"],
    valueColumn: "value",
    limit: 1,
  });
  assert.equal(rows.length, 1);
  assert.ok(warnings.some((w) => w.includes("絞り込み")));
});

test("group_sum: groupBy未指定は警告し空", () => {
  const { rows, warnings } = groupSum(SAMPLE, { valueColumn: "value" });
  assert.equal(rows.length, 0);
  assert.ok(warnings.some((w) => w.includes("groupBy")));
});

test("group_average: グループ平均を計算する", () => {
  const { resultColumns, rows } = groupAverage(SAMPLE, {
    groupBy: ["area_name"],
    valueColumn: "value",
  });
  assert.deepEqual(resultColumns, ["area_name", "average", "count"]);
  const osaka = rows.find((r) => r.area_name === "大阪");
  assert.equal(osaka.average, 190); // (200+180)/2、null除外
});

test("ranking: 上位を順位付きで返す", () => {
  const { rows } = ranking(SAMPLE, {
    valueColumn: "value",
    direction: "desc",
    limit: 2,
    labelColumns: ["area_name", "time"],
  });
  assert.equal(rows.length, 2);
  assert.equal(rows[0].rank, 1);
  assert.equal(rows[0].value, 200);
  assert.equal(rows[1].rank, 2);
  assert.equal(rows[1].value, 180);
});

test("ranking: 下位はasc", () => {
  const { rows } = ranking(SAMPLE, {
    valueColumn: "value",
    direction: "asc",
    limit: 1,
  });
  assert.equal(rows[0].value, 100);
});

test("year_over_year: 前年差分と率を計算する", () => {
  const { rows } = yearOverYear(SAMPLE, {
    yearColumn: "time",
    valueColumn: "value",
    groupBy: ["area_name"],
  });
  const tokyo2021 = rows.find(
    (r) => r.area_name === "東京" && r.year === "2021",
  );
  assert.equal(tokyo2021.value, 150);
  assert.equal(tokyo2021.previousValue, 100);
  assert.equal(tokyo2021.diff, 50);
  assert.equal(tokyo2021.rate, 0.5);
  const tokyo2020 = rows.find(
    (r) => r.area_name === "東京" && r.year === "2020",
  );
  assert.equal(tokyo2020.previousValue, null);
  assert.equal(tokyo2020.diff, null);
});

test("distinct: 値ごとの件数を多い順で返す", () => {
  const { rows } = distinctValues(SAMPLE, { column: "area_name" });
  assert.equal(rows[0].value, "大阪");
  assert.equal(rows[0].count, 3);
  assert.equal(rows[1].value, "東京");
  assert.equal(rows[1].count, 2);
});

test("validate_measure: 単一単位は警告なし", () => {
  const { rows, warnings } = validateMeasure(SAMPLE, { unitColumn: "unit" });
  assert.equal(rows[0].distinctCount, 1);
  assert.deepEqual(warnings, []);
});

test("validate_measure: 混在は警告する", () => {
  const mixed = [
    { unit: "千円" },
    { unit: "トン" },
    { unit: "千円" },
  ];
  const { rows, warnings } = validateMeasure(mixed, { unitColumn: "unit" });
  assert.equal(rows[0].distinctCount, 2);
  assert.ok(warnings.some((w) => w.includes("混在")));
});

test("runAnalysis: メタ情報を付与しcomputedAtを注入できる", () => {
  const result = runAnalysis({
    records: SAMPLE,
    operation: "group_sum",
    parameters: { groupBy: ["area_name"], valueColumn: "value" },
    now: "2026-06-14T00:00:00.000Z",
  });
  assert.equal(result.operation, "group_sum");
  assert.equal(result.sourceRecordCount, 5);
  assert.equal(result.computedAt, "2026-06-14T00:00:00.000Z");
  assert.deepEqual(result.parameters, {
    groupBy: ["area_name"],
    valueColumn: "value",
  });
  assert.ok(Array.isArray(result.rows));
});

test("runAnalysis: 未対応の操作は例外", () => {
  assert.throws(
    () => runAnalysis({ records: SAMPLE, operation: "median" }),
    /未対応の操作/,
  );
});

test("runAnalysis: recordsが配列でなければ例外", () => {
  assert.throws(
    () => runAnalysis({ records: null, operation: "summary" }),
    /配列ではありません/,
  );
});

test("SUPPORTED_OPERATIONS: 7操作が公開される", () => {
  assert.equal(SUPPORTED_OPERATIONS.length, 7);
  assert.ok(SUPPORTED_OPERATIONS.includes("year_over_year"));
});
