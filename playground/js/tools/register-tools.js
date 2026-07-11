import { ToolRegistry } from "../agent/tool-registry.js";

// LLMへ返すサンプルfeature数。全データはGeoDataStoreに保持し、プロパティの
// サンプルだけをトークン化して送ることでコンテキストの無駄を避ける。
const LLM_SAMPLE_ROWS = 5;
// 文字列プロパティの distinct 値サンプル数。
const DISTINCT_SAMPLE = 10;
// render_preview がLLMへ返すコンソール行数の上限。
const LLM_LOG_LINES = 30;

const LIST_DATA = {
  name: "list_data",
  description:
    "アップロード済みのGeoJSONデータの一覧を返します。地図を作る前に、どのデータが使えるかを確認する最初の段階で使用してください。",
  input_schema: { type: "object", properties: {} },
};

const INSPECT_DATA = {
  name: "inspect_data",
  description:
    "指定したGeoJSONデータの詳細（プロパティごとの型・数値統計・値のサンプル、サンプルfeatureのプロパティ）を返します。色分けやラベルに使うプロパティを決める前に必ず確認してください。座標は返しません。",
  input_schema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "list_dataが返したデータのパス（例: data/pref.geojson）",
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
        propertyKeys: d.propertyKeys,
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

  registry.register(INSPECT_DATA, ({ path }) => {
    const geojson = dataStore.get(path);
    const features = geojson.features;
    const propertyKeys = [
      ...new Set(features.flatMap((f) => Object.keys(f?.properties ?? {}))),
    ];

    return {
      path,
      featureCount: features.length,
      geometryTypes: [
        ...new Set(features.map((f) => f?.geometry?.type).filter(Boolean)),
      ],
      properties: summarizeProperties(features, propertyKeys),
      sampleFeatures: features
        .slice(0, LLM_SAMPLE_ROWS)
        .map((f) => f?.properties ?? {}),
      note: "sampleFeaturesは先頭数件のプロパティのみ。全体の傾向はpropertiesの統計を使うこと。",
    };
  });

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
