import type { Meta, StoryObj } from '@storybook/html';
import { Map } from '../../thematika';
import { GraticuleLayer } from '../../layers/graticule-layer';
import { createMapContainer } from '../utils/story-helpers';
import * as d3 from 'd3-geo';

interface GraticuleLayerArgs {
  step: [number, number];
  stroke: string;
  strokeWidth: number;
  opacity: number;
  projection: string;
}

const meta: Meta<GraticuleLayerArgs> = {
  title: 'Layers/GraticuleLayer',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: '経緯線（グリッド）を描画するレイヤー。地図の座標系を視覚化します。'
      }
    }
  },
  argTypes: {
    step: {
      control: { type: 'object' },
      description: '経緯線の間隔 [経度, 緯度]',
      defaultValue: [10, 10]
    },
    stroke: {
      control: { type: 'color' },
      description: '線の色',
      defaultValue: '#333333'
    },
    strokeWidth: {
      control: { type: 'range', min: 0.5, max: 5, step: 0.5 },
      description: '線の太さ',
      defaultValue: 1.5
    },
    opacity: {
      control: { type: 'range', min: 0, max: 1, step: 0.1 },
      description: '透明度',
      defaultValue: 1
    },
    projection: {
      control: { type: 'select' },
      options: ['naturalEarth1', 'mercator', 'equirectangular', 'orthographic'],
      description: '投影法',
      defaultValue: 'naturalEarth1'
    }
  }
};

export default meta;
type Story = StoryObj<GraticuleLayerArgs>;

const render = (args: GraticuleLayerArgs) => {
  const container = createMapContainer();
  
  // 非同期で地図を作成
  setTimeout(() => {
    const mapElement = container.querySelector('#map') as HTMLDivElement;
    const width = mapElement.clientWidth;
    const height = mapElement.clientHeight;
    
    // 投影法を選択
    let projection;
    switch (args.projection) {
      case 'mercator':
        projection = d3.geoMercator();
        break;
      case 'equirectangular':
        projection = d3.geoEquirectangular();
        break;
      case 'orthographic':
        projection = d3.geoOrthographic();
        break;
      default:
        projection = d3.geoNaturalEarth1();
    }
    
    projection.fitSize([width, height], { type: 'Sphere' });
    
    // 地図を作成
    const map = new Map({
      container: '#map',
      width: width,
      height: height,
      projection: projection
    });
    
    // GraticuleLayerを作成
    const graticuleLayer = new GraticuleLayer({
      step: args.step,
      attr: {
        fill: 'none',
        stroke: args.stroke,
        strokeWidth: args.strokeWidth,
        opacity: args.opacity
      }
    });
    
    map.addLayer('graticule', graticuleLayer);
  }, 0);
  
  return container;
};

export const Default: Story = {
  args: {
    step: [20, 20],
    stroke: '#333333',
    strokeWidth: 1.5,
    opacity: 1,
    projection: 'naturalEarth1'
  },
  render
};

export const DenseGrid: Story = {
  args: {
    step: [10, 10],
    stroke: '#4444ff',
    strokeWidth: 1,
    opacity: 1,
    projection: 'naturalEarth1'
  },
  render
};

export const SparseGrid: Story = {
  args: {
    step: [30, 30],
    stroke: '#ff4444',
    strokeWidth: 2,
    opacity: 1,
    projection: 'naturalEarth1'
  },
  render
};

export const OrthographicProjection: Story = {
  args: {
    step: [20, 20],
    stroke: '#228822',
    strokeWidth: 1.5,
    opacity: 1,
    projection: 'orthographic'
  },
  render
};