// デバッグハーネスの「内蔵データ」シナリオ用フィクスチャ。
// e-Stat 貿易統計（品別国別表 輸入）の正規化済みレコード形（src/tools/estat-client.js の
// normalizeRecord 準拠：value は数値|null、次元コード列＋{dim}_name 列、unit）を模した
// 小さな既知データ。保存データにも e-Stat にも依存せずに analyze_dataset /
// execute_analysis_javascript の「計算の正しさ」を検証するために使う。
//
// 値は意図的に丸い数にし、期待値（EXPECTED_*）を一意に precompute できるようにしている。
// 期待値の整合は test/fixtures.test.js がフィクスチャから再計算して担保する（ドリフト防止）。

// コーヒー（HS0901）輸入額（単位:千円）、相手国×年（2022/2023）。
const COUNTRIES = [
  { area: "105", area_name: "ブラジル", v2022: 100000, v2023: 120000 },
  { area: "110", area_name: "コロンビア", v2022: 80000, v2023: 88000 },
  { area: "111", area_name: "ベトナム", v2022: 60000, v2023: 90000 },
  { area: "115", area_name: "グアテマラ", v2022: 40000, v2023: 38000 },
  { area: "120", area_name: "エチオピア", v2022: 30000, v2023: 48000 },
  { area: "125", area_name: "インドネシア", v2022: 20000, v2023: 26000 },
];

const YEARS = [
  { time: "2022000000", time_name: "2022年", key: "v2022" },
  { time: "2023000000", time_name: "2023年", key: "v2023" },
];

function buildRecords() {
  const records = [];
  for (const c of COUNTRIES) {
    for (const y of YEARS) {
      records.push({
        cat01: "0901",
        cat01_name: "コーヒー",
        area: c.area,
        area_name: c.area_name,
        time: y.time,
        time_name: y.time_name,
        value: c[y.key],
        unit: "千円",
      });
    }
  }
  return records;
}

// add() 前の dataset 形（id/createdAt は DatasetStore.add が付与）。
export function buildCoffeeFixtureDataset() {
  return {
    statsDataId: "TEST0901",
    title: "（テスト）品別国別表 輸入 コーヒー",
    filters: {},
    columns: [
      "cat01",
      "cat01_name",
      "area",
      "area_name",
      "time",
      "time_name",
      "value",
      "unit",
    ],
    measures: [{ code: "140", name: "年計_金額", unit: "千円" }],
    records: buildRecords(),
    truncated: false,
  };
}

// 固定集計テストの期待値：全期間(2022+2023)の国別合計の上位3。
export const EXPECTED_TOTAL_TOP3 = [
  { area_name: "ブラジル", total: 220000 },
  { area_name: "コロンビア", total: 168000 },
  { area_name: "ベトナム", total: 150000 },
];
export const EXPECTED_TOTAL_TOP_VALUE = 220000;

// 高度分析テストの期待値：
// 各国の 2022→2023 成長率(%) → 成長率上位3か国 → その3か国の2023年輸入額で加重平均した成長率(%)。
// 上位3 = エチオピア(60%,48000) / ベトナム(50%,90000) / インドネシア(30%,26000)
// = (60*48000 + 50*90000 + 30*26000) / (48000+90000+26000) = 8,160,000 / 164,000
export const EXPECTED_WEIGHTED_GROWTH = 8160000 / 164000; // ≈ 49.756
