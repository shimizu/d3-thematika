import type { Meta, StoryObj } from '@storybook/html';
import { Map } from '../../thematika';
import { OutlineLayer } from '../../layers/outline-layer';
import { PointCircleLayer } from '../../layers/point-circle-layer';
import { GraticuleLayer } from '../../layers/graticule-layer';
import { createMapContainer, generateSamplePoints } from '../utils/story-helpers';
import * as d3 from 'd3-geo';

interface OutlineLayerArgs {
  projection: 'naturalEarth1' | 'mercator' | 'equirectangular' | 'orthographic' | 'azimuthalEqualArea';
  fill: string;
  stroke: string;
  strokeWidth: number;
  strokeDasharray: string;
  opacity: number;
  createClipPath: boolean;
  showGraticule: boolean;
  showSampleData: boolean;
  rotation: [number, number, number];
  scale: number;
}

const meta: Meta<OutlineLayerArgs> = {
  title: 'Layers/OutlineLayer',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: '地球の輪郭（アウトライン）を描画するレイヤー。各種投影法の境界を表示し、クリップパス作成も可能です。'
      }
    }
  },
  argTypes: {
    projection: {
      control: { type: 'select' },
      options: ['naturalEarth1', 'mercator', 'equirectangular', 'orthographic', 'azimuthalEqualArea'],
      description: '投影法',
      defaultValue: 'naturalEarth1'
    },
    fill: {
      control: { type: 'color' },
      description: '塗りつぶし色',
      defaultValue: '#add8e6'
    },
    stroke: {
      control: { type: 'color' },
      description: '境界線の色',
      defaultValue: '#4682b4'
    },
    strokeWidth: {
      control: { type: 'range', min: 0, max: 10, step: 0.5 },
      description: '境界線の幅',
      defaultValue: 2
    },
    strokeDasharray: {
      control: { type: 'text' },
      description: '破線パターン（例: "5,5"）',
      defaultValue: 'none'
    },
    opacity: {
      control: { type: 'range', min: 0, max: 1, step: 0.1 },
      description: '透明度',
      defaultValue: 0.3
    },
    createClipPath: {
      control: { type: 'boolean' },
      description: 'クリップパスを作成',
      defaultValue: false
    },
    showGraticule: {
      control: { type: 'boolean' },
      description: '経緯線を表示',
      defaultValue: true
    },
    showSampleData: {
      control: { type: 'boolean' },
      description: 'サンプルデータを表示',
      defaultValue: true
    },
    rotation: {
      control: { type: 'object' },
      description: '投影法の回転 [λ, φ, γ]',
      defaultValue: [0, 0, 0]
    },
    scale: {
      control: { type: 'range', min: 50, max: 300, step: 10 },
      description: '投影法のスケール',
      defaultValue: 120
    }
  }
};

export default meta;
type Story = StoryObj<OutlineLayerArgs>;

// プロジェクション作成関数
function createProjection(projectionType: string, width: number, height: number, rotation: [number, number, number], scale: number) {
  let projection: d3.GeoProjection;
  
  switch (projectionType) {
    case 'mercator':
      projection = d3.geoMercator();
      break;
    case 'equirectangular':
      projection = d3.geoEquirectangular();
      break;
    case 'orthographic':
      projection = d3.geoOrthographic();
      break;
    case 'azimuthalEqualArea':
      projection = d3.geoAzimuthalEqualArea();
      break;
    case 'naturalEarth1':
    default:
      projection = d3.geoNaturalEarth1();
      break;
  }
  
  return projection
    .scale(scale)
    .translate([width / 2, height / 2])
    .rotate(rotation);
}

// サンプルデータ生成
function createSampleData(): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: [139.6917, 35.6895] },
        properties: { name: "東京", country: "Japan" }
      },
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: [-74.0060, 40.7128] },
        properties: { name: "New York", country: "USA" }
      },
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: [-0.1276, 51.5074] },
        properties: { name: "London", country: "UK" }
      },
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: [2.3522, 48.8566] },
        properties: { name: "Paris", country: "France" }
      },
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: [116.4074, 39.9042] },
        properties: { name: "Beijing", country: "China" }
      },
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: [-46.6333, -23.5505] },
        properties: { name: "São Paulo", country: "Brazil" }
      },
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: [151.2093, -33.8688] },
        properties: { name: "Sydney", country: "Australia" }
      },
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: [28.0473, -26.2041] },
        properties: { name: "Johannesburg", country: "South Africa" }
      }
    ]
  };
}

// ストーリー作成関数
function createOutlineStory(args: OutlineLayerArgs) {
  const container = createMapContainer();
  
  const width = 800;
  const height = 500;
  
  // 投影法を作成
  const projection = createProjection(args.projection, width, height, args.rotation, args.scale);
  
  // 地図インスタンスを作成
  const map = new Map({
    container: '#map',
    width: width,
    height: height,
    projection: projection,
    backgroundColor: '#f0f8ff'
  });
  
  // 経緯線レイヤー（オプション）
  if (args.showGraticule) {
    const graticuleLayer = new GraticuleLayer({
      step: [30, 30],
      attr: {
        fill: 'none',
        stroke: '#ddd',
        strokeWidth: 0.5,
        strokeDasharray: '2,2',
        opacity: 0.7
      }
    });
    map.addLayer('graticule', graticuleLayer);
  }
  
  // OutlineLayer
  const outlineLayer = new OutlineLayer({
    createClipPath: args.createClipPath,
    attr: {
      fill: args.fill,
      stroke: args.stroke,
      strokeWidth: args.strokeWidth,
      strokeDasharray: args.strokeDasharray === 'none' ? undefined : args.strokeDasharray,
      opacity: args.opacity
    }
  });
  
  // レイヤーを地図に追加
  map.addLayer('outline', outlineLayer);
  
  // サンプルデータレイヤー（オプション）
  if (args.showSampleData) {
    const sampleData = createSampleData();
    const dataLayer = new PointCircleLayer({
      data: sampleData,
      r: 4,
      attr: {
        fill: '#e74c3c',
        stroke: '#c0392b',
        strokeWidth: 1,
        opacity: 0.8
      }
    });
    map.addLayer('data', dataLayer);
  }
  
  // 情報表示
  const infoDiv = document.createElement('div');
  infoDiv.innerHTML = `
    <p><strong>OutlineLayerデモ</strong></p>
    <p>投影法: ${args.projection}</p>
    <p>回転: [${args.rotation.join(', ')}]</p>
    <p>スケール: ${args.scale}</p>
    ${args.createClipPath ? '<p style="color: blue;">✓ クリップパス作成中</p>' : ''}
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

export const NaturalEarth: Story = {
  args: {
    projection: 'naturalEarth1',
    fill: '#add8e6',
    stroke: '#4682b4',
    strokeWidth: 2,
    strokeDasharray: 'none',
    opacity: 0.3,
    createClipPath: false,
    showGraticule: true,
    showSampleData: true,
    rotation: [0, 0, 0],
    scale: 120
  },
  render: createOutlineStory,
};

export const Orthographic: Story = {
  args: {
    projection: 'orthographic',
    fill: '#87ceeb',
    stroke: '#4169e1',
    strokeWidth: 3,
    strokeDasharray: 'none',
    opacity: 0.4,
    createClipPath: true,
    showGraticule: true,
    showSampleData: true,
    rotation: [-10, -20, 0],
    scale: 200
  },
  render: createOutlineStory,
};

export const OrthographicRotated: Story = {
  args: {
    projection: 'orthographic',
    fill: '#98fb98',
    stroke: '#228b22',
    strokeWidth: 2,
    strokeDasharray: '5,5',
    opacity: 0.5,
    createClipPath: false,
    showGraticule: false,
    showSampleData: true,
    rotation: [100, -30, 15],
    scale: 180
  },
  render: createOutlineStory,
};

export const AzimuthalEqualArea: Story = {
  args: {
    projection: 'azimuthalEqualArea',
    fill: '#ffd700',
    stroke: '#ff8c00',
    strokeWidth: 2.5,
    strokeDasharray: 'none',
    opacity: 0.6,
    createClipPath: true,
    showGraticule: true,
    showSampleData: false,
    rotation: [0, -90, 0],
    scale: 150
  },
  render: createOutlineStory,
};

export const Mercator: Story = {
  args: {
    projection: 'mercator',
    fill: '#f0e68c',
    stroke: '#daa520',
    strokeWidth: 1,
    strokeDasharray: '10,5',
    opacity: 0.2,
    createClipPath: false,
    showGraticule: true,
    showSampleData: true,
    rotation: [0, 0, 0],
    scale: 100
  },
  render: createOutlineStory,
};

export const EquirectangularClipped: Story = {
  args: {
    projection: 'equirectangular',
    fill: '#dda0dd',
    stroke: '#9370db',
    strokeWidth: 3,
    strokeDasharray: 'none',
    opacity: 0.8,
    createClipPath: true,
    showGraticule: false,
    showSampleData: false,
    rotation: [0, 0, 0],
    scale: 120
  },
  render: createOutlineStory,
};