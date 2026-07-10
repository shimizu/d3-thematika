const SUMMARY_STORAGE_KEY = "thematika-playground.data.summaries";
const BODY_STORAGE_PREFIX = "thematika-playground.data.body.";

function resolveStorage(storage) {
  if (storage) return storage;
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

/**
 * ファイル名をデータパス（data/<name>）用に正規化する。
 * 生成コードが `d3.json('./data/<name>')` で参照するため、URLに安全な文字だけ残す。
 */
export function sanitizeDataName(rawName) {
  const base = String(rawName || "data")
    .replace(/\.(geojson|json)$/i, "")
    // 日本語などのUnicode文字は保持し、URL/パスに問題のある記号だけ_に置換する
    .replace(/[^\p{L}\p{N}_.-]+/gu, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
  return `${base || "data"}.geojson`;
}

/**
 * GeoJSONをFeature配列へ正規化する（FeatureCollection / Feature / Feature[] を受け付ける）。
 */
function toFeatures(geojson) {
  if (Array.isArray(geojson)) return geojson;
  if (geojson?.type === "FeatureCollection" && Array.isArray(geojson.features)) {
    return geojson.features;
  }
  if (geojson?.type === "Feature") return [geojson];
  return null;
}

/** 座標列を再帰的に走査してbboxを求める。 */
function walkCoordinates(coords, visit) {
  if (!Array.isArray(coords)) return;
  if (typeof coords[0] === "number") {
    visit(coords);
    return;
  }
  for (const child of coords) walkCoordinates(child, visit);
}

function computeBbox(features) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const feature of features) {
    walkCoordinates(feature?.geometry?.coordinates, ([x, y]) => {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    });
  }
  if (!isFinite(minX)) return null;
  return [minX, minY, maxX, maxY];
}

/**
 * アップロードされたGeoJSONを管理するブラウザ内ストア。
 *
 * 生データはメモリに保持し、可能なら localStorage にも保存してリロード後に復元する
 * （quota超過時はメモリのみ保持し、要約の persisted フラグで区別する）。
 * geoArea はワインディング検査用に注入可能（既定はグローバルd3、無ければ検査スキップ）。
 */
export class GeoDataStore {
  #entries = new Map(); // name -> { summary, geojson }
  #listeners = new Set();
  #storage;
  #geoArea;

  constructor({ storage, geoArea } = {}) {
    this.#storage = resolveStorage(storage);
    this.#geoArea = geoArea ?? globalThis.d3?.geoArea ?? null;
    this.#hydrate();
  }

  /**
   * GeoJSONを追加する。既存の同名データは置き換える。
   * @param {string} rawName - 元のファイル名
   * @param {object|string} data - GeoJSONオブジェクトまたはJSON文字列
   * @returns 追加したデータの要約
   */
  add(rawName, data) {
    const geojson = typeof data === "string" ? JSON.parse(data) : data;
    const features = toFeatures(geojson);
    if (!features || features.length === 0) {
      throw new Error(
        "GeoJSONとして解釈できません。FeatureCollection、Feature、またはFeatureの配列を指定してください。",
      );
    }

    const name = sanitizeDataName(rawName);

    // 常にFeatureCollectionへ正規化して保持する（生成コード側の分岐を減らす）。
    const normalized = { type: "FeatureCollection", features };

    const geometryTypes = [
      ...new Set(features.map((f) => f?.geometry?.type).filter(Boolean)),
    ];
    const propertyKeys = [
      ...new Set(features.flatMap((f) => Object.keys(f?.properties ?? {}))),
    ];

    // D3は外側リング時計回り（CW）を期待する。半球超の面積はCCW疑い。
    let windingSuspects = 0;
    if (this.#geoArea) {
      const HALF_SPHERE = 2 * Math.PI;
      for (const feature of features) {
        const type = feature?.geometry?.type;
        if (type !== "Polygon" && type !== "MultiPolygon") continue;
        try {
          if (this.#geoArea(feature) > HALF_SPHERE) windingSuspects++;
        } catch {
          // 不正なジオメトリは検査対象外とする。
        }
      }
    }

    const body = JSON.stringify(normalized);
    const summary = {
      name,
      path: `data/${name}`,
      featureCount: features.length,
      geometryTypes,
      propertyKeys,
      bbox: computeBbox(features),
      windingSuspects,
      sizeBytes: body.length,
      persisted: this.#persistBody(name, body),
      addedAt: new Date().toISOString(),
    };

    this.#entries.set(name, { summary, geojson: normalized });
    this.#persistSummaries();
    this.#notify();
    return summary;
  }

  /** 要約の一覧を追加順で返す。available は生データがメモリに在るかを示す。 */
  list() {
    return [...this.#entries.values()].map(({ summary, geojson }) => ({
      ...summary,
      available: geojson != null,
    }));
  }

  /** 名前（"data/x.geojson" 形式のパスも可）で生GeoJSONを取得する。 */
  get(nameOrPath) {
    const name = String(nameOrPath).replace(/^\.?\/?data\//, "");
    const entry = this.#entries.get(name);
    if (!entry) {
      const known = [...this.#entries.keys()].join(", ") || "(なし)";
      throw new Error(`データ「${name}」は見つかりません。登録済み: ${known}`);
    }
    if (!entry.geojson) {
      throw new Error(
        `データ「${name}」の本体はこのセッションにありません（リロードで失われました）。再アップロードしてください。`,
      );
    }
    return entry.geojson;
  }

  remove(nameOrPath) {
    const name = String(nameOrPath).replace(/^\.?\/?data\//, "");
    if (!this.#entries.delete(name)) return;
    try {
      this.#storage?.removeItem(BODY_STORAGE_PREFIX + name);
    } catch {
      // 削除失敗は無視する。
    }
    this.#persistSummaries();
    this.#notify();
  }

  clear() {
    for (const name of this.#entries.keys()) {
      try {
        this.#storage?.removeItem(BODY_STORAGE_PREFIX + name);
      } catch {
        // 削除失敗は無視する。
      }
    }
    this.#entries.clear();
    try {
      this.#storage?.removeItem(SUMMARY_STORAGE_KEY);
    } catch {
      // 削除失敗は無視する。
    }
    this.#notify();
  }

  subscribe(listener) {
    this.#listeners.add(listener);
    listener(this.list());
    return () => this.#listeners.delete(listener);
  }

  #notify() {
    const snapshot = this.list();
    for (const listener of this.#listeners) listener(snapshot);
  }

  /** 本体をlocalStorageへ保存する。quota超過時はfalseを返しメモリのみ保持。 */
  #persistBody(name, body) {
    try {
      this.#storage?.setItem(BODY_STORAGE_PREFIX + name, body);
      return this.#storage != null;
    } catch {
      return false;
    }
  }

  #persistSummaries() {
    try {
      const summaries = [...this.#entries.values()].map((e) => e.summary);
      this.#storage?.setItem(SUMMARY_STORAGE_KEY, JSON.stringify(summaries));
    } catch {
      // 保存失敗はメモリ保持のみで継続する。
    }
  }

  /** localStorageから要約と本体を復元する。本体が無い要約はavailable:falseになる。 */
  #hydrate() {
    let summaries = [];
    try {
      const raw = this.#storage?.getItem(SUMMARY_STORAGE_KEY);
      if (raw) summaries = JSON.parse(raw);
    } catch {
      summaries = [];
    }
    if (!Array.isArray(summaries)) return;

    for (const summary of summaries) {
      if (!summary?.name) continue;
      let geojson = null;
      try {
        const body = this.#storage?.getItem(BODY_STORAGE_PREFIX + summary.name);
        if (body) geojson = JSON.parse(body);
      } catch {
        geojson = null;
      }
      this.#entries.set(summary.name, { summary, geojson });
    }
  }
}
