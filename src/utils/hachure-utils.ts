/**
 * ハッチング＆等高線生成ユーティリティ
 * 
 * 地形表現のための等高線とハッチング線を生成する機能を提供
 */

import * as d3 from 'd3-contour';
import * as turf from '@turf/turf';
import { Selection, BaseType } from 'd3-selection';

/**
 * 等高線生成オプション
 */
export interface ContourOptions {
  /** 等高線の間隔（データ単位） */
  interval: number;
  /** データの境界 [[xmin, ymin], [xmax, ymax]] */
  bounds: [[number, number], [number, number]];
  /** スムージングを適用するか */
  smooth?: boolean;
  /** 最小値（指定しない場合は自動計算） */
  minValue?: number;
  /** 最大値（指定しない場合は自動計算） */
  maxValue?: number;
}

/**
 * ハッチング生成オプション
 */
export interface HachureOptions {
  /** ハッチング線の間隔（ピクセル単位） */
  spacing: number;
  /** ハッチング線の長さ（ピクセル単位） */
  length: number;
  /** ハッチング線の角度（度、デフォルト: 垂直） */
  angle?: number;
  /** 密度（0-1、デフォルト: 1） */
  density?: number;
  /** ランダム性（0-1、デフォルト: 0） */
  randomness?: number;
}

/**
 * SVGハッチングパターンオプション
 */
export interface HatchPatternOptions {
  /** 線の間隔 */
  spacing?: number;
  /** 線の太さ */
  strokeWidth?: number;
  /** 線の色 */
  stroke?: string;
  /** 角度（度） */
  angle?: number;
  /** 背景色 */
  background?: string;
}

/**
 * 2次元配列データから等高線を生成
 * 
 * @param data - 2次元配列の数値データ（標高値など）
 * @param options - 等高線生成オプション
 * @returns GeoJSON FeatureCollection (MultiLineString)
 */
export function generateContours(
  data: number[][],
  options: ContourOptions
): GeoJSON.FeatureCollection<GeoJSON.MultiLineString> {
  const {
    interval,
    bounds,
    smooth = false,
    minValue,
    maxValue
  } = options;

  const [[xmin, ymin], [xmax, ymax]] = bounds;
  const height = data.length;
  const width = data[0]?.length || 0;

  if (width === 0 || height === 0) {
    return {
      type: 'FeatureCollection',
      features: []
    };
  }

  // データの最小値・最大値を計算
  let min = minValue ?? Infinity;
  let max = maxValue ?? -Infinity;
  
  if (minValue === undefined || maxValue === undefined) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const value = data[y][x];
        if (!isNaN(value)) {
          min = Math.min(min, value);
          max = Math.max(max, value);
        }
      }
    }
  }

  // 等高線レベルの配列を生成
  const levels: number[] = [];
  const startLevel = Math.ceil(min / interval) * interval;
  for (let level = startLevel; level <= max; level += interval) {
    levels.push(level);
  }

  // d3-contourを使用して等高線を生成
  const contourGenerator = d3.contours()
    .size([width, height])
    .thresholds(levels);

  // 1次元配列に変換
  const flatData: number[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      flatData.push(data[y][x]);
    }
  }

  const contours = contourGenerator(flatData);

  // GeoJSON形式に変換
  const features = contours
    .filter((contour: any) => contour && contour.coordinates && contour.coordinates.length > 0)
    .map((contour: any) => {
    // 座標を地理座標に変換
    const coordinates = contour.coordinates
      .filter((ring: any[]) => ring && ring.length >= 2) // 2点以上のリングのみ
      .map((ring: any[]) =>
        ring.map((coord: number[]) => {
          const [x, y] = coord;
          const lon = xmin + (x / width) * (xmax - xmin);
          const lat = ymin + (y / height) * (ymax - ymin);
          return [lon, lat];
        })
      ).filter((ring: any[]) => ring.length >= 2); // 変換後も2点以上のリングのみ
    
    // 有効な座標がない場合はnullを返す（後でフィルタリング）
    if (coordinates.length === 0) {
      return null;
    }

    return {
      type: 'Feature',
      properties: {
        value: contour.value
      },
      geometry: {
        type: 'MultiLineString',
        coordinates
      }
    };
  }).filter(feature => feature !== null); // nullをフィルタリング

  return {
    type: 'FeatureCollection',
    features: features as GeoJSON.Feature<GeoJSON.MultiLineString>[]
  };
}

/**
 * 等高線からハッチング線を生成
 * 
 * @param contours - 等高線のGeoJSON
 * @param options - ハッチング生成オプション
 * @returns ハッチング線のGeoJSON FeatureCollection
 */
export function generateHachures(
  contours: GeoJSON.FeatureCollection<GeoJSON.MultiLineString | GeoJSON.LineString>,
  options: HachureOptions
): GeoJSON.FeatureCollection<GeoJSON.LineString> {
  const {
    spacing,
    length,
    angle = 0,
    density = 1,
    randomness = 0
  } = options;

  const hachures: GeoJSON.Feature<GeoJSON.LineString>[] = [];

  contours.features.forEach((feature) => {
    let lines: GeoJSON.Position[][];
    
    if (feature.geometry.type === 'MultiLineString') {
      lines = feature.geometry.coordinates;
    } else if (feature.geometry.type === 'LineString') {
      lines = [feature.geometry.coordinates];
    } else {
      return;
    }

    lines.forEach(line => {
      // 座標の検証：2つ以上の座標が必要
      if (!line || !Array.isArray(line) || line.length < 2) {
        console.warn('Invalid line coordinates, skipping:', line);
        return;
      }
      
      // 各座標が有効かチェック
      const validCoords = line.filter(coord => 
        Array.isArray(coord) && coord.length >= 2 && 
        typeof coord[0] === 'number' && typeof coord[1] === 'number' &&
        !isNaN(coord[0]) && !isNaN(coord[1])
      );
      
      if (validCoords.length < 2) {
        console.warn('Insufficient valid coordinates, skipping line');
        return;
      }
      
      // ライン上に等間隔でポイントを配置
      const lineString = turf.lineString(validCoords);
      const lineLength = turf.length(lineString, { units: 'kilometers' });
      
      // spacing をキロメートルに変換（仮定: 1ピクセル = 0.1km）
      const spacingKm = spacing * 0.001;
      const numHachures = Math.floor(lineLength / spacingKm * density);

      for (let i = 0; i < numHachures; i++) {
        const distance = (i + 0.5) * spacingKm;
        
        // ランダム性を追加
        const randomOffset = randomness * (Math.random() - 0.5) * spacingKm;
        const actualDistance = distance + randomOffset;

        if (actualDistance < 0 || actualDistance > lineLength) continue;

        // ライン上のポイントを取得
        const point = turf.along(lineString, actualDistance, { units: 'kilometers' });
        
        // そのポイントでの接線方向を計算
        const pointBefore = turf.along(lineString, Math.max(0, actualDistance - 0.001), { units: 'kilometers' });
        const pointAfter = turf.along(lineString, Math.min(lineLength, actualDistance + 0.001), { units: 'kilometers' });
        const bearing = turf.bearing(pointBefore, pointAfter);
        
        // ハッチングの角度（接線に対して垂直 + 指定角度）
        const hachureAngle = bearing + 90 + angle;
        
        // ハッチング線の長さ（キロメートル）
        const lengthKm = length * 0.001;
        const halfLength = lengthKm / 2;
        
        // ランダムな長さの変動
        const lengthVariation = 1 + randomness * (Math.random() - 0.5) * 0.5;
        const actualHalfLength = halfLength * lengthVariation;
        
        // ハッチング線の両端を計算
        const end1 = turf.destination(point, actualHalfLength, hachureAngle, { units: 'kilometers' });
        const end2 = turf.destination(point, actualHalfLength, hachureAngle + 180, { units: 'kilometers' });
        
        hachures.push({
          type: 'Feature',
          properties: {
            elevation: feature.properties?.value || 0
          },
          geometry: {
            type: 'LineString',
            coordinates: [
              end1.geometry.coordinates,
              end2.geometry.coordinates
            ]
          }
        });
      }
    });
  });

  return {
    type: 'FeatureCollection',
    features: hachures
  };
}

/**
 * SVGパターンとしてハッチングを作成
 * 
 * @param svg - D3のSVG Selection
 * @param id - パターンのID
 * @param options - ハッチングパターンオプション
 * @returns パターンのURL参照文字列
 */
export function createHatchPattern(
  svg: Selection<SVGSVGElement, unknown, HTMLElement, any>,
  id: string,
  options: HatchPatternOptions = {}
): string {
  const {
    spacing = 5,
    strokeWidth = 1,
    stroke = '#000000',
    angle = 45,
    background = 'none'
  } = options;

  // defsが存在しない場合は作成
  let defs = svg.select<SVGDefsElement>('defs');
  if (defs.empty()) {
    defs = svg.append<SVGDefsElement>('defs');
  }

  // 既存のパターンを削除
  defs.select(`#${id}`).remove();

  // パターンを作成
  const pattern = defs.append('pattern')
    .attr('id', id)
    .attr('patternUnits', 'userSpaceOnUse')
    .attr('width', spacing)
    .attr('height', spacing)
    .attr('patternTransform', `rotate(${angle})`);

  // 背景
  if (background !== 'none') {
    pattern.append('rect')
      .attr('width', spacing)
      .attr('height', spacing)
      .attr('fill', background);
  }

  // ハッチング線
  pattern.append('line')
    .attr('x1', 0)
    .attr('y1', 0)
    .attr('x2', 0)
    .attr('y2', spacing)
    .attr('stroke', stroke)
    .attr('stroke-width', strokeWidth);

  return `url(#${id})`;
}

/**
 * 複数の角度でクロスハッチングパターンを作成
 * 
 * @param svg - D3のSVG Selection
 * @param id - パターンのID
 * @param angles - 角度の配列
 * @param options - ハッチングパターンオプション
 * @returns パターンのURL参照文字列
 */
export function createCrossHatchPattern(
  svg: Selection<SVGSVGElement, unknown, HTMLElement, any>,
  id: string,
  angles: number[],
  options: Omit<HatchPatternOptions, 'angle'> = {}
): string {
  const {
    spacing = 5,
    strokeWidth = 1,
    stroke = '#000000',
    background = 'none'
  } = options;

  // defsが存在しない場合は作成
  let defs = svg.select<SVGDefsElement>('defs');
  if (defs.empty()) {
    defs = svg.append<SVGDefsElement>('defs');
  }

  // 既存のパターンを削除
  defs.select(`#${id}`).remove();

  // パターンを作成
  const pattern = defs.append('pattern')
    .attr('id', id)
    .attr('patternUnits', 'userSpaceOnUse')
    .attr('width', spacing * 2)
    .attr('height', spacing * 2);

  // 背景
  if (background !== 'none') {
    pattern.append('rect')
      .attr('width', spacing * 2)
      .attr('height', spacing * 2)
      .attr('fill', background);
  }

  // 各角度でハッチング線を追加
  angles.forEach(angle => {
    const g = pattern.append('g')
      .attr('transform', `translate(${spacing}, ${spacing}) rotate(${angle})`);

    // 複数の線を追加してパターンを埋める
    for (let offset = -spacing * 2; offset <= spacing * 2; offset += spacing) {
      g.append('line')
        .attr('x1', offset)
        .attr('y1', -spacing * 2)
        .attr('x2', offset)
        .attr('y2', spacing * 2)
        .attr('stroke', stroke)
        .attr('stroke-width', strokeWidth);
    }
  });

  return `url(#${id})`;
}

/**
 * 密度ベースのハッチングパターンを作成
 * 値に応じてハッチングの密度を変える
 * 
 * @param svg - D3のSVG Selection
 * @param id - パターンのID
 * @param density - 密度（0-1）
 * @param options - ハッチングパターンオプション
 * @returns パターンのURL参照文字列
 */
export function createDensityHatchPattern(
  svg: Selection<SVGSVGElement, unknown, HTMLElement, any>,
  id: string,
  density: number,
  options: HatchPatternOptions = {}
): string {
  const adjustedSpacing = options.spacing ? options.spacing / Math.max(0.1, density) : 10 / Math.max(0.1, density);
  
  return createHatchPattern(svg, id, {
    ...options,
    spacing: adjustedSpacing
  });
}