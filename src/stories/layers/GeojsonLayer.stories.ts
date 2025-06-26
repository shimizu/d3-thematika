import type { Meta, StoryObj } from '@storybook/html';
import { Map } from '../../thematika';
import { GeojsonLayer } from '../../layers/geojson-layer';
import { GraticuleLayer } from '../../layers/graticule-layer';
import { createMapContainer, loadWorldData, generateSamplePolygons } from '../utils/story-helpers';
import * as d3 from 'd3-geo';
import * as d3Scale from 'd3-scale';
import * as d3ScaleChromatic from 'd3-scale-chromatic';

interface GeojsonLayerArgs {
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  projection: string;
  dataType: 'world' | 'sample';
  colorScheme: 'single' | 'categorical' | 'sequential';
}

const meta: Meta<GeojsonLayerArgs> = {
  title: 'Layers/GeojsonLayer',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'GeoJSONデータを描画する基本レイヤー。ポリゴン、ライン、ポイントなど様々な地理データを表示できます。'
      }
    }
  },
  argTypes: {
    fill: {
      control: { type: 'color' },
      description: '塗りつぶし色',
      defaultValue: '#3498db'
    },
    stroke: {
      control: { type: 'color' },
      description: '境界線の色',
      defaultValue: '#2c3e50'
    },
    strokeWidth: {
      control: { type: 'range', min: 0.5, max: 5, step: 0.5 },
      description: '境界線の太さ',
      defaultValue: 1
    },
    opacity: {
      control: { type: 'range', min: 0, max: 1, step: 0.1 },
      description: '透明度',
      defaultValue: 0.8
    },
    projection: {
      control: { type: 'select' },
      options: ['naturalEarth1', 'mercator', 'equirectangular', 'orthographic', 'albers'],
      description: '投影法',
      defaultValue: 'naturalEarth1'
    },
    dataType: {
      control: { type: 'select' },
      options: ['world', 'sample'],
      description: 'データソース',
      defaultValue: 'world'
    },
    colorScheme: {
      control: { type: 'select' },
      options: ['single', 'categorical', 'sequential'],
      description: 'カラースキーム',
      defaultValue: 'single'
    }
  }
};

export default meta;
type Story = StoryObj<GeojsonLayerArgs>;

const render = (args: GeojsonLayerArgs) => {
  const container = createMapContainer();
  
  // 非同期で地図を作成
  setTimeout(async () => {
    const mapElement = container.querySelector('#map') as HTMLDivElement;
    const width = mapElement.clientWidth;
    const height = mapElement.clientHeight;
    
    // データを読み込み
    let data: GeoJSON.FeatureCollection;
    if (args.dataType === 'world') {
      data = await loadWorldData();
    } else {
      data = generateSamplePolygons();
    }
    
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
      case 'albers':
        projection = d3.geoAlbers();
        break;
      default:
        projection = d3.geoNaturalEarth1();
    }
    
    projection.fitExtent([[10, 10], [width-10, height-10]], data);
    
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
        stroke: '#cccccc',
        strokeWidth: 0.5,
        opacity: 0.5
      }
    });
    
    // 色設定を準備
    let fillFunction: string | ((feature: GeoJSON.Feature, index?: number) => string);
    
    switch (args.colorScheme) {
      case 'categorical':
        const categoricalScale = d3Scale.scaleOrdinal(d3ScaleChromatic.schemeCategory10);
        fillFunction = (feature, index) => categoricalScale(String(index! % 10));
        break;
      case 'sequential':
        const sequentialScale = d3Scale.scaleSequential(d3ScaleChromatic.interpolateBlues)
          .domain([0, data.features.length]);
        fillFunction = (feature, index) => sequentialScale(index!);
        break;
      default:
        fillFunction = args.fill;
    }
    
    // GeojsonLayerを作成
    const geojsonLayer = new GeojsonLayer({
      data: data,
      attr: {
        fill: fillFunction,
        stroke: args.stroke,
        strokeWidth: args.strokeWidth,
        opacity: args.opacity
      }
    });
    
    // レイヤーを追加
    map.addLayer('graticule', graticuleLayer);
    map.addLayer('geojson', geojsonLayer);
    
    // インタラクション例：ホバー効果
    geojsonLayer.on('mouseenter', (event, d) => {
      const target = event.target as SVGElement;
      target.style.opacity = '1';
      target.style.strokeWidth = String(args.strokeWidth * 2);
    });
    
    geojsonLayer.on('mouseleave', (event, d) => {
      const target = event.target as SVGElement;
      target.style.opacity = String(args.opacity);
      target.style.strokeWidth = String(args.strokeWidth);
    });
  }, 0);
  
  return container;
};

export const Default: Story = {
  args: {
    fill: '#3498db',
    stroke: '#2c3e50',
    strokeWidth: 1,
    opacity: 0.8,
    projection: 'naturalEarth1',
    dataType: 'world',
    colorScheme: 'single'
  },
  render
};

export const CategoricalColors: Story = {
  args: {
    fill: '#3498db',
    stroke: '#2c3e50',
    strokeWidth: 0.5,
    opacity: 0.7,
    projection: 'naturalEarth1',
    dataType: 'world',
    colorScheme: 'categorical'
  },
  render
};

export const SequentialColors: Story = {
  args: {
    fill: '#3498db',
    stroke: '#ffffff',
    strokeWidth: 0.5,
    opacity: 0.9,
    projection: 'naturalEarth1',
    dataType: 'world',
    colorScheme: 'sequential'
  },
  render
};

export const OrthographicView: Story = {
  args: {
    fill: '#e74c3c',
    stroke: '#c0392b',
    strokeWidth: 1,
    opacity: 0.8,
    projection: 'orthographic',
    dataType: 'world',
    colorScheme: 'single'
  },
  render
};

export const SampleData: Story = {
  args: {
    fill: '#27ae60',
    stroke: '#229954',
    strokeWidth: 2,
    opacity: 0.6,
    projection: 'albers',
    dataType: 'sample',
    colorScheme: 'single'
  },
  render
};