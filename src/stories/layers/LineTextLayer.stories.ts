import type { Meta, StoryObj } from '@storybook/html';
import { Map } from '../../thematika';
import { LineTextLayer } from '../../layers/line-text-layer';
import { GeojsonLayer } from '../../layers/geojson-layer';
import { GraticuleLayer } from '../../layers/graticule-layer';
import { createMapContainer } from '../utils/story-helpers';
import * as d3 from 'd3-geo';

interface LineTextLayerArgs {
  textProperty: string;
  position: 'start' | 'middle' | 'end' | number;
  placement: 'along' | 'horizontal' | 'perpendicular';
  usePercentage: boolean;
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
  dataType: 'rivers' | 'roads' | 'borders' | 'railways';
  showLines: boolean;
}

const meta: Meta<LineTextLayerArgs> = {
  title: 'Layers/LineTextLayer',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'LineString/MultiLineStringジオメトリに沿ってテキストラベルを配置するレイヤー。ライン沿い、水平、垂直配置をサポートします。'
      }
    }
  },
  argTypes: {
    textProperty: {
      control: { type: 'text' },
      description: 'テキスト取得元プロパティ名',
      defaultValue: 'text'
    },
    position: {
      control: { type: 'select' },
      options: ['start', 'middle', 'end', 0.25, 0.75],
      description: 'テキストの配置位置',
      defaultValue: 'middle'
    },
    placement: {
      control: { type: 'radio' },
      options: ['along', 'horizontal', 'perpendicular'],
      description: 'テキストの配置方向',
      defaultValue: 'along'
    },
    usePercentage: {
      control: { type: 'boolean' },
      description: 'パーセンテージベースの位置指定',
      defaultValue: true
    },
    dx: {
      control: { type: 'range', min: -30, max: 30, step: 2 },
      description: 'X方向オフセット',
      defaultValue: 0
    },
    dy: {
      control: { type: 'range', min: -30, max: 30, step: 2 },
      description: 'Y方向オフセット',
      defaultValue: 0
    },
    rotate: {
      control: { type: 'range', min: 0, max: 360, step: 15 },
      description: '追加の回転角度',
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
      defaultValue: 'middle'
    },
    fontFamily: {
      control: { type: 'text' },
      description: 'フォントファミリー',
      defaultValue: 'Arial, sans-serif'
    },
    fontSize: {
      control: { type: 'range', min: 8, max: 24, step: 2 },
      description: 'フォントサイズ',
      defaultValue: 12
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
      defaultValue: '#2c3e50'
    },
    stroke: {
      control: { type: 'color' },
      description: 'アウトライン色',
      defaultValue: '#ffffff'
    },
    strokeWidth: {
      control: { type: 'range', min: 0, max: 4, step: 0.5 },
      description: 'アウトライン幅',
      defaultValue: 1
    },
    projection: {
      control: { type: 'select' },
      options: ['naturalEarth1', 'mercator', 'equirectangular', 'orthographic'],
      description: '投影法',
      defaultValue: 'naturalEarth1'
    },
    dataType: {
      control: { type: 'radio' },
      options: ['rivers', 'roads', 'borders', 'railways'],
      description: 'データタイプ',
      defaultValue: 'rivers'
    },
    showLines: {
      control: { type: 'boolean' },
      description: 'ライン自体も表示',
      defaultValue: true
    }
  }
};

export default meta;
type Story = StoryObj<LineTextLayerArgs>;

// サンプルデータ生成関数
function createSampleData(dataType: string): GeoJSON.FeatureCollection {
  switch (dataType) {
    case 'rivers':
      return {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: [
                [130, 33], [132, 34], [135, 35], [138, 36], [140, 36.5]
              ]
            },
            properties: { text: "信濃川", name: "Shinano River", type: "river" }
          },
          {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: [
                [136, 35], [137, 34.5], [138, 34], [139, 34.2], [140, 35]
              ]
            },
            properties: { text: "富士川", name: "Fuji River", type: "river" }
          },
          {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: [
                [-5, 51], [-3, 51.5], [-1, 52], [1, 52.2], [2, 51.8]
              ]
            },
            properties: { text: "Thames", name: "River Thames", type: "river" }
          },
          {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: [
                [2, 49], [3, 48.5], [4, 48.8], [5, 49.2], [6, 49]
              ]
            },
            properties: { text: "Seine", name: "River Seine", type: "river" }
          }
        ]
      };

    case 'roads':
      return {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: [
                [139.7, 35.7], [139.8, 35.6], [140, 35.5], [140.3, 35.4]
              ]
            },
            properties: { text: "国道1号", name: "Route 1", type: "highway" }
          },
          {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: [
                [139.5, 35.8], [139.7, 35.7], [139.9, 35.6], [140.1, 35.5]
              ]
            },
            properties: { text: "中央道", name: "Chuo Expressway", type: "expressway" }
          },
          {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: [
                [-2, 51], [0, 51.5], [2, 52], [4, 51.8]
              ]
            },
            properties: { text: "A1", name: "A1 Motorway", type: "motorway" }
          }
        ]
      };

    case 'borders':
      return {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: [
                [130, 38], [132, 38.5], [134, 39], [136, 39.2], [138, 39]
              ]
            },
            properties: { text: "日本海", name: "Sea of Japan", type: "border" }
          },
          {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: [
                [-1, 50], [0, 50.8], [1, 51.5], [2, 51]
              ]
            },
            properties: { text: "English Channel", name: "English Channel", type: "border" }
          },
          {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: [
                [5, 49], [6, 48.5], [7, 48], [8, 47.5], [9, 47]
              ]
            },
            properties: { text: "Rhine", name: "Rhine River", type: "border" }
          }
        ]
      };

    case 'railways':
      return {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: [
                [139.7, 35.7], [137, 35], [135.5, 34.7], [133, 34.4]
              ]
            },
            properties: { text: "東海道新幹線", name: "Tokaido Shinkansen", type: "railway" }
          },
          {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: [
                [139.7, 35.7], [140.5, 37], [141, 38.5], [141.3, 40.8]
              ]
            },
            properties: { text: "東北新幹線", name: "Tohoku Shinkansen", type: "railway" }
          },
          {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: [
                [-1, 51.5], [0, 51], [1, 50.8], [3, 50.8], [4, 50.5]
              ]
            },
            properties: { text: "Eurostar", name: "Eurostar", type: "railway" }
          }
        ]
      };

    default:
      return createSampleData('rivers');
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
function createLineTextStory(args: LineTextLayerArgs) {
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
  map.addLayer('graticule', graticuleLayer);
  
  // サンプルデータを作成
  const lineData = createSampleData(args.dataType);
  
  // ライン自体を表示（オプション）
  if (args.showLines) {
    const lineLayer = new GeojsonLayer({
      data: lineData,
      attr: {
        fill: 'none',
        stroke: (d: any) => {
          switch (d.properties.type) {
            case 'river': return '#3498db';
            case 'highway': case 'expressway': case 'motorway': return '#e74c3c';
            case 'border': return '#9b59b6';
            case 'railway': return '#2ecc71';
            default: return '#34495e';
          }
        },
        strokeWidth: (d: any) => {
          switch (d.properties.type) {
            case 'river': return 2;
            case 'highway': case 'expressway': case 'motorway': return 3;
            case 'border': return 2;
            case 'railway': return 2;
            default: return 1;
          }
        },
        strokeDasharray: (d: any) => {
          switch (d.properties.type) {
            case 'border': return '5,5';
            case 'railway': return '10,5';
            default: return 'none';
          }
        },
        opacity: 0.7
      }
    });
    map.addLayer('lines', lineLayer);
  }
  
  // LineTextLayer
  const textLayer = new LineTextLayer({
    data: lineData,
    textProperty: args.textProperty,
    position: args.position,
    placement: args.placement,
    usePercentage: args.usePercentage,
    dx: args.dx,
    dy: args.dy,
    rotate: args.rotate,
    lengthAdjust: args.lengthAdjust,
    alignmentBaseline: args.alignmentBaseline as any,
    textAnchor: args.textAnchor,
    fontFamily: args.fontFamily,
    fontSize: args.fontSize,
    fontWeight: args.fontWeight as any,
    attr: {
      fill: args.fill,
      stroke: args.stroke,
      strokeWidth: args.strokeWidth
    }
  });
  
  // レイヤーを地図に追加
  map.addLayer('text', textLayer);
  
  // インタラクション追加
  textLayer.on('click', (event, feature) => {
    console.log('Text clicked:', feature);
    alert(`Clicked: ${feature.properties?.text || feature.properties?.name || 'Unknown'}`);
  });
  
  textLayer.on('mouseover', (event, feature) => {
    console.log('Text hover:', feature);
  });
  
  // 情報表示
  const infoDiv = document.createElement('div');
  infoDiv.innerHTML = `
    <p><strong>LineTextLayerデモ</strong></p>
    <p>データ: ${args.dataType}</p>
    <p>配置: ${args.placement} / ${args.position}</p>
    <p>アンカー: ${args.textAnchor}</p>
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

export const Rivers: Story = {
  args: {
    textProperty: 'text',
    position: 'middle',
    placement: 'along',
    usePercentage: true,
    dx: 0,
    dy: 0,
    rotate: 0,
    lengthAdjust: 'spacing',
    alignmentBaseline: 'middle',
    textAnchor: 'middle',
    fontFamily: 'Arial, sans-serif',
    fontSize: 12,
    fontWeight: 'normal',
    fill: '#2c3e50',
    stroke: '#ffffff',
    strokeWidth: 1,
    projection: 'naturalEarth1',
    dataType: 'rivers',
    showLines: true
  },
  render: createLineTextStory,
};

export const Railways: Story = {
  args: {
    textProperty: 'text',
    position: 'middle',
    placement: 'along',
    usePercentage: true,
    dx: 0,
    dy: -8,
    rotate: 0,
    lengthAdjust: 'spacing',
    alignmentBaseline: 'middle',
    textAnchor: 'middle',
    fontFamily: 'Gothic, sans-serif',
    fontSize: 11,
    fontWeight: 'bold',
    fill: '#27ae60',
    stroke: '#ffffff',
    strokeWidth: 2,
    projection: 'naturalEarth1',
    dataType: 'railways',
    showLines: true
  },
  render: createLineTextStory,
};

export const RoadsHorizontal: Story = {
  args: {
    textProperty: 'text',
    position: 0.25,
    placement: 'horizontal',
    usePercentage: true,
    dx: 5,
    dy: -5,
    rotate: 0,
    lengthAdjust: 'spacingAndGlyphs',
    alignmentBaseline: 'baseline',
    textAnchor: 'start',
    fontFamily: 'Arial, sans-serif',
    fontSize: 10,
    fontWeight: '600',
    fill: '#e74c3c',
    stroke: '#ffffff',
    strokeWidth: 1.5,
    projection: 'mercator',
    dataType: 'roads',
    showLines: true
  },
  render: createLineTextStory,
};

export const BordersPerpendicular: Story = {
  args: {
    textProperty: 'text',
    position: 'end',
    placement: 'perpendicular',
    usePercentage: true,
    dx: 0,
    dy: 0,
    rotate: 45,
    lengthAdjust: 'spacing',
    alignmentBaseline: 'middle',
    textAnchor: 'middle',
    fontFamily: 'Times, serif',
    fontSize: 14,
    fontWeight: 'bold',
    fill: '#8e44ad',
    stroke: '#f8f9fa',
    strokeWidth: 2,
    projection: 'orthographic',
    dataType: 'borders',
    showLines: false
  },
  render: createLineTextStory,
};