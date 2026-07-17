/**
 * geoBoundaries API クライアント。
 * 行政界データ（国境・州県境など）のメタデータ取得とGeoJSONダウンロードを行う。
 * APIとダウンロード先（GitHub raw）はどちらもCORS許可（*）のためブラウザから直接呼べる。
 * https://www.geoboundaries.org/api.html
 */

const API_BASE = "https://www.geoboundaries.org/api/current";

// ダウンロードの上限サイズ。full詳細のADM2級は数十MBを超えることがあるため、
// メモリ・localStorage・トークンを守る安全弁として設ける。
export const MAX_DOWNLOAD_BYTES = 50 * 1024 * 1024;

const RELEASE_TYPES = new Set(["gbOpen", "gbHumanitarian", "gbAuthoritative"]);
const ADM_LEVELS = new Set(["ADM0", "ADM1", "ADM2", "ADM3", "ADM4", "ADM5", "ALL"]);

/** メタデータのうちLLM/ツールが使う項目だけを抜き出す。 */
function summarizeMetadata(entry) {
  return {
    boundaryISO: entry.boundaryISO,
    boundaryName: entry.boundaryName,
    boundaryType: entry.boundaryType,
    boundaryYearRepresented: entry.boundaryYearRepresented,
    admUnitCount: Number(entry.admUnitCount) || undefined,
    meanVertices: Number(entry.meanVertices) || undefined,
    boundaryLicense: entry.boundaryLicense,
    boundarySource: entry.boundarySource,
    licenseSource: entry.licenseSource,
    gjDownloadURL: entry.gjDownloadURL,
    simplifiedGeometryGeoJSON: entry.simplifiedGeometryGeoJSON,
  };
}

/**
 * 境界データのメタデータを取得する。
 * @param {object} params
 * @param {string} params.iso3 - ISO 3166-1 alpha-3 コード（例: JPN）。'ALL'も可
 * @param {string} [params.admLevel='ALL'] - ADM0〜ADM5 または ALL
 * @param {string} [params.releaseType='gbOpen']
 * @returns {Promise<Array<object>>} メタデータ要約の配列
 */
export async function getBoundaryMetadata({
  iso3,
  admLevel = "ALL",
  releaseType = "gbOpen",
  fetchImpl = globalThis.fetch,
  signal,
}) {
  const iso = String(iso3 ?? "").toUpperCase();
  const adm = String(admLevel ?? "ALL").toUpperCase();
  const release = releaseType || "gbOpen";

  if (!/^[A-Z]{3}$/.test(iso) && iso !== "ALL") {
    throw new Error(`iso3はISO 3166-1 alpha-3コード（例: JPN, USA）で指定してください: ${iso3}`);
  }
  if (!ADM_LEVELS.has(adm)) {
    throw new Error(`admLevelはADM0〜ADM5またはALLで指定してください: ${admLevel}`);
  }
  if (!RELEASE_TYPES.has(release)) {
    throw new Error(`releaseTypeはgbOpen / gbHumanitarian / gbAuthoritativeのいずれかです: ${releaseType}`);
  }

  const url = `${API_BASE}/${release}/${iso}/${adm}/`;
  const response = await fetchImpl(url, { signal });
  if (response.status === 404) {
    throw new Error(
      `geoBoundariesに該当データがありません（${iso} ${adm}）。国コードとADMレベルを確認してください。`,
    );
  }
  if (!response.ok) {
    throw new Error(`geoBoundaries APIの呼び出しに失敗しました（HTTP ${response.status}）。`);
  }

  const payload = await response.json();
  const entries = Array.isArray(payload) ? payload : [payload];
  if (entries.length === 0 || !entries[0]?.boundaryISO) {
    throw new Error(`geoBoundariesに該当データがありません（${iso} ${adm}）。`);
  }
  return entries.map(summarizeMetadata);
}

/**
 * github.com/raw形式のURLをmedia.githubusercontent.comへ書き換える。
 *
 * - github.comの302リダイレクト応答にはCORSヘッダがなく、ブラウザのfetchは
 *   リダイレクト時点で失敗する
 * - raw.githubusercontent.com はGit LFS管理ファイル（geoBoundariesのGeoJSONが該当）
 *   に対してLFSポインタのテキストを返してしまう
 * - media.githubusercontent.com はLFSの実体をCORS許可（*）付きで直接配信する
 *
 * 例: github.com/<org>/<repo>/raw/<ref>/<path>
 *   → media.githubusercontent.com/media/<org>/<repo>/<ref>/<path>
 */
export function toCorsFriendlyUrl(url) {
  const match = String(url).match(
    /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/raw\/(.+)$/,
  );
  if (!match) return url;
  return `https://media.githubusercontent.com/media/${match[1]}/${match[2]}/${match[3]}`;
}

/**
 * GeoJSONをダウンロードする（サイズ上限つき）。
 * @param {string} url - メタデータのgjDownloadURLまたはsimplifiedGeometryGeoJSON
 * @returns {Promise<GeoJSON.FeatureCollection>}
 */
export async function downloadBoundaryGeojson(
  url,
  { fetchImpl = globalThis.fetch, signal, maxBytes = MAX_DOWNLOAD_BYTES } = {},
) {
  const response = await fetchImpl(toCorsFriendlyUrl(url), { signal });
  if (!response.ok) {
    throw new Error(`境界データのダウンロードに失敗しました（HTTP ${response.status}）。`);
  }

  const contentLength = Number(response.headers?.get?.("content-length"));
  if (isFinite(contentLength) && contentLength > maxBytes) {
    throw new Error(
      `境界データが大きすぎます（${Math.round(contentLength / 1024 / 1024)}MB > 上限${Math.round(maxBytes / 1024 / 1024)}MB）。detail: 'simplified' を使うか、より上位のADMレベルを検討してください。`,
    );
  }

  const text = await response.text();
  if (text.length > maxBytes) {
    throw new Error(
      `境界データが大きすぎます（${Math.round(text.length / 1024 / 1024)}MB > 上限${Math.round(maxBytes / 1024 / 1024)}MB）。detail: 'simplified' を使うか、より上位のADMレベルを検討してください。`,
    );
  }
  return JSON.parse(text);
}
