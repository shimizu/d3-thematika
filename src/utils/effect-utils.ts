import { Selection } from 'd3-selection';

/**
 * SVGエフェクト生成に関するユーティリティ関数
 * ガウシアンブラー、ドロップシャドウ、ブルームなどのSVGフィルターを生成します
 */

/**
 * ガウシアンブラーフィルターのオプション
 */
export interface GaussianBlurOptions {
  /** フィルターID */
  id: string;
  /** ブラーの標準偏差（数値または 'x y' 形式） */
  stdDeviation: number | string;
  /** フィルター適用範囲のX座標オフセット（パーセント） */
  x?: string;
  /** フィルター適用範囲のY座標オフセット（パーセント） */
  y?: string;
  /** フィルター適用範囲の幅（パーセント） */
  width?: string;
  /** フィルター適用範囲の高さ（パーセント） */
  height?: string;
}

/**
 * ドロップシャドウフィルターのオプション
 */
export interface DropShadowOptions {
  /** フィルターID */
  id: string;
  /** X方向のオフセット */
  dx: number;
  /** Y方向のオフセット */
  dy: number;
  /** ブラーの標準偏差 */
  stdDeviation: number;
  /** 影の色 */
  floodColor?: string;
  /** 影の透明度 */
  floodOpacity?: number;
}

/**
 * ブルームエフェクトフィルターのオプション
 */
export interface BloomOptions {
  /** フィルターID */
  id: string;
  /** ブラーの強度 */
  intensity: number;
  /** ブルーム効果の明度閾値 */
  threshold?: number;
  /** ブルーム効果の色 */
  color?: string;
}

/**
 * 複合フィルターの定義
 */
export interface FilterDefinition {
  /** フィルター生成関数 */
  generator: (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => void;
  /** フィルターID */
  id: string;
}

/**
 * ガウシアンブラーフィルターを生成します
 * @param options - ガウシアンブラーのオプション
 * @returns D3セレクションで使用可能なコールバック関数
 */
export function createGaussianBlur(options: GaussianBlurOptions) {
  const filterFunction = (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => {
    const filter = defs.append('filter')
      .attr('id', options.id);
    
    // フィルター適用範囲を設定
    if (options.x) filter.attr('x', options.x);
    if (options.y) filter.attr('y', options.y);
    if (options.width) filter.attr('width', options.width);
    if (options.height) filter.attr('height', options.height);
    
    filter.append('feGaussianBlur')
      .attr('stdDeviation', options.stdDeviation);
  };
  
  // textureと同じように.url()メソッドを追加
  (filterFunction as any).url = () => getFilterUrl(options.id);
  
  return filterFunction;
}

/**
 * ドロップシャドウフィルターを生成します
 * @param options - ドロップシャドウのオプション
 * @returns D3セレクションで使用可能なコールバック関数
 */
export function createDropShadow(options: DropShadowOptions) {
  const filterFunction = (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => {
    const filter = defs.append("defs").append('filter')
      .attr('id', options.id);
    
    // feDropShadow要素でシンプルに実装
    const dropShadow = filter.append('feDropShadow')
      .attr('dx', options.dx)
      .attr('dy', options.dy)
      .attr('stdDeviation', options.stdDeviation);
    
    // 影の色が指定されている場合は設定
    if (options.floodColor) {
      dropShadow.attr('flood-color', options.floodColor);
    }
    
    // 影の透明度が指定されている場合は設定
    if (options.floodOpacity !== undefined) {
      dropShadow.attr('flood-opacity', options.floodOpacity);
    }
  };
  
  // textureと同じように.url()メソッドを追加
  (filterFunction as any).url = () => getFilterUrl(options.id);
  
  return filterFunction;
}

/**
 * ブルームエフェクトフィルターを生成します
 * @param options - ブルームエフェクトのオプション
 * @returns D3セレクションで使用可能なコールバック関数
 */
export function createBloom(options: BloomOptions) {
  const filterFunction = (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => {
    const filter = defs.append("defs").append('filter')
      .attr('id', options.id)
      .attr('x', '-50%')
      .attr('y', '-50%')
      .attr('width', '200%')
      .attr('height', '200%');
    
    // 明度閾値でマスクを作成
    if (options.threshold !== undefined) {
      const brightnessMatrix = [
        0.2126, 0.7152, 0.0722, 0, options.threshold,
        0.2126, 0.7152, 0.0722, 0, options.threshold,
        0.2126, 0.7152, 0.0722, 0, options.threshold,
        0, 0, 0, 1, 0
      ].join(' ');
      
      filter.append('feColorMatrix')
        .attr('values', brightnessMatrix)
        .attr('result', 'bright');
    }
    
    // ブラー効果を適用
    filter.append('feGaussianBlur')
      .attr('in', options.threshold !== undefined ? 'bright' : 'SourceGraphic')
      .attr('stdDeviation', options.intensity)
      .attr('result', 'bloom');
    
    // ブルーム効果の色を調整
    if (options.color) {
      filter.append('feFlood')
        .attr('flood-color', options.color)
        .attr('result', 'color');
      
      filter.append('feComposite')
        .attr('in', 'color')
        .attr('in2', 'bloom')
        .attr('operator', 'in')
        .attr('result', 'coloredBloom');
    }
    
    // 元の形状とブルーム効果を合成
    filter.append('feMerge')
      .selectAll('feMergeNode')
      .data(['SourceGraphic', options.color ? 'coloredBloom' : 'bloom'])
      .enter()
      .append('feMergeNode')
      .attr('in', d => d);
  };
  
  // textureと同じように.url()メソッドを追加
  (filterFunction as any).url = () => getFilterUrl(options.id);
  
  return filterFunction;
}

/**
 * 複数のエフェクトを組み合わせた複合フィルターを生成します
 * @param id - 複合フィルターのID
 * @param effects - 適用するエフェクトの配列
 * @returns D3セレクションで使用可能なコールバック関数
 */
export function createComplexFilter(id: string, effects: FilterDefinition[]) {
  return (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => {
    const filter = defs.append("defs").append('filter')
      .attr('id', id)
      .attr('x', '-100%')
      .attr('y', '-100%')
      .attr('width', '300%')
      .attr('height', '300%');
    
    let currentResult = 'SourceGraphic';
    
    effects.forEach((effect, index) => {
      const effectId = `${id}_effect_${index}`;
      
      // 個別のエフェクト要素を追加
      // 注意: 実際の実装ではeffect.generatorの内容を
      // filterコンテキスト内に適用する必要があります
      
      // 結果の名前を更新
      currentResult = `effect_${index}`;
    });
  };
}

/**
 * よく使用されるフィルターのプリセット
 */
export const FilterPresets = {
  /**
   * 軽いブラー効果
   */
  lightBlur: () => createGaussianBlur({
    id: 'lightBlur',
    stdDeviation: 2
  }),
  
  /**
   * 強いブラー効果
   */
  strongBlur: () => createGaussianBlur({
    id: 'strongBlur',
    stdDeviation: 8
  }),
  
  /**
   * 標準的なドロップシャドウ
   */
  standardDropShadow: () => createDropShadow({
    id: 'standardDropShadow',
    dx: 3,
    dy: 3,
    stdDeviation: 2,
    floodColor: '#000000',
    floodOpacity: 0.3
  }),
  
  /**
   * ソフトなドロップシャドウ
   */
  softDropShadow: () => createDropShadow({
    id: 'softDropShadow',
    dx: 2,
    dy: 2,
    stdDeviation: 4,
    floodColor: '#000000',
    floodOpacity: 0.2
  }),
  
  /**
   * 標準的なブルーム効果
   */
  standardBloom: () => createBloom({
    id: 'standardBloom',
    intensity: 4,
    threshold: 0.8
  }),
  
  /**
   * 強いブルーム効果
   */
  strongBloom: () => createBloom({
    id: 'strongBloom',
    intensity: 8,
    threshold: 0.6,
    color: '#ffffff'
  })
};

/**
 * カスタムSVGフィルターを文字列から生成します
 * @param id - フィルターID
 * @param filterContent - SVGフィルターの内容（XML文字列）
 * @returns D3セレクションで使用可能なコールバック関数
 */
export function createCustomFilter(id: string, filterContent: string) {
  return (defs: Selection<SVGDefsElement, unknown, HTMLElement, any>) => {
    const filterContainer = defs.append('g');
    filterContainer.html(`<filter id="${id}">${filterContent}</filter>`);
  };
}

/**
 * フィルターの参照URLを生成します
 * @param filterId - フィルターID
 * @returns CSS filter プロパティで使用可能なURL文字列
 */
export function getFilterUrl(filterId: string): string {
  return `url(#${filterId})`;
}

/**
 * 複数のフィルターを連鎖適用するためのヘルパー関数
 * @param filterIds - 適用するフィルターIDの配列
 * @returns CSS filter プロパティで使用可能な文字列
 */
export function chainFilters(filterIds: string[]): string {
  return filterIds.map(id => `url(#${id})`).join(' ');
}