const ESTAT_JSON_BASE = "https://api.e-stat.go.jp/rest/3.0/app/json";
const PAGE_SIZE = 100000;

export function asArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function unwrapResponse(payload) {
  const root = payload?.[Object.keys(payload)[0]];
  const status = root?.RESULT?.STATUS;
  if (status !== 0 && status !== "0") {
    const message = root?.RESULT?.ERROR_MSG ?? "不明なe-Stat APIエラー";
    throw new Error(`e-Stat APIエラー ${status}: ${message}`);
  }
  return root;
}

/**
 * URLSearchParamsはundefinedも文字列化するため、APIへ送る値を明示的に選別する。
 * e-Statは未指定値を受け付けないパラメータが多く、この処理を全リクエストで共有する。
 */
export function createEstatQuery(params, callbackName, appId = "") {
  const query = new URLSearchParams({
    appId,
    lang: "J",
  });

  // callbackはJSONP互換のため任意で受け取る。JSON fetchでは付けない。
  if (callbackName) query.set("callback", callbackName);

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    query.set(key, String(value));
  }

  return query;
}

export function normalizeSurveyYears(value) {
  if (value === undefined || value === null || value === "") return undefined;

  const text = String(value).trim();
  if (/^\d{4}$/.test(text) || /^\d{6}$/.test(text)) return text;
  if (/^\d{6}-\d{6}$/.test(text)) return text;

  // LLMが生成しやすい年範囲を、e-Statが受け付ける年月範囲へ変換する。
  const yearRange = text.match(/^(\d{4})-(\d{4})$/);
  if (yearRange) return `${yearRange[1]}01-${yearRange[2]}12`;

  throw new Error(
    "surveyYearsはyyyy、yyyymm、yyyy-yyyy、またはyyyymm-yyyymm形式で指定してください。",
  );
}

function normalizeStartPosition(value) {
  if (
    value === undefined ||
    value === null ||
    value === "" ||
    value === "undefined"
  ) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error("startPositionには1以上の整数を指定してください。");
  }
  return String(parsed);
}

/**
 * e-StatのJSONエンドポイントをfetchで呼び出す。
 * e-Statは Access-Control-Allow-Origin: * を返すため、JSONPを使わず
 * 通常のCORSリクエストで取得できる。解析処理から分離し、テストでは
 * この関数だけを偽実装へ差し替える。
 */
export async function callEstatJson(
  endpoint,
  params,
  { signal, timeoutMs = 30000, appId = "" } = {},
) {
  const query = createEstatQuery(params, undefined, appId);
  const url = `${ESTAT_JSON_BASE}/${endpoint}?${query}`;

  // 利用者の中断とタイムアウトの両方でabortできるよう合成する。
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const compositeSignal = signal
    ? AbortSignal.any([signal, timeoutSignal])
    : timeoutSignal;

  let response;
  try {
    response = await fetch(url, { signal: compositeSignal });
  } catch (error) {
    if (signal?.aborted) {
      throw new DOMException("e-Stat API呼び出しを中断しました。", "AbortError");
    }
    if (timeoutSignal.aborted) {
      throw new Error("e-Stat API呼び出しがタイムアウトしました。");
    }
    throw new Error(
      `e-Stat APIへの接続に失敗しました: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  if (!response.ok) {
    throw new Error(
      `e-Stat APIがHTTP ${response.status}を返しました（${endpoint}）。`,
    );
  }

  return response.json();
}

export async function searchStatsTables(
  input,
  { request = callEstatJson, signal, appId = "" } = {},
) {
  const payload = await request(
    "getStatsList",
    {
      statsCode: input.statsCode,
      searchWord: input.searchWord,
      surveyYears: normalizeSurveyYears(input.surveyYears),
      limit: input.limit ?? 30,
      startPosition: normalizeStartPosition(input.startPosition),
      explanationGetFlg: "N",
    },
    { signal, appId },
  );
  const root = unwrapResponse(payload);
  const resultInfo = root.DATALIST_INF?.RESULT_INF;
  const tables = asArray(root.DATALIST_INF?.TABLE_INF).map((table) => ({
    statsDataId: table["@id"],
    title: [
      table.STAT_NAME?.["$"],
      table.TITLE?.["$"] ?? table.TITLE,
      table.TITLE_SPEC?.TABLE_NAME,
    ]
      .filter(Boolean)
      .join(" / "),
    cycle: table.CYCLE,
    surveyDate: table.SURVEY_DATE,
    updated: table.UPDATED_DATE,
    rows: table.OVERALL_TOTAL_NUMBER,
  }));

  return {
    count: tables.length,
    total: resultInfo?.TOTAL_NUMBER ?? root.DATALIST_INF?.NUMBER,
    nextKey: resultInfo?.NEXT_KEY,
    tables,
  };
}

export async function getStatsMetadata(
  input,
  { request = callEstatJson, signal, appId = "" } = {},
) {
  const payload = await request(
    "getMetaInfo",
    { statsDataId: input.statsDataId },
    { signal, appId },
  );
  const root = unwrapResponse(payload);
  const query = input.query?.toLocaleLowerCase("ja");
  const limit = input.limitPerDimension ?? 30;

  const dimensions = asArray(root.METADATA_INF?.CLASS_INF?.CLASS_OBJ).map(
    (dimension) => {
      const allItems = asArray(dimension.CLASS);
      const matchedItems = query
        ? allItems.filter((item) =>
            `${item["@code"]} ${item["@name"]}`
              .toLocaleLowerCase("ja")
              .includes(query),
          )
        : allItems;

      return {
        paramId: dimension["@id"],
        name: dimension["@name"],
        itemCount: allItems.length,
        matchedCount: matchedItems.length,
        items: matchedItems.slice(0, limit).map((item) => ({
          code: item["@code"],
          name: item["@name"],
          level: item["@level"],
          unit: item["@unit"],
          parentCode: item["@parentCode"],
          addInf: item["@addInf"],
        })),
      };
    },
  );

  return { statsDataId: input.statsDataId, dimensions };
}

function createClassMap(classObjects) {
  const map = {};
  for (const dimension of asArray(classObjects)) {
    map[dimension["@id"]] = Object.fromEntries(
      asArray(dimension.CLASS).map((item) => [item["@code"], item]),
    );
  }
  return map;
}

function normalizeRecord(value, classMap) {
  const record = {};
  for (const [key, rawValue] of Object.entries(value)) {
    if (key === "$") {
      record.value =
        rawValue === "" || rawValue === null ? null : Number(rawValue);
      continue;
    }
    if (!key.startsWith("@")) continue;

    const dimension = key.slice(1);
    record[dimension] = rawValue;
    const name = classMap[dimension]?.[rawValue]?.["@name"];
    if (name) record[`${dimension}_name`] = name;
  }
  return record;
}

export async function fetchStatsData(
  input,
  { request = callEstatJson, signal, appId = "" } = {},
) {
  const maxRecords = input.maxRecords ?? 500000;
  const records = [];
  let startPosition;
  let classMap = {};
  let tableInfo;

  for (let page = 0; records.length < maxRecords; page += 1) {
    const payload = await request(
      "getStatsData",
      {
        statsDataId: input.statsDataId,
        ...input.filters,
        startPosition,
        limit: PAGE_SIZE,
        metaGetFlg: page === 0 ? "Y" : "N",
        cntGetFlg: "N",
        annotationGetFlg: "N",
        explanationGetFlg: "N",
      },
      { signal, appId },
    );
    const root = unwrapResponse(payload);
    const statisticalData = root.STATISTICAL_DATA;

    if (page === 0) {
      tableInfo = statisticalData.TABLE_INF;
      classMap = createClassMap(statisticalData.CLASS_INF?.CLASS_OBJ);
    }

    for (const value of asArray(statisticalData.DATA_INF?.VALUE)) {
      records.push(normalizeRecord(value, classMap));
      if (records.length >= maxRecords) break;
    }

    const nextKey = statisticalData.RESULT_INF?.NEXT_KEY;
    if (!nextKey || records.length >= maxRecords) break;
    startPosition = String(nextKey);
  }

  const columns = [...new Set(records.flatMap((record) => Object.keys(record)))];
  const measureKey = records.some((record) => record.tab !== undefined)
    ? "tab"
    : "cat02";
  const measures = [
    ...new Map(
      records
        .filter((record) => record[measureKey] !== undefined)
        .map((record) => [
          record[measureKey],
          {
            code: record[measureKey],
            name: record[`${measureKey}_name`],
            unit: record.unit,
          },
        ]),
    ).values(),
  ];

  return {
    statsDataId: input.statsDataId,
    title:
      tableInfo?.TITLE_SPEC?.TABLE_NAME ??
      tableInfo?.TITLE?.["$"] ??
      tableInfo?.TITLE,
    filters: input.filters ?? {},
    columns,
    records,
    measures,
    truncated: records.length >= maxRecords,
  };
}
