import type { Meta, StoryObj } from '@storybook/html';
import { AllPalettes, recommendPalette, generateOptimizedPalette, checkColorBlindnessSafety } from '../../utils/color-palette';
import { ColorPalette, PaletteType } from '../../types';

const meta: Meta = {
  title: 'Utils/ColorPalette',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'カラーパレットユーティリティは科学的に検証されたColorBrewer、Viridis、CARTOパレットを提供し、色覚アクセシビリティ機能を含みます。',
      },
    },
  },
  argTypes: {
    paletteType: {
      control: 'select',
      options: ['categorical', 'sequential', 'diverging'],
      description: 'パレットのタイプ',
    },
    numClasses: {
      control: { type: 'range', min: 3, max: 12, step: 1 },
      description: 'クラス数',
    },
    colorBlindSafe: {
      control: 'boolean',
      description: '色覚障害対応のみ表示',
    },
  },
  args: {
    paletteType: 'categorical',
    numClasses: 8,
    colorBlindSafe: true,
  },
};

export default meta;
type Story = StoryObj;

export const PaletteShowcase: Story = {
  args: {
    paletteType: 'categorical',
    numClasses: 8,
    colorBlindSafe: true,
  },
  render: (args) => {
    const { paletteType, numClasses, colorBlindSafe } = args;

    // パレットをフィルタリング
    const filteredPalettes = Object.values(AllPalettes).filter(palette => {
      if (paletteType !== 'all' && palette.type !== paletteType) return false;
      if (colorBlindSafe && !palette.colorBlindSafe) return false;
      if (palette.colors.length < numClasses) return false;
      return true;
    });

    // 推奨パレットを取得
    const recommendations = recommendPalette(paletteType, numClasses, colorBlindSafe);

    const container = document.createElement('div');
    container.style.cssText = `
      font-family: Inter, system-ui, sans-serif;
      padding: 20px;
      background: #f8fafc;
    `;

    // 推奨パレットセクション
    if (recommendations.length > 0) {
      const recommendationSection = document.createElement('div');
      recommendationSection.innerHTML = `
        <h3 style="margin-bottom: 16px; color: #1e293b;">推奨パレット</h3>
        <div style="margin-bottom: 32px;">
          ${createPaletteCard(recommendations[0].palette, numClasses, true)}
        </div>
      `;
      container.appendChild(recommendationSection);
    }

    // 全パレットセクション
    const allPalettesSection = document.createElement('div');
    allPalettesSection.innerHTML = `
      <h3 style="margin-bottom: 16px; color: #1e293b;">利用可能なパレット (${filteredPalettes.length}個)</h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px;">
        ${filteredPalettes.map(palette => createPaletteCard(palette, numClasses)).join('')}
      </div>
    `;
    container.appendChild(allPalettesSection);

    return container;
  },
};

export const ColorBlindnessSimulation: Story = {
  args: {
    paletteType: 'categorical',
    numClasses: 6,
    colorBlindSafe: false,
  },
  render: (args) => {
    const { paletteType, numClasses } = args;
    
    // テスト用パレットを選択
    const testPalettes = Object.values(AllPalettes)
      .filter(p => p.type === paletteType)
      .slice(0, 3);

    const container = document.createElement('div');
    container.style.cssText = `
      font-family: Inter, system-ui, sans-serif;
      padding: 20px;
      background: #f8fafc;
    `;

    container.innerHTML = `
      <h3 style="margin-bottom: 16px; color: #1e293b;">色覚障害シミュレーション</h3>
      <p style="margin-bottom: 24px; color: #64748b;">
        異なる色覚タイプでのパレットの見え方を比較できます。
      </p>
      ${testPalettes.map(palette => {
        const colors = palette.colors.slice(0, numClasses);
        const isSafe = checkColorBlindnessSafety(colors);
        
        return `
          <div style="margin-bottom: 32px; background: white; border-radius: 8px; padding: 20px; border: 1px solid #e2e8f0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <h4 style="margin: 0; color: #1e293b;">${palette.name}</h4>
              <span style="
                padding: 4px 8px; 
                border-radius: 4px; 
                font-size: 12px; 
                background: ${isSafe ? '#10b981' : '#f59e0b'}; 
                color: white;
              ">
                ${isSafe ? '✓ 色覚障害対応' : '⚠️ 要注意'}
              </span>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">
              ${['normal', 'protanopia', 'deuteranopia', 'tritanopia'].map(type => `
                <div>
                  <div style="font-size: 12px; margin-bottom: 4px; color: #64748b;">
                    ${getVisionTypeLabel(type)}
                  </div>
                  <div style="display: flex; height: 32px; border-radius: 4px; overflow: hidden; border: 1px solid #e2e8f0;">
                    ${colors.map(color => {
                      const simulatedColor = type === 'normal' ? color : simulateColorBlindnessForDemo(color, type);
                      return `<div style="flex: 1; background-color: ${simulatedColor};" title="${simulatedColor}"></div>`;
                    }).join('')}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }).join('')}
    `;

    return container;
  },
};

export const PaletteComparison: Story = {
  render: () => {
    const container = document.createElement('div');
    container.style.cssText = `
      font-family: Inter, system-ui, sans-serif;
      padding: 20px;
      background: #f8fafc;
    `;

    const categoricalPalettes = ['Set2', 'Prism', 'Safe'];
    const sequentialPalettes = ['Blues', 'Viridis', 'YlGnBu'];
    const divergingPalettes = ['RdBu', 'RdYlBu'];

    container.innerHTML = `
      <h3 style="margin-bottom: 24px; color: #1e293b;">パレットタイプ別比較</h3>
      
      ${[
        { title: 'カテゴリカルパレット', palettes: categoricalPalettes, description: '質的データ（カテゴリ）の区別に最適' },
        { title: '連続パレット', palettes: sequentialPalettes, description: '量的データの順序や大小関係を表現' },
        { title: '発散パレット', palettes: divergingPalettes, description: '中央値を基準とした正負や偏差を表現' }
      ].map(section => `
        <div style="margin-bottom: 40px;">
          <h4 style="margin-bottom: 8px; color: #1e293b;">${section.title}</h4>
          <p style="margin-bottom: 16px; color: #64748b; font-size: 14px;">${section.description}</p>
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px;">
            ${section.palettes.map(paletteName => {
              const palette = AllPalettes[paletteName];
              return createPaletteCard(palette, Math.min(8, palette.colors.length));
            }).join('')}
          </div>
        </div>
      `).join('')}
    `;

    return container;
  },
};

// ヘルパー関数
function createPaletteCard(palette: ColorPalette, numClasses: number, isRecommended = false) {
  const colors = palette.colors.slice(0, numClasses);
  const borderStyle = isRecommended ? 'border: 2px solid #3b82f6;' : 'border: 1px solid #e2e8f0;';
  
  return `
    <div style="
      background: white; 
      border-radius: 8px; 
      padding: 16px; 
      ${borderStyle}
      transition: transform 0.2s ease;
    ">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <span style="font-weight: 600; color: #1e293b;">${palette.name}</span>
        <span style="
          font-size: 11px; 
          padding: 2px 6px; 
          border-radius: 3px; 
          background: #f1f5f9; 
          color: #475569;
        ">
          ${getTypeLabel(palette.type)}
        </span>
      </div>
      
      <div style="
        display: flex; 
        height: 32px; 
        border-radius: 6px; 
        overflow: hidden; 
        margin-bottom: 12px;
        border: 1px solid #e2e8f0;
      ">
        ${colors.map(color => 
          `<div style="flex: 1; background-color: ${color};" title="${color}"></div>`
        ).join('')}
      </div>
      
      <div style="font-size: 12px; color: #64748b; margin-bottom: 8px;">
        ${palette.description}
      </div>
      
      <div style="display: flex; align-items: center; gap: 8px;">
        ${palette.colorBlindSafe ? 
          '<span style="font-size: 11px; padding: 2px 6px; border-radius: 3px; background: #10b981; color: white;">♿ 色覚障害対応</span>' : 
          '<span style="font-size: 11px; padding: 2px 6px; border-radius: 3px; background: #f59e0b; color: white;">⚠️ 要注意</span>'
        }
        <span style="font-size: 11px; color: #94a3b8;">${colors.length}色</span>
      </div>
    </div>
  `;
}

function getTypeLabel(type: PaletteType) {
  const labels = {
    'categorical': 'カテゴリカル',
    'sequential': '連続',
    'diverging': '発散'
  };
  return labels[type] || type;
}

function getVisionTypeLabel(type: string) {
  const labels: Record<string, string> = {
    'normal': '正常色覚',
    'protanopia': '1型色覚',
    'deuteranopia': '2型色覚',
    'tritanopia': '3型色覚'
  };
  return labels[type] || type;
}

// 簡易色覚シミュレーション（デモ用）
function simulateColorBlindnessForDemo(color: string, type: string) {
  // 実際の実装ではより正確な変換マトリックスを使用
  const matrices = {
    protanopia: [0.567, 0.433, 0.000, 0.558, 0.442, 0.000, 0.000, 0.242, 0.758],
    deuteranopia: [0.625, 0.375, 0.000, 0.700, 0.300, 0.000, 0.000, 0.300, 0.700],
    tritanopia: [0.950, 0.050, 0.000, 0.000, 0.433, 0.567, 0.000, 0.475, 0.525]
  };
  
  // HEX to RGB
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  const matrix = matrices[type as keyof typeof matrices];
  if (!matrix) return color;
  
  // Matrix transformation
  const newR = Math.round(matrix[0] * r + matrix[1] * g + matrix[2] * b);
  const newG = Math.round(matrix[3] * r + matrix[4] * g + matrix[5] * b);
  const newB = Math.round(matrix[6] * r + matrix[7] * g + matrix[8] * b);
  
  // RGB to HEX
  const toHex = (c: number) => {
    const hex = Math.max(0, Math.min(255, c)).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  
  return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
}