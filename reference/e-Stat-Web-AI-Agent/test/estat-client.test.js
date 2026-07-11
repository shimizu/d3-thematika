import assert from "node:assert/strict";
import test from "node:test";
import {
  callEstatJson,
  createEstatQuery,
  fetchStatsData,
  getStatsMetadata,
  normalizeSurveyYears,
  searchStatsTables,
} from "../src/tools/estat-client.js";

function wrap(name, content) {
  return {
    [name]: {
      RESULT: { STATUS: 0 },
      ...content,
    },
  };
}

test("未指定のJSONPパラメータをクエリから除外する", () => {
  const query = createEstatQuery(
    {
      searchWord: "人口",
      surveyYears: undefined,
      startPosition: undefined,
      empty: "",
      nullable: null,
    },
    "callback_name",
  );

  assert.equal(query.get("searchWord"), "人口");
  assert.equal(query.has("surveyYears"), false);
  assert.equal(query.has("startPosition"), false);
  assert.equal(query.has("empty"), false);
  assert.equal(query.has("nullable"), false);
});

test("JSON fetchではcallbackパラメータを付けない", () => {
  const query = createEstatQuery({ searchWord: "人口" });
  assert.equal(query.has("callback"), false);
  assert.equal(query.has("appId"), true);
});

test("appIdは引数で渡した値がクエリへ載る", () => {
  const query = createEstatQuery({ searchWord: "人口" }, undefined, "MY_APP_ID");
  assert.equal(query.get("appId"), "MY_APP_ID");
});

test("HTTPエラー時に分かりやすいErrorを投げる", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false, status: 503 });
  try {
    await assert.rejects(
      () => callEstatJson("getStatsList", { searchWord: "人口" }),
      /HTTP 503/,
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("成功時はレスポンスJSONをそのまま返す", async () => {
  const originalFetch = globalThis.fetch;
  const payload = { GET_STATS_LIST: { RESULT: { STATUS: 0 } } };
  globalThis.fetch = async () => ({ ok: true, json: async () => payload });
  try {
    const result = await callEstatJson("getStatsList", {});
    assert.deepEqual(result, payload);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("年範囲をe-Statの年月範囲へ正規化する", () => {
  assert.equal(normalizeSurveyYears("2020-2025"), "202001-202512");
  assert.equal(normalizeSurveyYears("2025"), "2025");
  assert.equal(normalizeSurveyYears(undefined), undefined);
  assert.throws(() => normalizeSurveyYears("2020/2025"), /surveyYears/);
});

test("統計表検索レスポンスをエージェント向けに要約する", async () => {
  const result = await searchStatsTables(
    { searchWord: "人口", limit: 10 },
    {
      request: async () =>
        wrap("GET_STATS_LIST", {
          DATALIST_INF: {
            NUMBER: 2,
            RESULT_INF: { TOTAL_NUMBER: 2, NEXT_KEY: 11 },
            TABLE_INF: {
              "@id": "table-1",
              STAT_NAME: { $: "国勢調査" },
              TITLE: { $: "人口総数" },
              SURVEY_DATE: "2020",
            },
          },
        }),
    },
  );

  assert.equal(result.count, 1);
  assert.equal(result.total, 2);
  assert.equal(result.nextKey, 11);
  assert.equal(result.tables[0].statsDataId, "table-1");
});

test("appIdは末端のrequest optionsまで伝播する", async () => {
  let receivedOptions;
  await searchStatsTables(
    { searchWord: "人口" },
    {
      appId: "X-APP-ID",
      request: async (_endpoint, _params, options) => {
        receivedOptions = options;
        return wrap("GET_STATS_LIST", { DATALIST_INF: { NUMBER: 0 } });
      },
    },
  );
  assert.equal(receivedOptions.appId, "X-APP-ID");
});

test("初回検索ではstartPositionを送らない", async () => {
  let receivedParams;
  await searchStatsTables(
    { searchWord: "人口" },
    {
      request: async (_endpoint, params) => {
        receivedParams = params;
        return wrap("GET_STATS_LIST", {
          DATALIST_INF: { RESULT_INF: {}, TABLE_INF: [] },
        });
      },
    },
  );

  assert.equal(receivedParams.startPosition, undefined);
  assert.equal(receivedParams.surveyYears, undefined);
});

test("メタ情報を名称で絞り込める", async () => {
  const result = await getStatsMetadata(
    { statsDataId: "table-1", query: "ブラジル" },
    {
      request: async () =>
        wrap("GET_META_INFO", {
          METADATA_INF: {
            CLASS_INF: {
              CLASS_OBJ: {
                "@id": "area",
                "@name": "国",
                CLASS: [
                  { "@code": "001", "@name": "日本" },
                  {
                    "@code": "50410",
                    "@name": "ブラジル",
                    "@level": "2",
                    "@parentCode": "500",
                    "@addInf": "南米",
                  },
                ],
              },
            },
          },
        }),
    },
  );

  assert.equal(result.dimensions[0].itemCount, 2);
  assert.equal(result.dimensions[0].items[0].code, "50410");
  assert.equal(result.dimensions[0].items[0].level, "2");
  assert.equal(result.dimensions[0].items[0].parentCode, "500");
  assert.equal(result.dimensions[0].items[0].addInf, "南米");
});

test("NEXT_KEYを使って全ページを取得し名称を結合する", async () => {
  const requests = [];
  const pages = [
    wrap("GET_STATS_DATA", {
      STATISTICAL_DATA: {
        RESULT_INF: { NEXT_KEY: 2 },
        TABLE_INF: { TITLE_SPEC: { TABLE_NAME: "テスト表" } },
        CLASS_INF: {
          CLASS_OBJ: [
            {
              "@id": "area",
              CLASS: [
                { "@code": "001", "@name": "日本" },
                { "@code": "002", "@name": "海外" },
              ],
            },
            {
              "@id": "cat02",
              CLASS: { "@code": "140", "@name": "合計_金額" },
            },
          ],
        },
        DATA_INF: {
          VALUE: {
            "@area": "001",
            "@cat02": "140",
            "@unit": "千円",
            $: "10",
          },
        },
      },
    }),
    wrap("GET_STATS_DATA", {
      STATISTICAL_DATA: {
        RESULT_INF: {},
        DATA_INF: {
          VALUE: {
            "@area": "002",
            "@cat02": "140",
            "@unit": "千円",
            $: "20",
          },
        },
      },
    }),
  ];

  const result = await fetchStatsData(
    { statsDataId: "table-1", filters: { cdCat02: "140" } },
    {
      request: async (_endpoint, params) => {
        requests.push(params);
        return pages.shift();
      },
    },
  );

  assert.equal(requests.length, 2);
  assert.equal(requests[1].startPosition, "2");
  assert.equal(result.records.length, 2);
  assert.equal(result.records[0].area_name, "日本");
  assert.equal(result.records[1].area_name, "海外");
  assert.equal(result.measures[0].name, "合計_金額");
});
