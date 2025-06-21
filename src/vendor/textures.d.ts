/*!
 * Type definitions for Textures.js v1.2.3
 * SVG patterns for Data Visualization
 * https://github.com/riccardoscalco/textures
 * 
 * Included in d3-thematika under MIT License terms
 */

import { Selection } from 'd3-selection';

export interface TextureFunction {
  (selection: Selection<SVGDefsElement, unknown, HTMLElement, any>): void;
  url(): string;
}

export interface CirclesTexture extends TextureFunction {
  heavier(n?: number): CirclesTexture;
  lighter(n?: number): CirclesTexture;
  thinner(n?: number): CirclesTexture;
  thicker(n?: number): CirclesTexture;
  background(color: string): CirclesTexture;
  size(size: number): CirclesTexture;
  complement(complement?: boolean): CirclesTexture;
  radius(radius: number): CirclesTexture;
  fill(color: string): CirclesTexture;
  stroke(color: string): CirclesTexture;
  strokeWidth(width: number): CirclesTexture;
  id(id?: string): CirclesTexture | string;
}

export interface LinesTexture extends TextureFunction {
  heavier(n?: number): LinesTexture;
  lighter(n?: number): LinesTexture;
  thinner(n?: number): LinesTexture;
  thicker(n?: number): LinesTexture;
  background(color: string): LinesTexture;
  size(size: number): LinesTexture;
  orientation(...orientations: string[]): LinesTexture;
  shapeRendering(rendering: string): LinesTexture;
  stroke(color: string): LinesTexture;
  strokeWidth(width: number): LinesTexture;
  id(id?: string): LinesTexture | string;
}

export interface PathsTexture extends TextureFunction {
  heavier(n?: number): PathsTexture;
  lighter(n?: number): PathsTexture;
  thinner(n?: number): PathsTexture;
  thicker(n?: number): PathsTexture;
  background(color: string): PathsTexture;
  shapeRendering(rendering: string): PathsTexture;
  size(size: number): PathsTexture;
  d(path: string | ((size: number) => string)): PathsTexture;
  fill(color: string): PathsTexture;
  stroke(color: string): PathsTexture;
  strokeWidth(width: number): PathsTexture;
  id(id?: string): PathsTexture | string;
}

export interface TexturesAPI {
  circles(): CirclesTexture;
  lines(): LinesTexture;
  paths(): PathsTexture;
}

declare const textures: TexturesAPI;
export default textures;