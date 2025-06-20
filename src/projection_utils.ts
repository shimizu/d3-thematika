import { 
  geoNaturalEarth1, 
  geoMercator, 
  geoOrthographic, 
  geoEquirectangular,
  GeoProjection 
} from 'd3-geo';
import { ProjectionName } from './cartography_types';

const projectionMap: Record<ProjectionName, () => GeoProjection> = {
  naturalEarth1: geoNaturalEarth1,
  mercator: geoMercator,
  orthographic: geoOrthographic,
  equirectangular: geoEquirectangular
};

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