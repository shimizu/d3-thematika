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
 * Douglas-Peuckerによるポリライン間引き。tolは度単位の許容距離。
 */
function douglasPeucker(points, tol) {
  if (points.length <= 2) return points;
  const sqTol = tol * tol;

  const sqSegmentDist = (p, a, b) => {
    let x = a[0];
    let y = a[1];
    let dx = b[0] - x;
    let dy = b[1] - y;
    if (dx !== 0 || dy !== 0) {
      const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy);
      if (t > 1) {
        x = b[0];
        y = b[1];
      } else if (t > 0) {
        x += dx * t;
        y += dy * t;
      }
    }
    dx = p[0] - x;
    dy = p[1] - y;
    return dx * dx + dy * dy;
  };

  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [first, last] = stack.pop();
    let maxDist = 0;
    let index = 0;
    for (let i = first + 1; i < last; i++) {
      const dist = sqSegmentDist(points[i], points[first], points[last]);
      if (dist > maxDist) {
        maxDist = dist;
        index = i;
      }
    }
    if (maxDist > sqTol) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

/** 座標を指定桁で丸め、連続する重複点を除去する。 */
function roundAndDedupe(points, precision) {
  const factor = Math.pow(10, precision);
  const rounded = points.map(([x, y]) => [
    Math.round(x * factor) / factor,
    Math.round(y * factor) / factor,
  ]);
  const out = [rounded[0]];
  for (let i = 1; i < rounded.length; i++) {
    const prev = out[out.length - 1];
    if (rounded[i][0] !== prev[0] || rounded[i][1] !== prev[1]) {
      out.push(rounded[i]);
    }
  }
  // リングの閉合を維持する（丸めで始点と終点が一致して消えた場合は閉じ直す）
  const first = out[0];
  const last = out[out.length - 1];
  if (points[0][0] === points[points.length - 1][0] &&
      points[0][1] === points[points.length - 1][1] &&
      (first[0] !== last[0] || first[1] !== last[1])) {
    out.push([first[0], first[1]]);
  }
  return out;
}

function simplifyPointArray(points, { toleranceDeg, precision }, isRing) {
  let result = toleranceDeg > 0 ? douglasPeucker(points, toleranceDeg) : points;
  result = roundAndDedupe(result, precision);
  // リングは最低4点（閉合含む）が必要。潰れた場合は間引き前の丸めのみで返す
  if (isRing && result.length < 4) {
    result = roundAndDedupe(points, precision);
    if (result.length < 4) return null; // 丸めでも成立しない極小リングは削除
  }
  return result;
}

function simplifyCoordinates(coords, options, depth, geometryType) {
  if (!Array.isArray(coords) || coords.length === 0) return coords;
  if (typeof coords[0] === "number") return coords; // Point座標

  if (typeof coords[0][0] === "number") {
    // 数値ペアの配列 = LineStringまたはリング
    const isRing = geometryType === "Polygon" || geometryType === "MultiPolygon";
    return simplifyPointArray(coords, options, isRing);
  }

  return coords
    .map((child) => simplifyCoordinates(child, options, depth + 1, geometryType))
    .filter((child) => child !== null && child.length > 0);
}

/**
 * FeatureCollectionのジオメトリを軽量化する。
 * Douglas-Peucker間引き（toleranceDeg、度単位）と座標の桁丸め（precision）を行う。
 * 外部APIから取得した高詳細データのサイズ削減に使う。
 *
 * @param {GeoJSON.FeatureCollection} collection - 対象（in-placeでは変更しない）
 * @param {{ toleranceDeg?: number, precision?: number }} options
 * @returns {{ collection: GeoJSON.FeatureCollection, verticesBefore: number, verticesAfter: number }}
 */
export function simplifyCollection(collection, { toleranceDeg = 0, precision = 4 } = {}) {
  const countVertices = (coords) => {
    if (!Array.isArray(coords)) return 0;
    if (typeof coords[0] === "number") return 1;
    return coords.reduce((sum, child) => sum + countVertices(child), 0);
  };

  const copy = JSON.parse(JSON.stringify(collection));
  let verticesBefore = 0;
  let verticesAfter = 0;

  for (const feature of copy.features ?? []) {
    const geometry = feature?.geometry;
    if (!geometry?.coordinates) continue;
    verticesBefore += countVertices(geometry.coordinates);
    geometry.coordinates = simplifyCoordinates(
      geometry.coordinates,
      { toleranceDeg, precision },
      0,
      geometry.type,
    ) ?? [];
    verticesAfter += countVertices(geometry.coordinates);
  }

  return { collection: copy, verticesBefore, verticesAfter };
}

/**
 * TopoJSONのTopologyをオブジェクトごとのFeatureCollectionへ変換する。
 * 変換本体はtopojson-clientのfeature関数を注入して使う（CDN読込のグローバル等）。
 *
 * @param {object} topology - type: "Topology" のTopoJSONオブジェクト
 * @param {(topology: object, object: object) => object} featureFn - topojson.feature
 * @returns {Array<{ name: string, collection: GeoJSON.FeatureCollection }>}
 */
export function topologyToFeatureCollections(topology, featureFn) {
  if (typeof featureFn !== "function") {
    throw new Error(
      "topojson-clientが読み込まれていません。ページを再読み込みしてください。",
    );
  }
  const objects = topology?.objects ?? {};
  const names = Object.keys(objects);
  if (names.length === 0) {
    throw new Error("TopoJSONにobjectsが含まれていません。");
  }

  return names.map((name) => {
    const result = featureFn(topology, objects[name]);
    const collection =
      result?.type === "FeatureCollection"
        ? result
        : { type: "FeatureCollection", features: [result] };
    return { name, collection };
  });
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
