/**
 * カラーパレットユーティリティ
 * 科学的に検証済みのカラーパレットと色覚アクセシビリティ機能を提供
 */

import { PaletteType, ColorBlindnessType, ColorPalette, PaletteRecommendation } from '../types';

/**
 * ColorBrewer パレット
 * Cynthia A. Brewerによる科学的に検証されたカラーパレット
 */
export const ColorBrewerPalettes: Record<string, ColorPalette> = {
  // カテゴリカルパレット
  Set1: {
    name: 'Set1',
    type: 'categorical',
    colors: ['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00', '#ffff33', '#a65628', '#f781bf', '#999999'],
    colorBlindSafe: false,
    description: '鮮やかなカテゴリカルカラー（最大9クラス）',
    maxClasses: 9
  },
  Set2: {
    name: 'Set2',
    type: 'categorical',
    colors: ['#66c2a5', '#fc8d62', '#8da0cb', '#e78ac3', '#a6d854', '#ffd92f', '#e5c494', '#b3b3b3'],
    colorBlindSafe: true,
    description: 'パステル調カテゴリカルカラー（色覚障害対応、最大8クラス）',
    maxClasses: 8
  },
  Set3: {
    name: 'Set3',
    type: 'categorical',
    colors: ['#8dd3c7', '#ffffb3', '#bebada', '#fb8072', '#80b1d3', '#fdb462', '#b3de69', '#fccde5', '#d9d9d9', '#bc80bd', '#ccebc5', '#ffed6f'],
    colorBlindSafe: false,
    description: '薄い色調のカテゴリカルカラー（最大12クラス）',
    maxClasses: 12
  },
  
  // 連続パレット（シングルハゼ）
  Blues: {
    name: 'Blues',
    type: 'sequential',
    colors: ['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#08519c', '#08306b'],
    colorBlindSafe: true,
    description: '青系連続カラー（色覚障害対応）',
    maxClasses: 9
  },
  Greens: {
    name: 'Greens',
    type: 'sequential',
    colors: ['#f7fcf5', '#e5f5e0', '#c7e9c0', '#a1d99b', '#74c476', '#41ab5d', '#238b45', '#006d2c', '#00441b'],
    colorBlindSafe: true,
    description: '緑系連続カラー（色覚障害対応）',
    maxClasses: 9
  },
  Oranges: {
    name: 'Oranges',
    type: 'sequential',
    colors: ['#fff5eb', '#fee6ce', '#fdd0a2', '#fdae6b', '#fd8d3c', '#f16913', '#d94801', '#a63603', '#7f2704'],
    colorBlindSafe: true,
    description: 'オレンジ系連続カラー（色覚障害対応）',
    maxClasses: 9
  },
  
  // 連続パレット（マルチハゼ）
  YlOrRd: {
    name: 'YlOrRd',
    type: 'sequential',
    colors: ['#ffffcc', '#ffeda0', '#fed976', '#feb24c', '#fd8d3c', '#fc4e2a', '#e31a1c', '#bd0026', '#800026'],
    colorBlindSafe: true,
    description: '黄-オレンジ-赤系連続カラー（色覚障害対応）',
    maxClasses: 9
  },
  YlGnBu: {
    name: 'YlGnBu',
    type: 'sequential',
    colors: ['#ffffd9', '#edf8b1', '#c7e9b4', '#7fcdbb', '#41b6c4', '#1d91c0', '#225ea8', '#253494', '#081d58'],
    colorBlindSafe: true,
    description: '黄-緑-青系連続カラー（色覚障害対応）',
    maxClasses: 9
  },
  
  // 発散パレット
  RdYlBu: {
    name: 'RdYlBu',
    type: 'diverging',
    colors: ['#a50026', '#d73027', '#f46d43', '#fdae61', '#fee090', '#ffffbf', '#e0f3f8', '#abd9e9', '#74add1', '#4575b4', '#313695'],
    colorBlindSafe: false,
    description: '赤-黄-青系発散カラー',
    maxClasses: 11
  },
  RdBu: {
    name: 'RdBu',
    type: 'diverging',
    colors: ['#67001f', '#b2182b', '#d6604d', '#f4a582', '#fddbc7', '#f7f7f7', '#d1e5f0', '#92c5de', '#4393c3', '#2166ac', '#053061'],
    colorBlindSafe: true,
    description: '赤-青系発散カラー（色覚障害対応）',
    maxClasses: 11
  },
  BrBG: {
    name: 'BrBG',
    type: 'diverging',
    colors: ['#543005', '#8c510a', '#bf812d', '#dfc27d', '#f6e8c3', '#f5f5f5', '#c7eae5', '#80cdc1', '#35978f', '#01665e', '#003c30'],
    colorBlindSafe: true,
    description: '茶-緑系発散カラー（色覚障害対応）',
    maxClasses: 11
  }
};

/**
 * Viridis パレット
 * 知覚的に均一で色覚障害に配慮したパレット
 */
export const ViridissPalettes: Record<string, ColorPalette> = {
  Viridis: {
    name: 'Viridis',
    type: 'sequential',
    colors: ['#440154', '#482777', '#3f4a8a', '#31678e', '#26838f', '#1f9d8a', '#6cce5a', '#b6de2b', '#fee825'],
    colorBlindSafe: true,
    description: 'Viridis連続カラー（知覚的均一、色覚障害対応）',
    maxClasses: 9
  },
  Plasma: {
    name: 'Plasma',
    type: 'sequential',
    colors: ['#0d0887', '#46039f', '#7201a8', '#9c179e', '#bd3786', '#d8576b', '#ed7953', '#fb9f3a', '#fdca26', '#f0f921'],
    colorBlindSafe: true,
    description: 'Plasma連続カラー（知覚的均一、色覚障害対応）',
    maxClasses: 10
  },
  Inferno: {
    name: 'Inferno',
    type: 'sequential',
    colors: ['#000004', '#1b0c41', '#4a0c6b', '#781c6d', '#a52c60', '#cf4446', '#ed6925', '#fb9b06', '#f7d03c', '#fcffa4'],
    colorBlindSafe: true,
    description: 'Inferno連続カラー（知覚的均一、色覚障害対応）',
    maxClasses: 10
  },
  Magma: {
    name: 'Magma',
    type: 'sequential',
    colors: ['#000004', '#180f3d', '#440f76', '#721f81', '#9e2f7f', '#cd4071', '#f1605d', '#fd9668', '#feca8d', '#fcfdbf'],
    colorBlindSafe: true,
    description: 'Magma連続カラー（知覚的均一、色覚障害対応）',
    maxClasses: 10
  }
};

/**
 * CARTO パレット
 * カルトグラフィーに特化したパレット
 */
export const CARTOPalettes: Record<string, ColorPalette> = {
  Prism: {
    name: 'Prism',
    type: 'categorical',
    colors: ['#5F4690', '#1D6996', '#38A6A5', '#0F8554', '#73AF48', '#EDAD08', '#E17C05', '#CC503E', '#94346E', '#6F4070', '#994E95'],
    colorBlindSafe: true,
    description: 'CARTO Prism カテゴリカルカラー（色覚障害対応）',
    maxClasses: 11
  },
  Safe: {
    name: 'Safe',
    type: 'categorical',
    colors: ['#88CCEE', '#CC6677', '#DDCC77', '#117733', '#332288', '#AA4499', '#44AA99', '#999933', '#882255', '#661100', '#6699CC', '#888888'],
    colorBlindSafe: true,
    description: 'CARTO Safe カテゴリカルカラー（色覚障害完全対応）',
    maxClasses: 12
  },
  Vivid: {
    name: 'Vivid',
    type: 'categorical',
    colors: ['#E58606', '#5D69B1', '#52BCA3', '#99C945', '#CC61B0', '#24796C', '#DAA51B', '#2F8AC4', '#764E9F', '#ED645A', '#CC3A8E', '#A5AA99'],
    colorBlindSafe: false,
    description: 'CARTO Vivid カテゴリカルカラー（鮮やか）',
    maxClasses: 12
  }
};

/**
 * 全パレットを統合
 */
export const AllPalettes: Record<string, ColorPalette> = {
  ...ColorBrewerPalettes,
  ...ViridissPalettes,
  ...CARTOPalettes
};

/**
 * 色覚シミュレーション用変換マトリックス
 */
const colorBlindnessMatrices = {
  protanopia: [
    [0.567, 0.433, 0.000],
    [0.558, 0.442, 0.000],
    [0.000, 0.242, 0.758]
  ],
  deuteranopia: [
    [0.625, 0.375, 0.000],
    [0.700, 0.300, 0.000],
    [0.000, 0.300, 0.700]
  ],
  tritanopia: [
    [0.950, 0.050, 0.000],
    [0.000, 0.433, 0.567],
    [0.000, 0.475, 0.525]
  ]
};

/**
 * 色覚障害シミュレーション
 */
export function simulateColorBlindness(color: string, type: ColorBlindnessType): string {
  const rgb = hexToRgb(color);
  if (!rgb) return color;

  const matrix = colorBlindnessMatrices[type];
  const r = Math.round(matrix[0][0] * rgb.r + matrix[0][1] * rgb.g + matrix[0][2] * rgb.b);
  const g = Math.round(matrix[1][0] * rgb.r + matrix[1][1] * rgb.g + matrix[1][2] * rgb.b);
  const b = Math.round(matrix[2][0] * rgb.r + matrix[2][1] * rgb.g + matrix[2][2] * rgb.b);

  return rgbToHex(Math.min(255, Math.max(0, r)), Math.min(255, Math.max(0, g)), Math.min(255, Math.max(0, b)));
}

/**
 * アクセシビリティチェック
 */
export function checkColorBlindnessSafety(palette: string[]): boolean {
  const types: ColorBlindnessType[] = ['protanopia', 'deuteranopia', 'tritanopia'];
  
  for (const type of types) {
    const simulatedColors = palette.map(color => simulateColorBlindness(color, type));
    
    // 色の区別可能性をチェック（簡易版）
    for (let i = 0; i < simulatedColors.length; i++) {
      for (let j = i + 1; j < simulatedColors.length; j++) {
        const distance = calculateColorDistance(simulatedColors[i], simulatedColors[j]);
        if (distance < 50) { // 閾値は調整可能
          return false;
        }
      }
    }
  }
  
  return true;
}

/**
 * パレット推奨システム
 */
export function recommendPalette(
  type: PaletteType,
  numClasses: number,
  requireColorBlindSafe: boolean = true
): PaletteRecommendation[] {
  const candidates = Object.values(AllPalettes).filter(palette => {
    if (palette.type !== type) return false;
    if (palette.maxClasses && numClasses > palette.maxClasses) return false;
    if (requireColorBlindSafe && !palette.colorBlindSafe) return false;
    return true;
  });

  return candidates.map(palette => {
    let score = 100;
    let reason = `${palette.name} - ${palette.description}`;

    // クラス数の適合度
    if (palette.maxClasses) {
      const classFit = 1 - Math.abs(numClasses - palette.maxClasses) / palette.maxClasses;
      score *= classFit;
    }

    // 色覚障害対応ボーナス
    if (palette.colorBlindSafe) {
      score *= 1.2;
      reason += ' (色覚障害対応)';
    }

    return { palette, score, reason };
  }).sort((a, b) => b.score - a.score);
}

/**
 * 指定した数のクラスに最適化されたパレットを生成
 */
export function generateOptimizedPalette(
  basePalette: ColorPalette,
  numClasses: number
): string[] {
  if (numClasses <= basePalette.colors.length) {
    // パレットをサブセット
    if (basePalette.type === 'categorical') {
      return basePalette.colors.slice(0, numClasses);
    } else {
      // 連続・発散パレットは等間隔でサンプリング
      const indices = Array.from({length: numClasses}, (_, i) => 
        Math.floor(i * (basePalette.colors.length - 1) / (numClasses - 1))
      );
      return indices.map(i => basePalette.colors[i]);
    }
  } else {
    // 補間が必要な場合（実装簡略化）
    return basePalette.colors;
  }
}

/**
 * ユーティリティ関数
 */
function hexToRgb(hex: string): {r: number, g: number, b: number} | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function calculateColorDistance(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) return 0;
  
  // ユークリッド距離（簡易版）
  return Math.sqrt(
    Math.pow(rgb1.r - rgb2.r, 2) +
    Math.pow(rgb1.g - rgb2.g, 2) +
    Math.pow(rgb1.b - rgb2.b, 2)
  );
}