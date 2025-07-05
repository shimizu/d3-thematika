import type { Meta, StoryObj } from '@storybook/html';
import { Map } from '../../thematika';
import { PointTextLayer } from '../../layers/point-text-layer';
import { GeojsonLayer } from '../../layers/geojson-layer';
import { GraticuleLayer } from '../../layers/graticule-layer';
import { createMapContainer, generateSamplePoints } from '../utils/story-helpers';
import * as d3 from 'd3-geo';
import * as GeoJSON from 'geojson';

interface PointTextLayerArgs {
  textProperty: string;
  dx: number;
  dy: number;
  rotate: number;
  lengthAdjust: 'spacing' | 'spacingAndGlyphs';
  alignmentBaseline: string;
  textAnchor: 'start' | 'middle' | 'end';
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  projection: string;
  dataType: 'cities' | 'countries' | 'mixed';
}

const meta: Meta<PointTextLayerArgs> = {
  title: 'Layers/PointTextLayer',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'GeoJSONデータからテキストラベルを表示するレイヤー。ポイントはそのまま、ポリゴンやラインは中心点にテキストを配置します。'
      }
    }
  },
  argTypes: {
    textProperty: {
      control: { type: 'text' },
      description: 'テキスト取得元プロパティ名',
      defaultValue: 'text'
    },
    dx: {
      control: { type: 'range', min: -50, max: 50, step: 5 },
      description: 'X方向オフセット',
      defaultValue: 0
    },
    dy: {
      control: { type: 'range', min: -50, max: 50, step: 5 },
      description: 'Y方向オフセット',
      defaultValue: 0
    },
    rotate: {
      control: { type: 'range', min: 0, max: 360, step: 15 },
      description: '回転角度',
      defaultValue: 0
    },
    lengthAdjust: {
      control: { type: 'radio' },
      options: ['spacing', 'spacingAndGlyphs'],
      description: 'テキスト長さ調整',
      defaultValue: 'spacing'
    },
    alignmentBaseline: {
      control: { type: 'select' },
      options: ['auto', 'baseline', 'middle', 'central', 'hanging', 'alphabetic'],
      description: 'ベースライン位置',
      defaultValue: 'middle'
    },
    textAnchor: {
      control: { type: 'radio' },
      options: ['start', 'middle', 'end'],
      description: 'テキストアンカー',
      defaultValue: 'start'
    },
    fontFamily: {
      control: { type: 'text' },
      description: 'フォントファミリー',
      defaultValue: 'メイリオ, Meiryo, sans-serif'
    },
    fontSize: {
      control: { type: 'range', min: 8, max: 32, step: 2 },
      description: 'フォントサイズ',
      defaultValue: 14
    },
    fontWeight: {
      control: { type: 'select' },
      options: ['normal', 'bold', 'lighter', '300', '400', '600', '700'],
      description: 'フォントウェイト',
      defaultValue: 'normal'
    },
    fill: {
      control: { type: 'color' },
      description: 'テキスト色',
      defaultValue: '#333333'
    },
    stroke: {
      control: { type: 'color' },
      description: 'アウトライン色',
      defaultValue: '#ffffff'
    },
    strokeWidth: {
      control: { type: 'range', min: 0, max: 5, step: 0.5 },
      description: 'アウトライン幅',
      defaultValue: 2
    },
    projection: {
      control: { type: 'select' },
      options: ['naturalEarth1', 'mercator', 'equirectangular', 'orthographic'],
      description: '投影法',
      defaultValue: 'naturalEarth1'
    },
    dataType: {
      control: { type: 'radio' },
      options: ['cities', 'countries', 'mixed'],
      description: 'データタイプ',
      defaultValue: 'cities'
    }
  }
};

export default meta;
type Story = StoryObj<PointTextLayerArgs>;

// サンプルデータ生成関数
function createSampleData(dataType: string): GeoJSON.FeatureCollection {
  switch (dataType) {
    case 'cities':
      // 都市データ
      return {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: { type: "Point", coordinates: [139.6917, 35.6895] },
            properties: { text: "東京", name: "Tokyo", population: 13960000, type: "capital" }
          },
          {
            type: "Feature",
            geometry: { type: "Point", coordinates: [135.5023, 34.6937] },
            properties: { text: "大阪", name: "Osaka", population: 2691000, type: "major" }
          },
          {
            type: "Feature",
            geometry: { type: "Point", coordinates: [-74.0060, 40.7128] },
            properties: { text: "NYC", name: "New York", population: 8336000, type: "major" }
          },
          {
            type: "Feature",
            geometry: { type: "Point", coordinates: [-0.1276, 51.5074] },
            properties: { text: "London", name: "London", population: 8982000, type: "capital" }
          },
          {
            type: "Feature",
            geometry: { type: "Point", coordinates: [2.3522, 48.8566] },
            properties: { text: "Paris", name: "Paris", population: 2161000, type: "capital" }
          },
          {
            type: "Feature",
            geometry: { type: "Point", coordinates: [116.4074, 39.9042] },
            properties: { text: "北京", name: "Beijing", population: 21540000, type: "capital" }
          }
        ]
      };

    case 'countries':
      // 国データ（簡易ポリゴン）
      return {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: {
              type: "Polygon",
              coordinates: [[
                [135, 30], [145, 30], [145, 45], [135, 45], [135, 30]
              ]]
            },
            properties: { text: "Japan", name: "Japan", area: 377975 }
          },
          {
            type: "Feature",
            geometry: {
              type: "Polygon",
              coordinates: [[
                [-10, 50], [2, 50], [2, 60], [-10, 60], [-10, 50]
              ]]
            },
            properties: { text: "UK", name: "United Kingdom", area: 242495 }
          },
          {
            type: "Feature",
            geometry: {
              type: "Polygon",
              coordinates: [[
                [-5, 42], [8, 42], [8, 52], [-5, 52], [-5, 42]
              ]]
            },
            properties: { text: "France", name: "France", area: 643801 }
          }
        ]
      };

    case 'mixed':
      // 混合データ（ポイント、ライン、ポリゴン）
      return {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: { type: "Point", coordinates: [139.7, 35.7] },
            properties: { text: "東京駅", name: "Tokyo Station", type: "station" }
          },
          {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: [[139.7, 35.7], [135.5, 34.7]]
            },
            properties: { text: "東海道新幹線", name: "Tokaido Shinkansen", type: "railway" }
          },
          {
            type: "Feature",
            geometry: {
              type: "Polygon",
              coordinates: [[
                [139, 35], [140, 35], [140, 36], [139, 36], [139, 35]
              ]]
            },
            properties: { text: "東京都", name: "Tokyo Prefecture", type: "prefecture" }
          }
        ]
      };

    default:
      return createSampleData('cities');
  }
}

// プロジェクション作成関数
function createProjection(projectionType: string, width: number, height: number) {
  let projection: d3.GeoProjection;
  
  switch (projectionType) {
    case 'mercator':
      projection = d3.geoMercator();
      break;
    case 'equirectangular':
      projection = d3.geoEquirectangular();
      break;
    case 'orthographic':
      projection = d3.geoOrthographic()
        .rotate([-20, -10]);
      break;
    case 'naturalEarth1':
    default:
      projection = d3.geoNaturalEarth1();
      break;
  }
  
  return projection
    .scale(120)
    .translate([width / 2, height / 2]);
}

// ストーリー作成関数
function createPointTextStory(args: PointTextLayerArgs) {
  const container = createMapContainer();
  
  const width = 800;
  const height = 500;
  
  // 投影法を作成
  const projection = createProjection(args.projection, width, height);
  
  // 地図インスタンスを作成
  const map = new Map({
    container: '#map',
    width: width,
    height: height,
    projection: projection,
    backgroundColor: '#f0f8ff'
  });
  
  // 背景の経緯線
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
  
  // サンプルデータを作成
  const textData = createSampleData(args.dataType);
  
  // PointTextLayer
  const textLayer = new PointTextLayer({
    data: textData,
    textProperty: args.textProperty,
    dx: args.dx,
    dy: args.dy,
    rotate: args.rotate,
    lengthAdjust: args.lengthAdjust,
    alignmentBaseline: args.alignmentBaseline as "auto" | "baseline" | "before-edge" | "text-before-edge" | "middle" | "central" | "after-edge" | "text-after-edge" | "ideographic" | "alphabetic" | "hanging" | "mathematical" | "inherit",
    textAnchor: args.textAnchor,
    fontFamily: args.fontFamily,
    fontSize: args.fontSize,
    fontWeight: args.fontWeight as "normal" | "bold" | "bolder" | "lighter" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | "inherit",
    attr: {
      fill: args.fill,
      stroke: args.stroke,
      strokeWidth: args.strokeWidth
    }
  });
  
  // レイヤーを地図に追加
  map.addLayer('graticule', graticuleLayer);
  map.addLayer('text', textLayer);
  
  // インタラクション追加
  textLayer.on('click', (event, feature) => {
    console.log('Text clicked:', feature);
    alert(`Clicked: ${feature.properties?.text || feature.properties?.name || 'Unknown'}`);
  });
  
  textLayer.on('mouseover', (event, feature) => {
    console.log('Text hover:', feature);
  });
  
  return container;
}

export const Default: Story = {
  args: {
    textProperty: 'text',
    dx: 0,
    dy: 0,
    rotate: 0,
    lengthAdjust: 'spacing',
    alignmentBaseline: 'middle',
    textAnchor: 'start',
    fontFamily: 'メイリオ, Meiryo, sans-serif',
    fontSize: 14,
    fontWeight: 'normal',
    fill: '#333333',
    stroke: '#ffffff',
    strokeWidth: 2,
    projection: 'naturalEarth1',
    dataType: 'cities'
  },
  render: createPointTextStory,
};

export const WorldCapitals: Story = {
  args: {
    textProperty: 'text',
    dx: 5,
    dy: -5,
    rotate: 0,
    lengthAdjust: 'spacing',
    alignmentBaseline: 'middle',
    textAnchor: 'start',
    fontFamily: 'Arial, sans-serif',
    fontSize: 16,
    fontWeight: 'bold',
    fill: '#2c3e50',
    stroke: '#ecf0f1',
    strokeWidth: 3,
    projection: 'naturalEarth1',
    dataType: 'cities'
  },
  render: createPointTextStory,
};

export const CountryLabels: Story = {
  args: {
    textProperty: 'text',
    dx: 0,
    dy: 0,
    rotate: 0,
    lengthAdjust: 'spacing',
    alignmentBaseline: 'middle',
    textAnchor: 'middle',
    fontFamily: 'Georgia, serif',
    fontSize: 18,
    fontWeight: '600',
    fill: '#34495e',
    stroke: '#bdc3c7',
    strokeWidth: 2,
    projection: 'naturalEarth1',
    dataType: 'countries'
  },
  render: createPointTextStory,
};

export const RotatedLabels: Story = {
  args: {
    textProperty: 'text',
    dx: 0,
    dy: 0,
    rotate: 45,
    lengthAdjust: 'spacing',
    alignmentBaseline: 'middle',
    textAnchor: 'start',
    fontFamily: 'Impact, sans-serif',
    fontSize: 12,
    fontWeight: 'bold',
    fill: '#e74c3c',
    stroke: '#f8f9fa',
    strokeWidth: 2,
    projection: 'orthographic',
    dataType: 'mixed'
  },
  render: createPointTextStory,
};

export const SmallCapsStyle: Story = {
  args: {
    textProperty: 'name',
    dx: 8,
    dy: 8,
    rotate: 0,
    lengthAdjust: 'spacingAndGlyphs',
    alignmentBaseline: 'hanging',
    textAnchor: 'start',
    fontFamily: 'Courier New, monospace',
    fontSize: 10,
    fontWeight: '300',
    fill: '#6c757d',
    stroke: '#ffffff',
    strokeWidth: 1,
    projection: 'mercator',
    dataType: 'cities'
  },
  render: createPointTextStory,
};