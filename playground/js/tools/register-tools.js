import { ToolRegistry } from "../agent/tool-registry.js";

// LLMへ返すサンプルfeature数。全データはGeoDataStoreに保持し、プロパティの
// サマリーだけをトークン化して送ることでコンテキストの無駄を避ける。
// 座標・全レコードはどのツールからも返さない。
const LLM_SAMPLE_ROWS = 5;
// 文字列プロパティの distinct 値サンプル数。
const DISTINCT_SAMPLE = 10;
// render_preview がLLMへ返すコンソール行数の上限。
const LLM_LOG_LINES = 30;
// list_data が返すプロパティキー数の上限。
const LIST_KEY_CAP = 30;
// inspect_data が一度に統計を返すプロパティ数の上限
// （超過分は properties パラメータで指定して取得する）。
// runtime側のtool result上限（8000字）に収まるよう調整している。
const INSPECT_KEY_CAP = 20;
// search_features の返却件数の上限。
const SEARCH_LIMIT_MAX = 50;
const SEARCH_LIMIT_DEFAULT = 10;

const LIST_DATA = {
  name: "list_data",
  description:
    "アップロード済みのGeoJSONデータの一覧を返します。地図を作る前に、どのデータが使えるかを確認する最初の段階で使用してください。",
  input_schema: { type: "object", properties: {} },
};

const INSPECT_DATA = {
  name: "inspect_data",
  description:
    "指定したGeoJSONデータのサマリー（プロパティごとの型・数値統計・値のサンプル、サンプルfeatureのプロパティ）を返します。色分けやラベルに使うプロパティを決める前に必ず確認してください。座標や全レコードは返しません。プロパティ数が多いデータは一部のみ返すため、必要なキーはpropertiesで指定してください。",
  input_schema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "list_dataが返したデータのパス（例: data/pref.geojson）",
      },
      properties: {
        type: "array",
        items: { type: "string" },
        description:
          "統計・サンプルを取得するプロパティ名の配列。省略時は先頭から一部のキーのみ返す",
      },
    },
    required: ["path"],
  },
};

const SEARCH_FEATURES = {
  name: "search_features",
  description:
    "GeoJSONのfeatureをプロパティ条件で検索し、一致したfeatureのプロパティを返します（座標は返しません）。特定の地物の値を確認したいとき、値の分布から外れ値を特定したいとき、名前からコードを引きたいときに使用してください。",
  input_schema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "list_dataが返したデータのパス（例: data/pref.geojson）",
      },
      property: {
        type: "string",
        description:
          "検索対象のプロパティ名。queryはこのプロパティに対して部分一致し、min/maxはこのプロパティの数値範囲で絞り込む。省略時はqueryを全プロパティに対して照合",
      },
      query: {
        type: "string",
        description: "部分一致で検索する文字列（大文字小文字を無視）",
      },
      min: { type: "number", description: "数値プロパティの下限（property必須）" },
      max: { type: "number", description: "数値プロパティの上限（property必須）" },
      fields: {
        type: "array",
        items: { type: "string" },
        description: "結果に含めるプロパティ名。省略時は全プロパティ（キー数が多い場合は主要なもののみ）",
      },
      limit: {
        type: "integer",
        minimum: 1,
        maximum: SEARCH_LIMIT_MAX,
        description: `返す件数の上限（デフォルト: ${SEARCH_LIMIT_DEFAULT}）`,
      },
    },
    required: ["path"],
  },
};

const GET_CODE = {
  name: "get_code",
  description:
    "現在エディタにあるコード（html / css / js）を返します。ユーザーが手動編集した内容を確認する場合や、部分的に修正する前に使用してください。",
  input_schema: { type: "object", properties: {} },
};

const UPDATE_CODE = {
  name: "update_code",
  description:
    "エディタのコードを書き換えます。指定したパネルだけが置き換わります（未指定のパネルは現状維持）。書き換え後はrender_previewで必ず動作確認してください。",
  input_schema: {
    type: "object",
    properties: {
      html: {
        type: "string",
        description: "bodyに挿入するHTML。地図コンテナは <div id=\"map\"></div> を使う",
      },
      css: { type: "string", description: "適用するCSS" },
      js: {
        type: "string",
        description:
          "実行するJavaScript。トップレベルawait可。データは await d3.json('./data/<name>') で読む",
      },
    },
  },
};

const RENDER_PREVIEW = {
  name: "render_preview",
  description:
    "現在のエディタのコードをプレビューで実行し、コンソール出力・エラー・描画されたSVG要素の統計を返します。update_codeの後は必ず実行し、エラーがあれば修正して再実行してください。",
  input_schema: { type: "object", properties: {} },
};

/** 数値/文字列プロパティの要約統計を計算する。 */
function summarizeProperties(features, propertyKeys) {
  const summaries = {};
  for (const key of propertyKeys) {
    const values = features
      .map((f) => f?.properties?.[key])
      .filter((v) => v !== null && v !== undefined);
    const numbers = values.filter((v) => typeof v === "number" && isFinite(v));

    if (numbers.length > 0 && numbers.length >= values.length * 0.8) {
      const min = Math.min(...numbers);
      const max = Math.max(...numbers);
      const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
      summaries[key] = {
        type: "number",
        count: numbers.length,
        min,
        max,
        mean: Number(mean.toPrecision(6)),
        missing: features.length - numbers.length,
      };
    } else {
      const distinct = [...new Set(values.map(String))];
      summaries[key] = {
        type: "string",
        count: values.length,
        distinctCount: distinct.length,
        sampleValues: distinct.slice(0, DISTINCT_SAMPLE),
        missing: features.length - values.length,
      };
    }
  }
  return summaries;
}

/**
 * プレイグラウンド用のツールレジストリを構築する。
 *
 * @param {object} deps
 * @param {import('../data-store.js').GeoDataStore} deps.dataStore - アップロードデータ
 * @param {{ get: () => {html: string, css: string, js: string}, set: (partial: object) => void }} deps.editors - エディタの読み書き
 * @param {() => Promise<object>} deps.runPreview - 現在のコードでプレビューを実行し結果を返す
 */
export function createPlaygroundToolRegistry({ dataStore, editors, runPreview }) {
  const registry = new ToolRegistry();

  registry.register(LIST_DATA, () => {
    const list = dataStore.list();
    if (list.length === 0) {
      return {
        data: [],
        note: "アップロード済みのデータがありません。画面のデータパネルからGeoJSONをアップロードするようユーザーに案内してください。",
      };
    }
    return {
      data: list.map((d) => ({
        path: d.path,
        featureCount: d.featureCount,
        geometryTypes: d.geometryTypes,
        propertyKeyCount: d.propertyKeys.length,
        propertyKeys: d.propertyKeys.slice(0, LIST_KEY_CAP),
        ...(d.propertyKeys.length > LIST_KEY_CAP
          ? { propertyKeysNote: `キーが多いため先頭${LIST_KEY_CAP}件のみ表示。全キーはinspect_dataで確認可能。` }
          : {}),
        bbox: d.bbox,
        available: d.available,
        ...(d.rewoundRings > 0
          ? { note: `アップロード時に${d.rewoundRings}リングをD3互換のワインディング順序へ自動変換済み。` }
          : {}),
        ...(d.windingSuspects > 0
          ? {
              warning: `変換後も${d.windingSuspects}個のポリゴンが半球超の面積。極や日付変更線をまたぐ特殊なジオメトリの可能性があり、描画が崩れる場合はその旨をユーザーに伝えてください。`,
            }
          : {}),
      })),
    };
  });

  registry.register(INSPECT_DATA, ({ path, properties }) => {
    const geojson = dataStore.get(path);
    const features = geojson.features;
    const allKeys = [
      ...new Set(features.flatMap((f) => Object.keys(f?.properties ?? {}))),
    ];

    // トークン消費を抑えるため、統計・サンプルの対象キーを絞る。
    // properties指定があればそのキーだけ、なければ先頭INSPECT_KEY_CAP件。
    let targetKeys;
    let keysNote;
    if (Array.isArray(properties) && properties.length > 0) {
      targetKeys = properties.filter((key) => allKeys.includes(key));
      const unknown = properties.filter((key) => !allKeys.includes(key));
      keysNote = unknown.length > 0 ? `存在しないキー: ${unknown.join(", ")}` : undefined;
    } else {
      targetKeys = allKeys.slice(0, INSPECT_KEY_CAP);
      keysNote =
        allKeys.length > INSPECT_KEY_CAP
          ? `キーが${allKeys.length}個あるため先頭${INSPECT_KEY_CAP}件のみ集計。他のキーはpropertiesパラメータで指定して取得すること。`
          : undefined;
    }

    const pickProps = (feature) => {
      const props = feature?.properties ?? {};
      return Object.fromEntries(targetKeys.map((key) => [key, props[key]]));
    };

    return {
      path,
      featureCount: features.length,
      geometryTypes: [
        ...new Set(features.map((f) => f?.geometry?.type).filter(Boolean)),
      ],
      propertyKeyCount: allKeys.length,
      allPropertyKeys: allKeys,
      properties: summarizeProperties(features, targetKeys),
      sampleFeatures: features.slice(0, LLM_SAMPLE_ROWS).map(pickProps),
      ...(keysNote ? { keysNote } : {}),
      note: "sampleFeaturesは先頭数件の対象キーのみ。全体の傾向はpropertiesの統計を、個別の地物はsearch_featuresを使うこと。",
    };
  });

  registry.register(
    SEARCH_FEATURES,
    ({ path, property, query, min, max, fields, limit }) => {
      const geojson = dataStore.get(path);
      const features = geojson.features;
      const resultLimit = Math.min(
        Math.max(1, limit ?? SEARCH_LIMIT_DEFAULT),
        SEARCH_LIMIT_MAX,
      );

      if (query === undefined && min === undefined && max === undefined) {
        throw new Error("query または min / max のいずれかを指定してください。");
      }
      if ((min !== undefined || max !== undefined) && !property) {
        throw new Error("min / max を使う場合は property を指定してください。");
      }

      const lowerQuery = query !== undefined ? String(query).toLowerCase() : null;

      const matchesQuery = (props) => {
        if (lowerQuery === null) return true;
        const values = property ? [props?.[property]] : Object.values(props ?? {});
        return values.some(
          (v) => v != null && String(v).toLowerCase().includes(lowerQuery),
        );
      };

      const matchesRange = (props) => {
        if (min === undefined && max === undefined) return true;
        const v = props?.[property];
        if (typeof v !== "number" || !isFinite(v)) return false;
        if (min !== undefined && v < min) return false;
        if (max !== undefined && v > max) return false;
        return true;
      };

      const matched = features.filter(
        (f) => matchesQuery(f?.properties) && matchesRange(f?.properties),
      );

      // 返却プロパティを絞る: fields指定 > 全キー（多い場合は先頭LIST_KEY_CAP件）
      const allKeys = [
        ...new Set(matched.flatMap((f) => Object.keys(f?.properties ?? {}))),
      ];
      const returnKeys =
        Array.isArray(fields) && fields.length > 0
          ? fields
          : allKeys.slice(0, LIST_KEY_CAP);

      return {
        path,
        matchedCount: matched.length,
        returned: Math.min(matched.length, resultLimit),
        features: matched.slice(0, resultLimit).map((f) => {
          const props = f?.properties ?? {};
          return Object.fromEntries(returnKeys.map((key) => [key, props[key]]));
        }),
        ...(allKeys.length > returnKeys.length && !fields
          ? { fieldsNote: `キーが多いため各featureは先頭${LIST_KEY_CAP}キーのみ。必要なキーはfieldsで指定すること。` }
          : {}),
        ...(matched.length > resultLimit
          ? { limitNote: `一致${matched.length}件のうち${resultLimit}件のみ返却。条件を絞るかlimitを増やすこと。` }
          : {}),
      };
    },
  );

  registry.register(GET_CODE, () => editors.get());

  registry.register(UPDATE_CODE, (input) => {
    const partial = {};
    for (const key of ["html", "css", "js"]) {
      if (typeof input?.[key] === "string") partial[key] = input[key];
    }
    if (Object.keys(partial).length === 0) {
      throw new Error("html / css / js のいずれかを指定してください。");
    }
    editors.set(partial);
    const current = editors.get();
    return {
      updated: Object.keys(partial),
      sizes: {
        html: current.html.length,
        css: current.css.length,
        js: current.js.length,
      },
      note: "render_previewで動作確認してください。",
    };
  });

  registry.register(RENDER_PREVIEW, async () => {
    const result = await runPreview();
    const logs = result.logs.slice(-LLM_LOG_LINES);

    const stats = result.svgStats;
    const drewSomething =
      stats &&
      (stats.pathCount > 0 ||
        stats.circleCount > 0 ||
        stats.rectCount > 0 ||
        stats.textCount > 0 ||
        stats.imageCount > 0);

    let note;
    if (result.errors.length > 0) {
      note = "エラーが発生しました。原因を特定してコードを修正し、再度render_previewしてください。";
    } else if (result.timedOut) {
      note = "実行がタイムアウトしました。無限ループや解決しないawaitがないか確認してください。";
    } else if (!drewSomething) {
      note = "エラーはありませんがSVGに描画要素がありません。データの読み込み、投影法のfitExtent、レイヤー追加を確認してください。";
    } else {
      note = "描画に成功しました。";
    }

    return {
      ok: result.errors.length === 0 && !result.timedOut && Boolean(drewSomething),
      errors: result.errors,
      logs: logs.map((l) => `[${l.level}] ${l.message}`),
      svgStats: stats,
      timedOut: result.timedOut,
      note,
    };
  });

  return registry;
}
