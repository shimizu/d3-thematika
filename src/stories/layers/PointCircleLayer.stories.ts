import type { Meta, StoryObj } from '@storybook/html';
import { Map } from '../../thematika';
import { PointCircleLayer } from '../../layers/point-circle-layer';
import { GraticuleLayer } from '../../layers/graticule-layer';
import { createMapContainer, generateSamplePoints, loadWorldData } from '../utils/story-helpers';
import * as d3 from 'd3-geo';

interface PointCircleLayerArgs {
  radiusType: 'fixed' | 'variable' | 'data-driven';
  baseRadius: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  dataSource: 'points' | 'polygons';
}

const meta: Meta<PointCircleLayerArgs> = {
  title: 'Layers/PointCircleLayer',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'GeoJSONデータをサークル要素として描画するレイヤー。ポイントはそのまま、ポリゴンやラインは中心点にサークルを配置します。'
      }
    }
  },
  argTypes: {
    radiusType: {
      control: { type: 'select' },
      options: ['fixed', 'variable', 'data-driven'],
      description: '半径の計算方法',
      defaultValue: 'fixed'
    },
    baseRadius: {
      control: { type: 'range', min: 1, max: 30, step: 1 },
      description: '基本半径',
      defaultValue: 5
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
type Story = StoryObj<PointCircleLayerArgs>;

const render = (args: PointCircleLayerArgs) => {
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
    
    // 半径関数を設定
    let radiusFunction: number | ((feature: GeoJSON.Feature, index: number) => number);
    switch (args.radiusType) {
      case 'variable':
        radiusFunction = (feature, index) => (index % 5) + args.baseRadius;
        break;
      case 'data-driven':
        radiusFunction = (feature) => {
          const value = feature.properties?.value || feature.properties?.POP_EST || 0;
          return Math.min(Math.sqrt(value / 1000000) * args.baseRadius + 2, 30);
        };
        break;
      default:
        radiusFunction = args.baseRadius;
    }
    
    // PointCircleLayerを作成
    const circleLayer = new PointCircleLayer({
      data: data,
      r: radiusFunction,
      attr: {
        fill: args.fill,
        stroke: args.stroke,
        strokeWidth: args.strokeWidth,
        opacity: args.opacity
      }
    });
    
    // レイヤーを追加
    map.addLayer('graticule', graticuleLayer);
    map.addLayer('circles', circleLayer);
  }, 0);
  
  return container;
};

export const Default: Story = {
  args: {
    radiusType: 'fixed',
    baseRadius: 5,
    fill: '#ff6b6b',
    stroke: '#d63031',
    strokeWidth: 1,
    opacity: 0.8,
    dataSource: 'points'
  },
  render
};

export const VariableRadius: Story = {
  args: {
    radiusType: 'variable',
    baseRadius: 3,
    fill: '#74b9ff',
    stroke: '#0984e3',
    strokeWidth: 0.5,
    opacity: 0.7,
    dataSource: 'points'
  },
  render
};

export const DataDrivenRadius: Story = {
  args: {
    radiusType: 'data-driven',
    baseRadius: 2,
    fill: '#fd79a8',
    stroke: '#e84393',
    strokeWidth: 0.5,
    opacity: 0.6,
    dataSource: 'polygons'
  },
  render
};

export const MinimalStyle: Story = {
  args: {
    radiusType: 'fixed',
    baseRadius: 3,
    fill: 'none',
    stroke: '#2d3436',
    strokeWidth: 1.5,
    opacity: 1,
    dataSource: 'points'
  },
  render
};