// e-Statデータセットの全レコードを対象にした決定論的な集計関数群。
// すべて副作用のない純粋関数で、同一入力から同一出力を返す。LLMへ渡すのは
// これらの結果（合計・group-by・前年比など）であり、サンプル行からの推測を排除する。
//
// 各関数は { resultColumns, rows, warnings } を返す。呼び出し側(index.js)が
// operation名・件数・computedAt等のメタ情報を付与する。
//
// レコードの値の前提（src/tools/estat-client.js の normalizeRecord）:
// - value列は Number または null（欠損）
// - 次元コード列(area, cat01, time, tab 等)は文字列
// - {dimension}_name 列に表示名、unit列に単位が入る場合がある

const DEFAULT_VALUE_COLUMN = "value";

// 値が欠損とみなされるか（null/undefined/空文字/非有限数）。
function isMissing(raw) {
  if (raw === null || raw === undefined || raw === "") return true;
  const num = typeof raw === "number" ? raw : Number(raw);
  return !Number.isFinite(num);
}

// 欠損でない値を数値へ変換する。欠損は null を返す。
function toNumber(raw) {
  if (isMissing(raw)) return null;
  return typeof raw === "number" ? raw : Number(raw);
}

// 指定列の存在チェック。無ければ warnings へ積んで false を返す。
function ensureColumns(records, columns, warnings) {
  if (records.length === 0) return true;
  const present = new Set(Object.keys(records[0]));
  // 1行目に無くても他行に在る場合があるため、全体の和集合で確認する。
  for (const record of records) {
    for (const key of Object.keys(record)) present.add(key);
  }
  let ok = true;
  for (const column of columns) {
    if (!present.has(column)) {
      warnings.push(`列が見つかりません: ${column}`);
      ok = false;
    }
  }
  return ok;
}

// 数値配列の基本統計。
function describe(values) {
  if (values.length === 0) {
    return { count: 0, min: null, max: null, sum: 0, average: null };
  }
  let min = values[0];
  let max = values[0];
  let sum = 0;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
    sum += v;
  }
  return { count: values.length, min, max, sum, average: sum / values.length };
}

// 並び替え方向("asc"|"desc")とlimitを適用する。limit超過時はwarningsへ通知。
function applySortAndLimit(rows, key, sort, limit, warnings) {
  const sorted = [...rows];
  if (sort === "asc" || sort === "desc") {
    const factor = sort === "asc" ? 1 : -1;
    sorted.sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      if (av === bv) return 0;
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      return av < bv ? -1 * factor : 1 * factor;
    });
  }
  if (typeof limit === "number" && limit >= 0 && sorted.length > limit) {
    warnings.push(
      `結果が${sorted.length}件あり、上位${limit}件に絞り込みました`,
    );
    return sorted.slice(0, limit);
  }
  return sorted;
}

/**
 * 件数・欠損数・最小・最大・合計・平均。
 */
export function summary(records, { valueColumn = DEFAULT_VALUE_COLUMN } = {}) {
  const warnings = [];
  ensureColumns(records, [valueColumn], warnings);

  const values = [];
  let missing = 0;
  for (const record of records) {
    const num = toNumber(record[valueColumn]);
    if (num === null) missing += 1;
    else values.push(num);
  }
  const stats = describe(values);

  return {
    resultColumns: ["count", "missing", "min", "max", "sum", "average"],
    rows: [
      {
        count: records.length,
        missing,
        min: stats.min,
        max: stats.max,
        sum: stats.sum,
        average: stats.average,
      },
    ],
    warnings,
  };
}

// group-byの共通処理。aggregate("sum"|"average")で合計か平均かを切り替える。
function groupAggregate(
  records,
  { groupBy = [], valueColumn = DEFAULT_VALUE_COLUMN, sort = "desc", limit } = {},
  aggregate,
) {
  const warnings = [];
  const groupColumns = Array.isArray(groupBy) ? groupBy : [groupBy];
  if (groupColumns.length === 0) {
    warnings.push("groupByが指定されていません");
    return { resultColumns: [], rows: [], warnings };
  }
  ensureColumns(records, [...groupColumns, valueColumn], warnings);

  const groups = new Map();
  for (const record of records) {
    const keyParts = groupColumns.map((col) => record[col] ?? "");
    const key = JSON.stringify(keyParts);
    let group = groups.get(key);
    if (!group) {
      group = { keyParts, sum: 0, count: 0, missing: 0 };
      groups.set(key, group);
    }
    const num = toNumber(record[valueColumn]);
    if (num === null) group.missing += 1;
    else {
      group.sum += num;
      group.count += 1;
    }
  }

  const aggColumn = aggregate === "average" ? "average" : "sum";
  const rows = [...groups.values()].map((group) => {
    const row = {};
    groupColumns.forEach((col, i) => {
      row[col] = group.keyParts[i];
    });
    row.sum = group.sum;
    row.count = group.count;
    if (aggregate === "average") {
      row.average = group.count > 0 ? group.sum / group.count : null;
    }
    return row;
  });

  const sorted = applySortAndLimit(rows, aggColumn, sort, limit, warnings);
  const resultColumns =
    aggregate === "average"
      ? [...groupColumns, "average", "count"]
      : [...groupColumns, "sum", "count"];

  return { resultColumns, rows: sorted, warnings };
}

/**
 * 指定列ごとの合計。
 */
export function groupSum(records, params = {}) {
  return groupAggregate(records, params, "sum");
}

/**
 * 指定列ごとの平均。
 */
export function groupAverage(records, params = {}) {
  return groupAggregate(records, params, "average");
}

/**
 * 値の上位・下位ランキング。directionで"desc"(上位)/"asc"(下位)を切り替える。
 * labelColumnsを指定すると結果行をその列＋値に絞り込む（既定は全列）。
 */
export function ranking(
  records,
  {
    valueColumn = DEFAULT_VALUE_COLUMN,
    direction = "desc",
    limit = 20,
    labelColumns,
  } = {},
) {
  const warnings = [];
  ensureColumns(records, [valueColumn], warnings);

  const numbered = records
    .map((record) => ({ record, num: toNumber(record[valueColumn]) }))
    .filter((entry) => entry.num !== null);

  const sort = direction === "asc" ? "asc" : "desc";
  numbered.sort((a, b) => (sort === "asc" ? a.num - b.num : b.num - a.num));

  const limited =
    typeof limit === "number" && limit >= 0
      ? numbered.slice(0, limit)
      : numbered;
  if (limited.length < numbered.length) {
    warnings.push(
      `${numbered.length}件中、上位${limited.length}件を返しました`,
    );
  }

  // ラベル列の指定があればそれを使い、無ければ全列。値列は常に末尾へ含める。
  const baseColumns =
    Array.isArray(labelColumns) && labelColumns.length > 0
      ? labelColumns
      : records.length > 0
        ? [...new Set(records.flatMap((r) => Object.keys(r)))]
        : [];
  const columns = baseColumns.filter((col) => col !== valueColumn);

  const rows = limited.map((entry, index) => {
    const row = { rank: index + 1 };
    for (const col of columns) row[col] = entry.record[col];
    row[valueColumn] = entry.num;
    return row;
  });

  return { resultColumns: ["rank", ...columns, valueColumn], rows, warnings };
}

/**
 * 前年比と増減。yearColumnの先頭4桁を年として扱い、groupBy単位で年ごとに合計し、
 * 連続する年の差分(diff)と増減率(rate)を算出する。
 */
export function yearOverYear(
  records,
  {
    yearColumn = "time",
    valueColumn = DEFAULT_VALUE_COLUMN,
    groupBy = [],
  } = {},
) {
  const warnings = [];
  const groupColumns = Array.isArray(groupBy) ? groupBy : [groupBy];
  ensureColumns(records, [yearColumn, valueColumn], warnings);

  // 先頭4桁を年として抽出する。
  const yearOf = (raw) => {
    const match = /\d{4}/.exec(String(raw ?? ""));
    return match ? match[0] : null;
  };

  // group + year ごとに合計する。
  const buckets = new Map();
  let unparsedYears = 0;
  for (const record of records) {
    const year = yearOf(record[yearColumn]);
    if (year === null) {
      unparsedYears += 1;
      continue;
    }
    const keyParts = groupColumns.map((col) => record[col] ?? "");
    const key = JSON.stringify([keyParts, year]);
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { keyParts, year, sum: 0 };
      buckets.set(key, bucket);
    }
    const num = toNumber(record[valueColumn]);
    if (num !== null) bucket.sum += num;
  }
  if (unparsedYears > 0) {
    warnings.push(`年を解釈できなかったレコードが${unparsedYears}件あります`);
  }

  // group単位に年でソートし、前年との差分・率を計算する。
  const byGroup = new Map();
  for (const bucket of buckets.values()) {
    const groupKey = JSON.stringify(bucket.keyParts);
    if (!byGroup.has(groupKey)) byGroup.set(groupKey, []);
    byGroup.get(groupKey).push(bucket);
  }

  const rows = [];
  for (const bucketList of byGroup.values()) {
    bucketList.sort((a, b) => (a.year < b.year ? -1 : a.year > b.year ? 1 : 0));
    let prev = null;
    for (const bucket of bucketList) {
      const row = {};
      groupColumns.forEach((col, i) => {
        row[col] = bucket.keyParts[i];
      });
      row.year = bucket.year;
      row.value = bucket.sum;
      row.previousValue = prev ? prev.sum : null;
      row.diff = prev ? bucket.sum - prev.sum : null;
      row.rate = prev && prev.sum !== 0 ? (bucket.sum - prev.sum) / prev.sum : null;
      rows.push(row);
      prev = bucket;
    }
  }

  return {
    resultColumns: [
      ...groupColumns,
      "year",
      "value",
      "previousValue",
      "diff",
      "rate",
    ],
    rows,
    warnings,
  };
}

/**
 * 指定列のdistinct値と出現件数。件数の多い順に返す。
 */
export function distinctValues(records, { column, limit = 100 } = {}) {
  const warnings = [];
  if (!column) {
    warnings.push("columnが指定されていません");
    return { resultColumns: ["value", "count"], rows: [], warnings };
  }
  ensureColumns(records, [column], warnings);

  const counts = new Map();
  for (const record of records) {
    const value = record[column];
    const key = value === undefined ? null : value;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const rows = [...counts.entries()].map(([value, count]) => ({ value, count }));
  const limited = applySortAndLimit(rows, "count", "desc", limit, warnings);

  return { resultColumns: ["value", "count"], rows: limited, warnings };
}

/**
 * 単位や計測値の混在確認。unitColumn(既定 unit)とmeasureColumn(任意)の
 * distinct値を集計し、複数種が混在していれば警告する。混在したまま合計すると
 * 異なる単位の値を足し込む誤りにつながるため、レポート前の検査に使う。
 */
export function validateMeasure(
  records,
  { unitColumn = "unit", measureColumn } = {},
) {
  const warnings = [];
  const columns = [unitColumn, ...(measureColumn ? [measureColumn] : [])];
  ensureColumns(records, columns, warnings);

  const rows = [];
  for (const column of columns) {
    const counts = new Map();
    for (const record of records) {
      const value = record[column] ?? null;
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    const distinct = [...counts.entries()].map(([value, count]) => ({
      value,
      count,
    }));
    rows.push({ column, distinctCount: distinct.length, values: distinct });
    if (distinct.length > 1) {
      warnings.push(
        `${column}に${distinct.length}種類の値が混在しています（合計時は単位の整合を確認してください）`,
      );
    }
  }

  return { resultColumns: ["column", "distinctCount", "values"], rows, warnings };
}
