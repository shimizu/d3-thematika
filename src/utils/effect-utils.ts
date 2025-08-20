import { Selection } from 'd3-selection';
import { GeoProjection, geoPath } from 'd3-geo';

/**
 * SVGエフェクト生成ユーティリティ
 * - GaussianBlur / DropShadow / Bloom / ColorMatrix / Glow / EdgeDetect / InnerShadow / Outline / Noise
 * - GeoJSONからのclipPath生成
 * - フィルタープリセット
 *
 * NOTE:
 * - すべて <defs> 直下に <filter> / <clipPath> を追加します（不要な <defs><defs> ネストは排除）
 * - 各 createXxx(...) は D3 の <defs> セレクションを受け取る関数（コールバック）を返します
 * - 返り値の関数には .url(): string を持たせ、CSS filter: url(#id) にそのまま使えるようにします
 */

/* -----------------------------------------------------------------------------
 * 型定義
 * ---------------------------------------------------------------------------*/

/** ガウシアンブラーフィルターのオプション */
export interface GaussianBlurOptions {
  id: string;
  stdDeviation: number | string;
  x?: string;
  y?: string;
  width?: string;
  height?: string;
}

/** ドロップシャドウフィルターのオプション */
export interface DropShadowOptions {
  id: string;
  dx: number;
  dy: number;
  stdDeviation: number;
  floodColor?: string;
  floodOpacity?: number;
  x?: string;
  y?: string;
  width?: string;
  height?: string;
}

/** ブルームエフェクトフィルターのオプション */
export interface BloomOptions {
  id: string;
  intensity: number;         // GaussianBlur の強さ
  threshold?: number;        // 0..1 相当の閾値（加算オフセットとして使用）
  color?: string;            // ブルームの着色
  x?: string;
  y?: string;
  width?: string;
  height?: string;
}

/** 色行列（彩度/色相/モノクロ等） */
export interface ColorMatrixOptions {
  id: string;
  type: 'saturate' | 'hueRotate' | 'luminanceToAlpha' | 'matrix';
  values?: string;           // type='matrix' のとき 20値、saturate/hueRotate のとき単一値
  x?: string;
  y?: string;
  width?: string;
  height?: string;
}

/** 外側発光（Glow） */
export interface GlowOptions {
  id: string;
  stdDeviation: number;
  color?: string;
  opacity?: number;
  x?: string;
  y?: string;
  width?: string;
  height?: string;
}

/** 輪郭抽出（Edge Detection） */
export interface EdgeDetectOptions {
  id: string;
  x?: string;
  y?: string;
  width?: string;
  height?: string;
}

/** 内側シャドウ（Inner Shadow） */
export interface InnerShadowOptions {
  id: string;
  dx: number;
  dy: number;
  stdDeviation: number;
  color?: string;
  opacity?: number;
  x?: string;
  y?: string;
  width?: string;
  height?: string;
}

/** アウトライン（モルフォロジー） */
export interface OutlineOptions {
  id: string;
  radius: number;            // 膨張（dilate）半径
  color?: string;
  opacity?: number;
  x?: string;
  y?: string;
  width?: string;
  height?: string;
}

/** フィルムグレイン/ノイズ */
export interface NoiseOptions {
  id: string;
  baseFrequency?: number;    // 例: 0.8
  numOctaves?: number;       // 例: 1〜5
  opacity?: number;          // 0..1
  x?: string;
  y?: string;
  width?: string;
  height?: string;
}

/** GeoJSON クリップパス */
export interface ClipPolygonOptions {
  id: string;
  polygon:
    | GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>
    | GeoJSON.FeatureCollection;
  projection: GeoProjection;
}

/* -----------------------------------------------------------------------------
 * 基本ユーティリティ
 * ---------------------------------------------------------------------------*/

/** フィルターの参照URL（CSS filter 用） */
export function getFilterUrl(filterId: string): string {
  return `url(#${filterId})`;
}

/** 複数フィルターの連鎖適用（filter プロパティ値を生成） */
export function chainFilters(filterIds: string[]): string {
  return filterIds.map(id => `url(#${id})`).join(' ');
}

/** 任意のフィルターXMLを挿入（高度なカスタム用） */
export function createCustomFilter(id: string, filterContent: string) {
  return (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => {
    defs.append('filter').attr('id', id).html(filterContent);
  };
}

/* -----------------------------------------------------------------------------
 * 各種 フィルター ファクトリ
 * ---------------------------------------------------------------------------*/

/** GaussianBlur */
export function createGaussianBlur(options: GaussianBlurOptions) {
  const fn = (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => {
    const filter = defs.append('filter').attr('id', options.id);
    if (options.x) filter.attr('x', options.x);
    if (options.y) filter.attr('y', options.y);
    if (options.width) filter.attr('width', options.width);
    if (options.height) filter.attr('height', options.height);

    filter.append('feGaussianBlur').attr('stdDeviation', options.stdDeviation);
  };
  (fn as any).url = () => getFilterUrl(options.id);
  return fn;
}

/** DropShadow（feDropShadow版。色/不透明を指定可） */
export function createDropShadow(options: DropShadowOptions) {
  const fn = (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => {
    const filter = defs.append('filter').attr('id', options.id);
    if (options.x) filter.attr('x', options.x);
    if (options.y) filter.attr('y', options.y);
    if (options.width) filter.attr('width', options.width);
    if (options.height) filter.attr('height', options.height);

    const ds = filter
      .append('feDropShadow')
      .attr('dx', options.dx)
      .attr('dy', options.dy)
      .attr('stdDeviation', options.stdDeviation);

    if (options.floodColor) ds.attr('flood-color', options.floodColor);
    if (options.floodOpacity !== undefined) ds.attr('flood-opacity', options.floodOpacity);
  };
  (fn as any).url = () => getFilterUrl(options.id);
  return fn;
}

/** Bloom（閾値で明部のみをぼかして合成。着色も可） */
export function createBloom(options: BloomOptions) {
  const fn = (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => {
    const filter = defs.append('filter').attr('id', options.id);
    filter
      .attr('x', options.x ?? '-50%')
      .attr('y', options.y ?? '-50%')
      .attr('width', options.width ?? '200%')
      .attr('height', options.height ?? '200%');

    // 明度閾値（0..1を仮定し、オフセットで近似）
    if (options.threshold !== undefined) {
      const t = options.threshold;
      // BT.709 係数で輝度→オフセット閾
      const mat = [
        0.2126, 0.7152, 0.0722, 0, t,
        0.2126, 0.7152, 0.0722, 0, t,
        0.2126, 0.7152, 0.0722, 0, t,
        0, 0, 0, 1, 0
      ].join(' ');
      filter.append('feColorMatrix').attr('values', mat).attr('result', 'bright');
    }

    // ぼかし
    filter
      .append('feGaussianBlur')
      .attr('in', options.threshold !== undefined ? 'bright' : 'SourceGraphic')
      .attr('stdDeviation', options.intensity)
      .attr('result', 'bloom');

    // 着色（任意）
    if (options.color) {
      filter.append('feFlood').attr('flood-color', options.color).attr('result', 'color');
      filter
        .append('feComposite')
        .attr('in', 'color')
        .attr('in2', 'bloom')
        .attr('operator', 'in')
        .attr('result', 'coloredBloom');
    }

    // 元と合成
    filter
      .append('feMerge')
      .selectAll('feMergeNode')
      .data(['SourceGraphic', options.color ? 'coloredBloom' : 'bloom'])
      .enter()
      .append('feMergeNode')
      .attr('in', d => d);
  };
  (fn as any).url = () => getFilterUrl(options.id);
  return fn;
}

/** ColorMatrix（彩度/色相/モノクロ等） */
export function createColorMatrix(options: ColorMatrixOptions) {
  const fn = (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => {
    const filter = defs.append('filter').attr('id', options.id);
    if (options.x) filter.attr('x', options.x);
    if (options.y) filter.attr('y', options.y);
    if (options.width) filter.attr('width', options.width);
    if (options.height) filter.attr('height', options.height);

    const cm = filter.append('feColorMatrix').attr('type', options.type);
    if (options.values !== undefined) cm.attr('values', options.values);
  };
  (fn as any).url = () => getFilterUrl(options.id);
  return fn;
}

/** Glow（外側発光：アルファをぼかして着色→合成） */
export function createGlow(options: GlowOptions) {
  const fn = (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => {
    const filter = defs.append('filter').attr('id', options.id);
    filter
      .attr('x', options.x ?? '-50%')
      .attr('y', options.y ?? '-50%')
      .attr('width', options.width ?? '200%')
      .attr('height', options.height ?? '200%');

    filter
      .append('feGaussianBlur')
      .attr('in', 'SourceAlpha')
      .attr('stdDeviation', options.stdDeviation)
      .attr('result', 'blur');

    filter
      .append('feFlood')
      .attr('flood-color', options.color ?? '#00f')
      .attr('flood-opacity', options.opacity ?? 0.7)
      .attr('result', 'flood');

    filter
      .append('feComposite')
      .attr('in', 'flood')
      .attr('in2', 'blur')
      .attr('operator', 'in')
      .attr('result', 'glow');

    filter
      .append('feMerge')
      .selectAll('feMergeNode')
      .data(['SourceGraphic', 'glow'])
      .enter()
      .append('feMergeNode')
      .attr('in', d => d);
  };
  (fn as any).url = () => getFilterUrl(options.id);
  return fn;
}

/** EdgeDetect（輪郭抽出：3x3 Laplacian） */
export function createEdgeDetect(options: EdgeDetectOptions) {
  const fn = (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => {
    const filter = defs.append('filter').attr('id', options.id);
    if (options.x) filter.attr('x', options.x);
    if (options.y) filter.attr('y', options.y);
    if (options.width) filter.attr('width', options.width);
    if (options.height) filter.attr('height', options.height);

    filter
      .append('feConvolveMatrix')
      .attr('order', '3')
      .attr('kernelMatrix', '-1 -1 -1 -1 8 -1 -1 -1 -1')
      .attr('preserveAlpha', 'true');
  };
  (fn as any).url = () => getFilterUrl(options.id);
  return fn;
}

/** InnerShadow（内側影：アルファをオフセット＆ブラー→反転合成） */
export function createInnerShadow(options: InnerShadowOptions) {
  const fn = (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => {
    const filter = defs.append('filter').attr('id', options.id);
    filter
      .attr('x', options.x ?? '-50%')
      .attr('y', options.y ?? '-50%')
      .attr('width', options.width ?? '200%')
      .attr('height', options.height ?? '200%');

    // 影の生成
    filter.append('feOffset')
      .attr('in', 'SourceAlpha')
      .attr('dx', options.dx)
      .attr('dy', options.dy)
      .attr('result', 'offA');

    filter.append('feGaussianBlur')
      .attr('in', 'offA')
      .attr('stdDeviation', options.stdDeviation)
      .attr('result', 'blur');

    filter.append('feComposite')
      .attr('in', 'blur')
      .attr('in2', 'SourceAlpha')
      .attr('operator', 'arithmetic')
      .attr('k2', '-1')      // inner = blur * (1 - alpha)
      .attr('k3', '1')
      .attr('result', 'inner');

    filter.append('feFlood')
      .attr('flood-color', options.color ?? '#000')
      .attr('flood-opacity', options.opacity ?? 0.6)
      .attr('result', 'color');

    filter.append('feComposite')
      .attr('in', 'color')
      .attr('in2', 'inner')
      .attr('operator', 'in')
      .attr('result', 'innerColor');

    filter.append('feComposite')
      .attr('in', 'SourceGraphic')
      .attr('in2', 'innerColor')
      .attr('operator', 'over');
  };
  (fn as any).url = () => getFilterUrl(options.id);
  return fn;
}

/** Outline（モルフォロジー膨張で外枠→着色合成） */
export function createOutline(options: OutlineOptions) {
  const fn = (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => {
    const filter = defs.append('filter').attr('id', options.id);
    filter
      .attr('x', options.x ?? '-50%')
      .attr('y', options.y ?? '-50%')
      .attr('width', options.width ?? '200%')
      .attr('height', options.height ?? '200%');

    filter
      .append('feMorphology')
      .attr('in', 'SourceAlpha')
      .attr('operator', 'dilate')
      .attr('radius', options.radius)
      .attr('result', 'dilated');

    filter
      .append('feComposite')
      .attr('in', 'dilated')
      .attr('in2', 'SourceAlpha')
      .attr('operator', 'out')
      .attr('result', 'stroke'); // 外側の輪っかだけ抽出

    filter.append('feFlood')
      .attr('flood-color', options.color ?? '#000')
      .attr('flood-opacity', options.opacity ?? 1)
      .attr('result', 'strokeColor');

    filter.append('feComposite')
      .attr('in', 'strokeColor')
      .attr('in2', 'stroke')
      .attr('operator', 'in')
      .attr('result', 'coloredStroke');

    filter
      .append('feMerge')
      .selectAll('feMergeNode')
      .data(['SourceGraphic', 'coloredStroke'])
      .enter()
      .append('feMergeNode')
      .attr('in', d => d);
  };
  (fn as any).url = () => getFilterUrl(options.id);
  return fn;
}

/** Noise / Film Grain（タービュランス＋スクリーン合成） */
export function createNoise(options: NoiseOptions) {
  const fn = (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => {
    const filter = defs.append('filter').attr('id', options.id);
    filter
      .attr('x', options.x ?? '-20%')
      .attr('y', options.y ?? '-20%')
      .attr('width', options.width ?? '140%')
      .attr('height', options.height ?? '140%');

    filter
      .append('feTurbulence')
      .attr('type', 'fractalNoise')
      .attr('baseFrequency', options.baseFrequency ?? 0.8)
      .attr('numOctaves', options.numOctaves ?? 1)
      .attr('result', 'noise');

    // コントラストを少し上げて粒状感を強調
    filter
      .append('feColorMatrix')
      .attr('in', 'noise')
      .attr('type', 'matrix')
      .attr(
        'values',
        [
          1.2, 0,   0,   0, -0.1,
          0,   1.2, 0,   0, -0.1,
          0,   0,   1.2, 0, -0.1,
          0,   0,   0,   1,  0
        ].join(' ')
      )
      .attr('result', 'grain');

    // スクリーン合成（明るい粒子を足す）
    filter
      .append('feBlend')
      .attr('in', 'SourceGraphic')
      .attr('in2', 'grain')
      .attr('mode', 'screen')
      .attr('result', 'screened');

    // 全体の不透明度を制御
    filter
      .append('feComponentTransfer')
      .attr('in', 'screened')
      .append('feFuncA')
      .attr('type', 'linear')
      .attr('slope', options.opacity ?? 0.15);
  };
  (fn as any).url = () => getFilterUrl(options.id);
  return fn;
}

/* -----------------------------------------------------------------------------
 * クリップパス（GeoJSON）
 * ---------------------------------------------------------------------------*/

export function createClipPolygon(options: ClipPolygonOptions) {
  const fn = (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => {
    const path = geoPath(options.projection);
    const clipPath = defs.append('clipPath').attr('id', options.id);

    if ((options.polygon as GeoJSON.FeatureCollection).type === 'FeatureCollection') {
      const fc = options.polygon as GeoJSON.FeatureCollection;
      fc.features.forEach((feature, index) => {
        const d = path(feature as any);
        if (d) clipPath.append('path').attr('d', d).attr('class', `clip-path-${index}`);
      });
    } else {
      const feat = options.polygon as GeoJSON.Feature<
        GeoJSON.Polygon | GeoJSON.MultiPolygon
      >;
      const d = path(feat as any);
      if (d) clipPath.append('path').attr('d', d);
    }
  };
  (fn as any).url = () => getFilterUrl(options.id);
  return fn;
}

/* -----------------------------------------------------------------------------
 * プリセット
 * ---------------------------------------------------------------------------*/

export const FilterPresets = {
  /* 既存互換 */
  lightBlur: () =>
    createGaussianBlur({ id: 'lightBlur', stdDeviation: 2 }),
  strongBlur: () =>
    createGaussianBlur({ id: 'strongBlur', stdDeviation: 8 }),

  standardDropShadow: () =>
    createDropShadow({
      id: 'standardDropShadow',
      dx: 3,
      dy: 3,
      stdDeviation: 2,
      floodColor: '#000000',
      floodOpacity: 0.3
    }),

  softDropShadow: () =>
    createDropShadow({
      id: 'softDropShadow',
      dx: 2,
      dy: 2,
      stdDeviation: 4,
      floodColor: '#000000',
      floodOpacity: 0.2
    }),

  standardBloom: () =>
    createBloom({ id: 'standardBloom', intensity: 4, threshold: 0.8 }),

  strongBloom: () =>
    createBloom({ id: 'strongBloom', intensity: 8, threshold: 0.6, color: '#ffffff' }),

  /* 新規 */
  grayscale: () =>
    createColorMatrix({ id: 'grayscale', type: 'saturate', values: '0' }),

  hueRotate60: () =>
    createColorMatrix({ id: 'hueRotate60', type: 'hueRotate', values: '60' }),

  sepia: () =>
    createColorMatrix({
      id: 'sepia',
      type: 'matrix',
      // 標準的なセピア行列（軽め）
      values: [
        0.393, 0.769, 0.189, 0, 0,
        0.349, 0.686, 0.168, 0, 0,
        0.272, 0.534, 0.131, 0, 0,
        0,     0,     0,     1, 0
      ].join(' ')
    }),

  blueGlow: () =>
    createGlow({ id: 'blueGlow', color: '#00ffff', stdDeviation: 4, opacity: 0.8 }),

  neonMagenta: () =>
    createGlow({ id: 'neonMagenta', color: '#ff00ff', stdDeviation: 5, opacity: 0.9 }),

  edgeDetect: () =>
    createEdgeDetect({ id: 'edgeDetect' }),

  softInnerShadow: () =>
    createInnerShadow({ id: 'softInnerShadow', dx: 1, dy: 1, stdDeviation: 2, opacity: 0.4 }),

  outlineThin: () =>
    createOutline({ id: 'outlineThin', radius: 1, color: '#000', opacity: 0.9 }),

  outlineThick: () =>
    createOutline({ id: 'outlineThick', radius: 2.5, color: '#000', opacity: 0.9 }),

  filmGrain: () =>
    createNoise({ id: 'filmGrain', baseFrequency: 0.9, numOctaves: 1, opacity: 0.12 }),

  warmBloom: () =>
    createBloom({ id: 'warmBloom', intensity: 5, threshold: 0.7, color: '#ffd1a3' })
};
