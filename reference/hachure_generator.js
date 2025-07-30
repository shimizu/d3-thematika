/**
 * 汎用ハッチング＆等高線生成スクリプト (generic-hachure.js)
 *
 * 必要:
 *   npm install geotiff d3-contour @turf/turf
 *
 * 機能:
 *   1) demToContours: GeoTIFF (DEM) から等高線 GeoJSON を生成
 *   2) generateHachures: 等高線 GeoJSON からハッチング線 GeoJSON を生成
 */

// ライブラリ読み込み
const GeoTIFF = require('geotiff');
const d3 = require('d3-contour');
const turf = require('@turf/turf');

/**
 * DEM GeoTIFF から等高線 (LineString) GeoJSON を生成
 * @param {string} tiffPath - GeoTIFF ファイルパス
 * @param {{interval: number, bbox: [number, number, number, number]}} options
 *   interval: 等高線間隔 (標高単位)
 *   bbox: [xmin, ymin, xmax, ymax] (座標範囲)
 * @returns {Promise<GeoJSON.FeatureCollection<GeoJSON.LineString>>}
 */
async function demToContours(tiffPath, options) {
  const { interval, bbox } = options;
  const tiff = await GeoTIFF.fromFile(tiffPath);
  const image = await tiff.getImage();
  const [width, height] = image.getSize();
  const rasters = await image.readRasters();
  const values = rasters[0];

  // 最小・最大標高
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);

  // グリッドデータを GeoJSON FeatureCollection に変換
  const points = [];
  const [xmin, ymin, xmax, ymax] = bbox;
  const xres = (xmax - xmin) / width;
  const yres = (ymax - ymin) / height;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const elev = values[idx];
      const lon = xmin + (x + 0.5) * xres;
      const lat = ymax - (y + 0.5) * yres;
      points.push(turf.point([lon, lat], { elevation: elev }));
    }
  }
  const grid = turf.featureCollection(points);

  // 等高線レベル配列生成
  const levels = [];
  for (let z = Math.ceil(minVal / interval) * interval; z <= maxVal; z += interval) {
    levels.push(z);
  }

  // turf の isolines を使って等高線生成
  const contours = turf.isolines(grid, levels, { zProperty: 'elevation' });
  return contours;
}

/**
 * 等高線 GeoJSON からハッチング線 GeoJSON を生成
 * @param {GeoJSON.FeatureCollection<GeoJSON.LineString>} contours
 * @param {{spacing: number, length: number, rotate?: number}} options
 * @returns {GeoJSON.FeatureCollection<GeoJSON.LineString>}
 */
function generateHachures(contours, options) {
  const { spacing, length, rotate = 0 } = options;
  const hachures = [];

  contours.features.forEach(feature => {
    if (feature.geometry.type !== 'LineString') return;
    const segments = turf.lineSegment(feature);
    segments.features.forEach(seg => {
      const [start, end] = seg.geometry.coordinates;
      const segLen = turf.length(seg, { units: 'meters' });
      if (segLen < spacing) return;

      const bearing = turf.bearing(start, end);
      const normalAngle = bearing + 90 + rotate;
      const count = Math.floor(segLen / spacing);
      for (let i = 0; i < count; i++) {
        const distAlong = (i + 0.5) * spacing;
        const centerPt = turf.along(seg, distAlong, { units: 'meters' });
        const half = length / 2;
        const p1 = turf.destination(centerPt, half, normalAngle, { units: 'meters' });
        const p2 = turf.destination(centerPt, half, normalAngle + 180, { units: 'meters' });
        hachures.push(turf.lineString([p1.geometry.coordinates, p2.geometry.coordinates]));
      }
    });
  });

  return turf.featureCollection(hachures);
}

module.exports = { demToContours, generateHachures };
