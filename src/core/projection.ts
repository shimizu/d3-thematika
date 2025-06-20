import { 
  geoNaturalEarth1, 
  geoMercator, 
  geoOrthographic, 
  geoEquirectangular,
  GeoProjection 
} from 'd3-geo';
import { ProjectionName } from '../types';

/**
 * サポートされている投影法名と対応するD3投影法関数のマッピング
 */
const projectionMap: Record<ProjectionName, () => GeoProjection> = {
  naturalEarth1: geoNaturalEarth1,
  mercator: geoMercator,
  orthographic: geoOrthographic,
  equirectangular: geoEquirectangular
};

/**
 * 投影法を作成し、地図のサイズに合わせて設定します
 * @param projection - 投影法の名前または投影法オブジェクト
 * @param width - 地図の幅
 * @param height - 地図の高さ
 * @returns 設定済みの投影法オブジェクト
 * @throws {Error} 未知の投影法名が指定された場合
 */
export function createProjection(
  projection: string | GeoProjection,
  width: number,
  height: number
): GeoProjection {
  let proj: GeoProjection;

  if (typeof projection === 'string') {
    const projectionFn = projectionMap[projection as ProjectionName];
    if (!projectionFn) {
      throw new Error(`Unknown projection: ${projection}`);
    }
    proj = projectionFn();
  } else {
    proj = projection;
  }

  // 基本的なフィッティング設定
  return proj
    .scale(Math.min(width, height) / 6.5)
    .translate([width / 2, height / 2]);
}