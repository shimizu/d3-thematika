import assert from "node:assert/strict";
import test from "node:test";
import {
  EXPECTED_TOTAL_TOP3,
  EXPECTED_TOTAL_TOP_VALUE,
  EXPECTED_WEIGHTED_GROWTH,
  buildCoffeeFixtureDataset,
} from "../src/test-harness/fixtures.js";
import { runUserCode } from "../src/analysis/analysis-worker.js";

const fixture = buildCoffeeFixtureDataset();

test("フィクスチャの形がnormalizeRecord準拠（value数値・area_name・unit）", () => {
  assert.ok(Array.isArray(fixture.records));
  assert.equal(fixture.records.length, 12); // 6か国 × 2年
  for (const r of fixture.records) {
    assert.equal(typeof r.value, "number");
    assert.ok(r.area_name);
    assert.equal(r.unit, "千円");
  }
  assert.ok(fixture.columns.includes("value"));
});

// 参照実装：全期間合計の国別上位3。EXPECTED_TOTAL_TOP3 とのドリフトを防ぐ。
test("全期間合計の上位3が期待定数と一致する", () => {
  const totals = new Map();
  for (const r of fixture.records) {
    totals.set(r.area_name, (totals.get(r.area_name) ?? 0) + r.value);
  }
  const top3 = [...totals.entries()]
    .map(([area_name, total]) => ({ area_name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);
  assert.deepEqual(top3, EXPECTED_TOTAL_TOP3);
  assert.equal(top3[0].total, EXPECTED_TOTAL_TOP_VALUE);
});

// 参照となる「正解 analyze 関数」を実Worker経路(runUserCode)で動かし、
// 加重平均成長率 ≈ EXPECTED_WEIGHTED_GROWTH を返すことを確認する。
// これは「この複雑計算がWorkerで実行可能」「期待値が正しい」の二重確認になる。
const REFERENCE_ANALYZE = `
function analyze({ records }) {
  const byCountry = {};
  for (const r of records) {
    const y = String(r.time).slice(0, 4);
    byCountry[r.area_name] ??= {};
    byCountry[r.area_name][y] = r.value;
  }
  const rows = Object.entries(byCountry).map(([area_name, v]) => ({
    area_name,
    growth: ((v["2023"] - v["2022"]) / v["2022"]) * 100,
    v2023: v["2023"],
  }));
  const top3 = rows.slice().sort((a, b) => b.growth - a.growth).slice(0, 3);
  const wsum = top3.reduce((s, r) => s + r.v2023, 0);
  const weighted = top3.reduce((s, r) => s + r.growth * r.v2023, 0) / wsum;
  return { columns: ["weightedGrowth"], rows: [{ weightedGrowth: weighted }], notes: [] };
}
`;

test("正解analyzeをrunUserCodeで実行すると加重平均成長率が期待値と一致", () => {
  const out = runUserCode(REFERENCE_ANALYZE, { records: fixture.records });
  const got = out.rows[0].weightedGrowth;
  assert.ok(
    Math.abs(got - EXPECTED_WEIGHTED_GROWTH) < 1e-9,
    `got=${got} expected=${EXPECTED_WEIGHTED_GROWTH}`,
  );
  // 期待値が概ね 49.76% であることも明示しておく。
  assert.ok(Math.abs(EXPECTED_WEIGHTED_GROWTH - 49.756) < 0.01);
});
