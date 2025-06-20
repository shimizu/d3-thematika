import { GeoProjection } from 'd3-geo';

export interface CartographyOptions {
  container: string;
  width: number;
  height: number;
  projection: string | GeoProjection;
}

export interface LayerStyle {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  className?: string;
}

export interface LayerOptions {
  data: GeoJSON.FeatureCollection | GeoJSON.Feature[];
  style?: LayerStyle;
}

export interface CartographyLayer {
  id: string;
  data: GeoJSON.FeatureCollection;
  style: LayerStyle;
  element?: SVGGElement;
}

export type ProjectionName = 'naturalEarth1' | 'mercator' | 'orthographic' | 'equirectangular';