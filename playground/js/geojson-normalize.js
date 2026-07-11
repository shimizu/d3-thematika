/**
 * アップロードされたGeoJSONをD3.jsで扱える形へ正規化する。
 * scripts/fix-geojson-winding.js（@turf/rewind --d3）と同じ変換をブラウザで行う:
 *
 * 1. 空の座標配列を除去（D3のパース時エラー対策）
 * 2. ワインディング順序をD3の期待（外側リング: CW、穴: CCW）へ反転
 *    ※ GeoJSON仕様(RFC7946)はこの逆。そのまま渡すと「全世界」として
 *      解釈され描画が壊れる
 */

/**
 * リングの符号付き面積（shoelace変形）。正ならCW（turf booleanClockwiseと同じ基準）。
 * @param {Array<[number, number]>} ring
 * @returns {number}
 */
function signedArea(ring) {
  let area = 0;
  const n = ring.length;
  if (n < 3) return 0;
  for (let i = 0; i < n - 1; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    area += (x2 - x1) * (y2 + y1);
  }
  return area / 2;
}

/**
 * リングを指定の回転方向に揃える。反転した場合はtrueを返す。
 * @param {Array} ring - 座標リング（in-placeで反転）
 * @param {boolean} clockwise - trueなら時計回りに揃える
 */
function rewindRing(ring, clockwise) {
  const isClockwise = signedArea(ring) > 0;
  if (isClockwise === clockwise) return false;
  ring.reverse();
  return true;
}

/**
 * ポリゴン座標（リング配列）をD3順序へ揃える。反転したリング数を返す。
 */
function rewindPolygon(rings) {
  let changed = 0;
  rings.forEach((ring, index) => {
    // 外側リング（index 0）はCW、穴はCCW
    if (rewindRing(ring, index === 0)) changed++;
  });
  return changed;
}

/**
 * ジオメトリのワインディングをD3順序へ揃える（in-place）。反転したリング数を返す。
 */
function rewindGeometry(geometry) {
  if (!geometry) return 0;
  switch (geometry.type) {
    case "Polygon":
      return rewindPolygon(geometry.coordinates);
    case "MultiPolygon":
      return geometry.coordinates.reduce(
        (sum, polygon) => sum + rewindPolygon(polygon),
        0,
      );
    case "GeometryCollection":
      return (geometry.geometries ?? []).reduce(
        (sum, child) => sum + rewindGeometry(child),
        0,
      );
    default:
      return 0;
  }
}

/**
 * 座標配列から空の配列を再帰的に削除する（scripts/fix-geojson-winding.jsから移植）。
 * 座標が空になったGeometry/Featureはnullとして取り除かれる。
 */
function removeEmptyCoordinates(geojson) {
  if (!geojson) return null;

  if (geojson.type === "FeatureCollection") {
    const features = (geojson.features ?? [])
      .map((f) => removeEmptyCoordinates(f))
      .filter((f) => f !== null);
    return { ...geojson, features };
  }

  if (geojson.type === "Feature") {
    const geometry = removeEmptyCoordinates(geojson.geometry);
    if (!geometry) return null;
    return { ...geojson, geometry };
  }

  if (geojson.type === "GeometryCollection") {
    const geometries = (geojson.geometries ?? [])
      .map((g) => removeEmptyCoordinates(g))
      .filter((g) => g !== null);
    return { ...geojson, geometries };
  }

  if (geojson.coordinates) {
    const cleanCoords = (coords) => {
      if (Array.isArray(coords) && coords.length >= 2 && typeof coords[0] === "number") {
        return coords;
      }
      if (!Array.isArray(coords) || coords.length === 0) {
        return null;
      }
      const cleaned = coords.map((c) => cleanCoords(c)).filter((c) => c !== null);
      return cleaned.length > 0 ? cleaned : null;
    };

    const newCoords = cleanCoords(geojson.coordinates);
    if (!newCoords) return null;
    return { ...geojson, coordinates: newCoords };
  }

  return geojson;
}

/**
 * FeatureCollectionをD3互換へ正規化する。
 * 入力は変更せず、正規化済みのコピーと変換統計を返す。
 *
 * @param {GeoJSON.FeatureCollection} collection
 * @returns {{ collection: GeoJSON.FeatureCollection, rewoundRings: number, removedFeatures: number }}
 */
export function normalizeToD3(collection) {
  const originalCount = collection.features?.length ?? 0;

  // クリーニング（コピーを生成）
  const cleaned = removeEmptyCoordinates(collection) ?? {
    type: "FeatureCollection",
    features: [],
  };

  // ワインディング反転はクリーニング後のコピーに対してin-placeで行う。
  // removeEmptyCoordinatesはオブジェクトを再構築するが座標配列は共有するため、
  // ここでディープコピーしてから反転する（元データを壊さない）。
  const copy = JSON.parse(JSON.stringify(cleaned));
  let rewoundRings = 0;
  for (const feature of copy.features) {
    rewoundRings += rewindGeometry(feature?.geometry);
  }

  return {
    collection: copy,
    rewoundRings,
    removedFeatures: originalCount - copy.features.length,
  };
}
