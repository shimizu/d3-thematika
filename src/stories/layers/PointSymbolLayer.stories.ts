import type { Meta, StoryObj } from '@storybook/html-vite';
import { Map } from '../../thematika';
import { PointSymbolLayer } from '../../layers/point-symbol-layer';
import { GraticuleLayer } from '../../layers/graticule-layer';
import { createMapContainer, generateSamplePoints, loadWorldData } from '../utils/story-helpers';
import * as d3 from 'd3-geo';
import { symbolCircle, symbolCross, symbolDiamond, symbolSquare, symbolStar, symbolTriangle, symbolWye } from 'd3-shape';

interface PointSymbolLayerArgs {
  symbolType: 'circle' | 'cross' | 'diamond' | 'square' | 'star' | 'triangle' | 'wye' | 'data-driven';
  sizeMode: 'fixed' | 'variable' | 'data-driven';
  baseSize: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  dataSource: 'points' | 'polygons';
}

const symbolTypes = {
  circle: symbolCircle,
  cross: symbolCross,
  diamond: symbolDiamond,
  square: symbolSquare,
  star: symbolStar,
  triangle: symbolTriangle,
  wye: symbolWye
};

const meta: Meta<PointSymbolLayerArgs> = {
  title: 'Layers/PointSymbolLayer',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'D3のシンボル形状を使用してポイントを描画するレイヤー。様々な形状のシンボルを選択でき、サイズやタイプをデータドリブンに設定可能。'
      }
    }
  },
  argTypes: {
    symbolType: {
      control: { type: 'select' },
      options: ['circle', 'cross', 'diamond', 'square', 'star', 'triangle', 'wye', 'data-driven'],
      description: 'シンボルタイプ',
      defaultValue: 'circle'
    },
    sizeMode: {
      control: { type: 'select' },
      options: ['fixed', 'variable', 'data-driven'],
      description: 'サイズの計算方法',
      defaultValue: 'fixed'
    },
    baseSize: {
      control: { type: 'range', min: 20, max: 500, step: 10 },
      description: '基本サイズ（面積）',
      defaultValue: 100
    },
    fill: {
      control: { type: 'color' },
      description: '塗りつぶし色',
      defaultValue: '#e74c3c'
    },
    stroke: {
      control: { type: 'color' },
      description: '境界線の色',
      defaultValue: '#c0392b'
    },
    strokeWidth: {
      control: { type: 'range', min: 0, max: 3, step: 0.1 },
      description: '境界線の太さ',
      defaultValue: 1
    },
    opacity: {
      control: { type: 'range', min: 0, max: 1, step: 0.1 },
      description: '透明度',
      defaultValue: 0.8
    },
    dataSource: {
      control: { type: 'select' },
      options: ['points', 'polygons'],
      description: 'データソース',
      defaultValue: 'points'
    }
  }
};

export default meta;
type Story = StoryObj<PointSymbolLayerArgs>;

const render = (args: PointSymbolLayerArgs) => {
  const container = createMapContainer();
  
  setTimeout(async () => {
    const mapElement = container.querySelector('#map') as HTMLDivElement;
    const width = mapElement.clientWidth;
    const height = mapElement.clientHeight;
    
    // データを準備
    let data: GeoJSON.FeatureCollection;
    if (args.dataSource === 'points') {
      data = generateSamplePoints(50);
    } else {
      data = await loadWorldData();
    }
    
    // 投影法を設定
    const projection = d3.geoNaturalEarth1()
      .fitExtent([[10, 10], [width-10, height-10]], data);
    
    // 地図を作成
    const map = new Map({
      container: '#map',
      width: width,
      height: height,
      projection: projection
    });
    
    // 背景に経緯線を追加
    const graticuleLayer = new GraticuleLayer({
      step: [20, 20],
      attr: {
        fill: 'none',
        stroke: '#eee',
        strokeWidth: 0.5,
        opacity: 0.5
      }
    });
    
    // シンボルタイプ関数を設定
    let symbolTypeFunction;
    if (args.symbolType === 'data-driven') {
      // カテゴリに基づいてシンボルを変える
      const types = Object.values(symbolTypes);
      symbolTypeFunction = (feature: GeoJSON.Feature, index: number) => {
        const category = feature.properties?.category || index % types.length;
        const categoryIndex = typeof category === 'string' 
          ? category.charCodeAt(0) % types.length 
          : category % types.length;
        return types[categoryIndex];
      };
    } else {
      symbolTypeFunction = symbolTypes[args.symbolType];
    }
    
    // サイズ関数を設定
    let sizeFunction: number | ((feature: GeoJSON.Feature, index: number) => number);
    switch (args.sizeMode) {
      case 'variable':
        sizeFunction = (feature, index) => {
          const variation = (index % 5) / 5;
          return args.baseSize * (0.5 + variation * 1.5);
        };
        break;
      case 'data-driven':
        sizeFunction = (feature) => {
          const value = feature.properties?.value || feature.properties?.POP_EST || 0;
          const normalizedValue = Math.sqrt(value / 100);
          return Math.min(args.baseSize * normalizedValue + 20, 500);
        };
        break;
      default:
        sizeFunction = args.baseSize;
    }
    
    // PointSymbolLayerを作成
    const symbolLayer = new PointSymbolLayer({
      data: data,
      symbolType: symbolTypeFunction,
      size: sizeFunction,
      attr: {
        fill: args.fill,
        stroke: args.stroke,
        strokeWidth: args.strokeWidth,
        opacity: args.opacity
      }
    });
    
    // レイヤーを追加
    map.addLayer('graticule', graticuleLayer);
    map.addLayer('symbols', symbolLayer);
  }, 0);
  
  return container;
};

export const Default: Story = {
  args: {
    symbolType: 'circle',
    sizeMode: 'fixed',
    baseSize: 100,
    fill: '#e74c3c',
    stroke: '#c0392b',
    strokeWidth: 1,
    opacity: 0.8,
    dataSource: 'points'
  },
  render
};

export const StarSymbols: Story = {
  args: {
    symbolType: 'star',
    sizeMode: 'variable',
    baseSize: 150,
    fill: '#f39c12',
    stroke: '#d68910',
    strokeWidth: 1.5,
    opacity: 0.9,
    dataSource: 'points'
  },
  render
};

export const DataDrivenSymbols: Story = {
  args: {
    symbolType: 'data-driven',
    sizeMode: 'data-driven',
    baseSize: 80,
    fill: '#9b59b6',
    stroke: '#8e44ad',
    strokeWidth: 1,
    opacity: 0.7,
    dataSource: 'polygons'
  },
  render
};

export const CrossMarkers: Story = {
  args: {
    symbolType: 'cross',
    sizeMode: 'fixed',
    baseSize: 200,
    fill: 'none',
    stroke: '#34495e',
    strokeWidth: 2,
    opacity: 1,
    dataSource: 'points'
  },
  render
};

export const DiamondPattern: Story = {
  args: {
    symbolType: 'diamond',
    sizeMode: 'variable',
    baseSize: 120,
    fill: '#1abc9c',
    stroke: '#16a085',
    strokeWidth: 0.5,
    opacity: 0.6,
    dataSource: 'points'
  },
  render
};