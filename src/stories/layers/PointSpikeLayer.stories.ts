import type { Meta, StoryObj } from '@storybook/html-vite';
import { Map } from '../../thematika';
import { PointSpikeLayer } from '../../layers/point-spike-layer';
import { GraticuleLayer } from '../../layers/graticule-layer';
import { createMapContainer, generateSamplePoints, loadWorldData } from '../utils/story-helpers';
import * as d3 from 'd3-geo';

interface PointSpikeLayerArgs {
  lengthType: 'fixed' | 'variable' | 'data-driven';
  baseLength: number;
  direction: 'up' | 'down' | 'left' | 'right';
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  dataSource: 'points' | 'polygons';
}

const meta: Meta<PointSpikeLayerArgs> = {
  title: 'Layers/PointSpikeLayer',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'GeoJSONデータをスパイク要素として描画するレイヤー。ポイントはそのまま、ポリゴンやラインは中心点にスパイクを配置します。'
      }
    }
  },
  argTypes: {
    lengthType: {
      control: { type: 'select' },
      options: ['fixed', 'variable', 'data-driven'],
      description: '長さの計算方法',
      defaultValue: 'fixed'
    },
    baseLength: {
      control: { type: 'range', min: 10, max: 200, step: 5 },
      description: '基本長さ',
      defaultValue: 50
    },
    direction: {
      control: { type: 'select' },
      options: ['up', 'down', 'left', 'right'],
      description: 'スパイクの方向',
      defaultValue: 'up'
    },
    fill: {
      control: { type: 'color' },
      description: '塗りつぶし色',
      defaultValue: '#ff6b6b'
    },
    stroke: {
      control: { type: 'color' },
      description: '境界線の色',
      defaultValue: '#d63031'
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
type Story = StoryObj<PointSpikeLayerArgs>;

const render = (args: PointSpikeLayerArgs) => {
  const container = createMapContainer();
  
  // 非同期で地図を作成
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
    
    // 長さ関数を設定
    let lengthFunction: number | ((feature: GeoJSON.Feature, index: number) => number);
    switch (args.lengthType) {
      case 'variable':
        lengthFunction = (feature, index) => (index % 5) * 10 + args.baseLength;
        break;
      case 'data-driven':
        lengthFunction = (feature) => {
          const value = feature.properties?.value || feature.properties?.POP_EST || 0;
          return Math.min(Math.sqrt(value / 1000000) * args.baseLength + 10, 200);
        };
        break;
      default:
        lengthFunction = args.baseLength;
    }
    
    // PointSpikeLayerを作成
    const spikeLayer = new PointSpikeLayer({
      data: data,
      length: lengthFunction,
      direction: args.direction,
      attr: {
        fill: args.fill,
        stroke: args.stroke,
        strokeWidth: args.strokeWidth,
        opacity: args.opacity
      }
    });
    
    // レイヤーを追加
    map.addLayer('graticule', graticuleLayer);
    map.addLayer('spikes', spikeLayer);
  }, 0);
  
  return container;
};

export const Default: Story = {
  args: {
    lengthType: 'fixed',
    baseLength: 50,
    direction: 'up',
    fill: '#ff6b6b',
    stroke: '#d63031',
    strokeWidth: 1,
    opacity: 0.8,
    dataSource: 'points'
  },
  render
};

export const VariableLength: Story = {
  args: {
    lengthType: 'variable',
    baseLength: 30,
    direction: 'up',
    fill: '#74b9ff',
    stroke: '#0984e3',
    strokeWidth: 0.5,
    opacity: 0.7,
    dataSource: 'points'
  },
  render
};

export const DataDrivenLength: Story = {
  args: {
    lengthType: 'data-driven',
    baseLength: 20,
    direction: 'up',
    fill: '#fd79a8',
    stroke: '#e84393',
    strokeWidth: 0.5,
    opacity: 0.6,
    dataSource: 'polygons'
  },
  render
};

export const DownwardSpikes: Story = {
  args: {
    lengthType: 'fixed',
    baseLength: 40,
    direction: 'down',
    fill: '#00b894',
    stroke: '#00a085',
    strokeWidth: 1,
    opacity: 0.8,
    dataSource: 'points'
  },
  render
};

export const LeftwardSpikes: Story = {
  args: {
    lengthType: 'fixed',
    baseLength: 35,
    direction: 'left',
    fill: '#fdcb6e',
    stroke: '#e17055',
    strokeWidth: 1,
    opacity: 0.8,
    dataSource: 'points'
  },
  render
};

export const RightwardSpikes: Story = {
  args: {
    lengthType: 'fixed',
    baseLength: 35,
    direction: 'right',
    fill: '#a29bfe',
    stroke: '#6c5ce7',
    strokeWidth: 1,
    opacity: 0.8,
    dataSource: 'points'
  },
  render
};

export const MinimalStyle: Story = {
  args: {
    lengthType: 'fixed',
    baseLength: 30,
    direction: 'up',
    fill: 'none',
    stroke: '#2d3436',
    strokeWidth: 1.5,
    opacity: 1,
    dataSource: 'points'
  },
  render
};