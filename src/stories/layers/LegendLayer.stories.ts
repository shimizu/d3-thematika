import type { Meta, StoryObj } from '@storybook/html';
import { Map } from '../../thematika';
import { LegendLayer } from '../../layers/legend-layer';
import { PointCircleLayer } from '../../layers/point-circle-layer';
import { GraticuleLayer } from '../../layers/graticule-layer';
import { createMapContainer, generateSamplePoints } from '../utils/story-helpers';
import * as d3 from 'd3-geo';
import { scaleOrdinal, scaleSequential, scaleLinear, scaleThreshold } from 'd3-scale';
import { schemeCategory10, schemeBlues } from 'd3-scale-chromatic';

interface LegendLayerArgs {
  scaleType: 'ordinal' | 'sequential' | 'threshold' | 'size';
  symbolType: 'cell' | 'circle' | 'line' | 'gradient';
  orientation: 'vertical' | 'horizontal';
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  showBackground: boolean;
  enableDrag: boolean;
  title: string;
  fontSize: number;
  itemSpacing: number;
  showMap: boolean;
  overlapping: boolean;
}

const meta: Meta<LegendLayerArgs> = {
  title: 'Layers/LegendLayer',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'D3スケールから凡例を自動生成して表示するレイヤー。カテゴリ、連続値、閾値、サイズスケールに対応し、ドラッグ機能も提供します。'
      }
    }
  },
  argTypes: {
    scaleType: {
      control: { type: 'select' },
      options: ['ordinal', 'sequential', 'threshold', 'size'],
      description: 'スケールの種類',
      defaultValue: 'ordinal'
    },
    symbolType: {
      control: { type: 'select' },
      options: ['cell', 'circle', 'line', 'gradient'],
      description: 'シンボルの表現タイプ',
      defaultValue: 'cell'
    },
    orientation: {
      control: { type: 'radio' },
      options: ['vertical', 'horizontal'],
      description: '配置の向き',
      defaultValue: 'vertical'
    },
    position: {
      control: { type: 'select' },
      options: ['top-left', 'top-right', 'bottom-left', 'bottom-right'],
      description: '凡例の位置',
      defaultValue: 'top-right'
    },
    showBackground: {
      control: { type: 'boolean' },
      description: '背景ボックスを表示',
      defaultValue: true
    },
    enableDrag: {
      control: { type: 'boolean' },
      description: 'ドラッグ機能を有効',
      defaultValue: true
    },
    title: {
      control: { type: 'text' },
      description: '凡例のタイトル',
      defaultValue: '凡例'
    },
    fontSize: {
      control: { type: 'range', min: 8, max: 20, step: 2 },
      description: 'フォントサイズ',
      defaultValue: 12
    },
    itemSpacing: {
      control: { type: 'range', min: 10, max: 40, step: 5 },
      description: 'アイテム間のスペース',
      defaultValue: 20
    },
    showMap: {
      control: { type: 'boolean' },
      description: '地図データも表示',
      defaultValue: true
    },
    overlapping: {
      control: { type: 'boolean' },
      description: '重ね表示モード（サイズスケール用）',
      defaultValue: false
    }
  }
};

export default meta;
type Story = StoryObj<LegendLayerArgs>;

// 位置からピクセル座標を計算
function getPositionCoordinates(position: string, width: number, height: number) {
  switch (position) {
    case 'top-left':
      return { top: 20, left: 20 };
    case 'top-right':
      return { top: 20, left: width - 200 };
    case 'bottom-left':
      return { top: height - 200, left: 20 };
    case 'bottom-right':
      return { top: height - 200, left: width - 200 };
    default:
      return { top: 20, left: width - 200 };
  }
}

// サンプルデータ生成
function createSampleData() {
  return {
    type: "FeatureCollection" as const,
    features: [
      {
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [139.6917, 35.6895] },
        properties: { name: "東京", category: "首都", population: 13960000, size: 10 }
      },
      {
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [135.5023, 34.6937] },
        properties: { name: "大阪", category: "大都市", population: 2691000, size: 8 }
      },
      {
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [-74.0060, 40.7128] },
        properties: { name: "NYC", category: "大都市", population: 8336000, size: 9 }
      },
      {
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [-0.1276, 51.5074] },
        properties: { name: "ロンドン", category: "首都", population: 8982000, size: 9 }
      },
      {
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [2.3522, 48.8566] },
        properties: { name: "パリ", category: "首都", population: 2161000, size: 7 }
      },
      {
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [116.4074, 39.9042] },
        properties: { name: "北京", category: "首都", population: 21540000, size: 12 }
      }
    ]
  };
}

// ストーリー作成関数
function createLegendStory(args: LegendLayerArgs) {
  const container = createMapContainer();
  
  const width = 800;
  const height = 500;
  
  // 投影法を作成
  const projection = d3.geoNaturalEarth1()
    .scale(120)
    .translate([width / 2, height / 2]);
  
  // 地図インスタンスを作成
  const map = new Map({
    container: '#map',
    width: width,
    height: height,
    projection: projection,
    backgroundColor: '#f0f8ff'
  });
  
  // 経緯線レイヤー
  const graticuleLayer = new GraticuleLayer({
    step: [30, 30],
    attr: {
      fill: 'none',
      stroke: '#eee',
      strokeWidth: 0.5,
      strokeDasharray: '2,2',
      opacity: 0.7
    }
  });
  map.addLayer('graticule', graticuleLayer);
  
  // サンプルデータ
  const sampleData = createSampleData();
  
  // スケールとレイヤーを作成
  let scale: any;
  let geojsonLayer: PointCircleLayer | null = null;
  
  switch (args.scaleType) {
    case 'ordinal':
      // カテゴリカルスケール
      scale = scaleOrdinal()
        .domain(['首都', '大都市'])
        .range(['#ff6b6b', '#4ecdc4']);
      
      if (args.showMap) {
        geojsonLayer = new PointCircleLayer({
          data: sampleData,
          r: 8,
          attr: {
            fill: (d: any) => scale(d.properties.category),
            stroke: '#333',
            strokeWidth: 1
          }
        });
      }
      break;
      
    case 'sequential':
      // 連続スケール
      scale = scaleSequential(schemeBlues[9])
        .domain([0, 25000000]);
      
      if (args.showMap) {
        geojsonLayer = new PointCircleLayer({
          data: sampleData,
          r: 8,
          attr: {
            fill: (d: any) => scale(d.properties.population),
            stroke: '#333',
            strokeWidth: 1
          }
        });
      }
      break;
      
    case 'threshold':
      // 閾値スケール
      scale = scaleThreshold<number, string>()
        .domain([5000000, 10000000, 20000000])
        .range(['#fee5d9', '#fcae91', '#fb6a4a', '#cb181d']);
      
      if (args.showMap) {
        geojsonLayer = new PointCircleLayer({
          data: sampleData,
          r: 8,
          attr: {
            fill: (d: any) => scale(d.properties.population),
            stroke: '#333',
            strokeWidth: 1
          }
        });
      }
      break;
      
    case 'size':
      // サイズスケール
      scale = scaleLinear()
        .domain([5, 15])
        .range([0, 1]); // ダミー範囲
      
      const sizeScale = scaleLinear()
        .domain([5, 15])
        .range([4, 16]);
      
      if (args.showMap) {
        geojsonLayer = new PointCircleLayer({
          data: sampleData,
          r: (d: any) => sizeScale(d.properties.size),
          attr: {
            fill: '#3498db',
            stroke: '#2980b9',
            strokeWidth: 1
          }
        });
      }
      
      // サイズスケール用の設定を追加
      (scale as any).sizeScale = sizeScale;
      break;
  }
  
  // 地図レイヤーを追加
  if (geojsonLayer) {
    map.addLayer('data', geojsonLayer);
  }
  
  // 凡例レイヤーを作成
  const position = getPositionCoordinates(args.position, width, height);
  
  const legendOptions: any = {
    scale: scale,
    position: position,
    title: args.title,
    orientation: args.orientation,
    symbolType: args.symbolType,
    fontSize: args.fontSize,
    itemSpacing: args.itemSpacing,
    showBackground: args.showBackground,
    enableDrag: args.enableDrag,
    overlapping: args.overlapping
  };
  
  // サイズスケールの場合の特別設定
  if (args.scaleType === 'size' && (scale as any).sizeScale) {
    legendOptions.sizeScale = (scale as any).sizeScale;
    legendOptions.symbolType = 'circle';
  }
  
  const legendLayer = new LegendLayer(legendOptions);
  
  // 凡例レイヤーを追加
  map.addLayer('legend', legendLayer);
  
  // インタラクション情報を表示
  const infoDiv = document.createElement('div');
  infoDiv.innerHTML = `
    <p><strong>凡例レイヤーデモ</strong></p>
    <p>スケール: ${args.scaleType}</p>
    <p>シンボル: ${args.symbolType}</p>
    <p>向き: ${args.orientation}</p>
    ${args.enableDrag ? '<p style="color: blue;">💡 凡例はドラッグで移動できます</p>' : ''}
  `;
  infoDiv.style.position = 'absolute';
  infoDiv.style.top = '10px';
  infoDiv.style.left = '10px';
  infoDiv.style.background = 'rgba(255,255,255,0.9)';
  infoDiv.style.padding = '10px';
  infoDiv.style.borderRadius = '4px';
  infoDiv.style.fontSize = '12px';
  infoDiv.style.pointerEvents = 'none';
  container.appendChild(infoDiv);
  
  return container;
}

export const OrdinalScale: Story = {
  args: {
    scaleType: 'ordinal',
    symbolType: 'cell',
    orientation: 'vertical',
    position: 'top-right',
    showBackground: true,
    enableDrag: true,
    title: 'カテゴリ',
    fontSize: 12,
    itemSpacing: 20,
    showMap: true,
    overlapping: false
  },
  render: createLegendStory,
};

export const SequentialScale: Story = {
  args: {
    scaleType: 'sequential',
    symbolType: 'gradient',
    orientation: 'vertical',
    position: 'top-right',
    showBackground: true,
    enableDrag: true,
    title: '人口（百万人）',
    fontSize: 12,
    itemSpacing: 20,
    showMap: true,
    overlapping: false
  },
  render: createLegendStory,
};

export const ThresholdScale: Story = {
  args: {
    scaleType: 'threshold',
    symbolType: 'cell',
    orientation: 'horizontal',
    position: 'bottom-left',
    showBackground: true,
    enableDrag: true,
    title: '人口規模',
    fontSize: 10,
    itemSpacing: 15,
    showMap: true,
    overlapping: false
  },
  render: createLegendStory,
};

export const SizeScale: Story = {
  args: {
    scaleType: 'size',
    symbolType: 'circle',
    orientation: 'vertical',
    position: 'top-left',
    showBackground: true,
    enableDrag: true,
    title: 'サイズ',
    fontSize: 12,
    itemSpacing: 25,
    showMap: true,
    overlapping: false
  },
  render: createLegendStory,
};

export const SizeScaleOverlapping: Story = {
  args: {
    scaleType: 'size',
    symbolType: 'circle',
    orientation: 'vertical',
    position: 'bottom-right',
    showBackground: false,
    enableDrag: false,
    title: 'サイズ（重ね表示）',
    fontSize: 11,
    itemSpacing: 30,
    showMap: false,
    overlapping: true
  },
  render: createLegendStory,
};