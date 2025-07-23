import type { Meta, StoryObj } from '@storybook/html';
import { Map } from '../../thematika';
import { LineConnectionLayer } from '../../layers/line-connection-layer';
import { GeojsonLayer } from '../../layers/geojson-layer';
import { GraticuleLayer } from '../../layers/graticule-layer';
import { createMapContainer, loadWorldData } from '../utils/story-helpers';
import * as d3 from 'd3-geo';
import * as GeoJSON from 'geojson';

interface LineConnectionLayerArgs {
  lineType: 'straight' | 'arc';
  arcHeight: number;
  arcControlPoint: 'center' | 'weighted';
  arcOffset: 'perpendicular' | 'north' | 'south' | 'east' | 'west';
  startArrow: boolean;
  endArrow: boolean;
  arrowSize: number;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  projection: string;
  dataType: 'simple' | 'complex' | 'multiline';
}

const meta: Meta<LineConnectionLayerArgs> = {
  title: 'Layers/LineConnectionLayer',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'GeoJSON LineString/MultiLineString形式のデータで複数点間を結ぶラインを描画するレイヤー。直線またはアークで描画でき、矢印も表示可能です。'
      }
    }
  },
  argTypes: {
    lineType: {
      control: { type: 'radio' },
      options: ['straight', 'arc'],
      description: 'ライン描画タイプ',
      defaultValue: 'arc'
    },
    arcHeight: {
      control: { type: 'range', min: 0, max: 1, step: 0.1 },
      description: 'アークの高さ（アークモード時）',
      defaultValue: 0.3
    },
    arcControlPoint: {
      control: { type: 'radio' },
      options: ['center', 'weighted'],
      description: 'アーク制御点の位置',
      defaultValue: 'center'
    },
    arcOffset: {
      control: { type: 'radio' },
      options: ['perpendicular', 'north', 'south', 'east', 'west'],
      description: 'アークオフセットの方向',
      defaultValue: 'perpendicular'
    },
    startArrow: {
      control: { type: 'boolean' },
      description: '開始点に矢印を表示',
      defaultValue: false
    },
    endArrow: {
      control: { type: 'boolean' },
      description: '終了点に矢印を表示',
      defaultValue: true
    },
    arrowSize: {
      control: { type: 'range', min: 5, max: 20, step: 1 },
      description: '矢印のサイズ',
      defaultValue: 10
    },
    stroke: {
      control: { type: 'color' },
      description: 'ライン色',
      defaultValue: '#e74c3c'
    },
    strokeWidth: {
      control: { type: 'range', min: 1, max: 5, step: 0.5 },
      description: 'ライン幅',
      defaultValue: 2
    },
    opacity: {
      control: { type: 'range', min: 0, max: 1, step: 0.1 },
      description: '透明度',
      defaultValue: 0.8
    },
    projection: {
      control: { type: 'select' },
      options: ['naturalEarth1', 'mercator', 'equirectangular', 'orthographic'],
      description: '投影法',
      defaultValue: 'naturalEarth1'
    },
    dataType: {
      control: { type: 'radio' },
      options: ['simple', 'complex', 'multiline'],
      description: 'データタイプ',
      defaultValue: 'simple'
    }
  }
};

export default meta;
type Story = StoryObj<LineConnectionLayerArgs>;

// サンプルデータ生成関数
function createSampleData(dataType: string): GeoJSON.Feature | GeoJSON.FeatureCollection {
  const cities = [
    { name: "東京", coords: [139.7, 35.6] },
    { name: "ロンドン", coords: [-0.1, 51.5] },
    { name: "ニューヨーク", coords: [-74.0, 40.7] },
    { name: "パリ", coords: [2.3, 48.8] },
    { name: "シドニー", coords: [151.2, -33.8] },
    { name: "リオデジャネイロ", coords: [-43.2, -22.9] },
    { name: "カイロ", coords: [31.2, 30.0] },
    { name: "モスクワ", coords: [37.6, 55.7] },
    { name: "北京", coords: [116.4, 39.9] },
    { name: "ムンバイ", coords: [72.8, 19.0] }
  ];

  switch (dataType) {
    case 'simple':
      // 2点間の単純な接続
      return {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            cities[0].coords, // 東京
            cities[1].coords  // ロンドン
          ]
        },
        properties: { 
          name: "東京-ロンドン直行便",
          type: "flight"
        }
      };

    case 'complex':
      // 複数点を経由するルート
      return {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            cities[0].coords, // 東京
            cities[8].coords, // 北京
            cities[7].coords, // モスクワ
            cities[3].coords, // パリ
            cities[1].coords, // ロンドン
            cities[2].coords, // ニューヨーク
            cities[5].coords  // リオデジャネイロ
          ]
        },
        properties: { 
          name: "世界一周ルート",
          type: "world-tour"
        }
      };

    case 'multiline':
      // 複数の独立したライン
      return {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: [cities[0].coords, cities[4].coords, cities[9].coords]
            },
            properties: { 
              name: "アジア太平洋ルート",
              type: "regional"
            }
          },
          {
            type: "Feature",
            geometry: {
              type: "LineString",
              coordinates: [cities[1].coords, cities[3].coords, cities[6].coords, cities[9].coords]
            },
            properties: { 
              name: "ヨーロッパ・アジアルート",
              type: "regional"
            }
          },
          {
            type: "Feature",
            geometry: {
              type: "MultiLineString",
              coordinates: [
                [cities[2].coords, cities[5].coords],
                [cities[5].coords, cities[4].coords]
              ]
            },
            properties: { 
              name: "南半球ルート",
              type: "multi"
            }
          }
        ]
      };

    default:
      return createSampleData('simple');
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
        .rotate([-50, -20]);
      break;
    case 'naturalEarth1':
    default:
      projection = d3.geoNaturalEarth1();
      break;
  }
  
  return projection
    .scale(150)
    .translate([width / 2, height / 2]);
}

// ストーリー作成関数
function createLineConnectionStory(args: LineConnectionLayerArgs) {
  const container = createMapContainer();
  
  Promise.all([
    loadWorldData()
  ]).then(([worldData]) => {
    const width = 800;
    const height = 500;
    
    // 投影法を作成
    const projection = createProjection(args.projection, width, height);
    projection.fitExtent([[20, 20], [width - 20, height - 20]], worldData);
    
    // 地図インスタンスを作成
    const map = new Map({
      container: '#map',
      width: width,
      height: height,
      projection: projection,
      backgroundColor: '#f0f8ff'
    });
    
    // 背景の世界地図
    const worldLayer = new GeojsonLayer({
      data: worldData,
      attr: {
        fill: '#f5f5f5',
        stroke: '#ddd',
        strokeWidth: 0.5,
        opacity: 0.8
      }
    });
    
    // 経緯線
    const graticuleLayer = new GraticuleLayer({
      step: [30, 30],
      attr: {
        fill: 'none',
        stroke: '#eee',
        strokeWidth: 0.5,
        strokeDasharray: '2,2',
        opacity: 0.5
      }
    });
    
    // サンプルデータを作成
    const connectionData = createSampleData(args.dataType);
    
    // LineConnectionLayer
    const connectionLayer = new LineConnectionLayer({
      data: connectionData,
      lineType: args.lineType,
      arcHeight: args.arcHeight,
      arcControlPoint: args.arcControlPoint,
      arcOffset: args.arcOffset,
      startArrow: args.startArrow,
      endArrow: args.endArrow,
      arrowSize: args.arrowSize,
      attr: {
        stroke: args.stroke,
        strokeWidth: args.strokeWidth,
        opacity: args.opacity
      }
    });
    
    // レイヤーを地図に追加
    map.addLayer('graticule', graticuleLayer);
    map.addLayer('world', worldLayer);
    map.addLayer('connections', connectionLayer);
    
  }).catch(error => {
    container.innerHTML = `<div style="color: red; padding: 20px;">エラー: ${error.message}</div>`;
  });
  
  return container;
}

export const Default: Story = {
  args: {
    lineType: 'arc',
    arcHeight: 0.3,
    arcControlPoint: 'center',
    arcOffset: 'perpendicular',
    startArrow: false,
    endArrow: true,
    arrowSize: 10,
    stroke: '#e74c3c',
    strokeWidth: 2,
    opacity: 0.8,
    projection: 'naturalEarth1',
    dataType: 'simple'
  },
  render: createLineConnectionStory,
};

export const WorldTour: Story = {
  args: {
    lineType: 'arc',
    arcHeight: 0.4,
    arcControlPoint: 'center',
    arcOffset: 'perpendicular',
    startArrow: true,
    endArrow: true,
    arrowSize: 12,
    stroke: '#9b59b6',
    strokeWidth: 3,
    opacity: 0.9,
    projection: 'naturalEarth1',
    dataType: 'complex'
  },
  render: createLineConnectionStory,
};

export const MultipleRoutes: Story = {
  args: {
    lineType: 'arc',
    arcHeight: 0.25,
    arcControlPoint: 'center',
    arcOffset: 'perpendicular',
    startArrow: false,
    endArrow: true,
    arrowSize: 8,
    stroke: '#27ae60',
    strokeWidth: 2,
    opacity: 0.7,
    projection: 'naturalEarth1',
    dataType: 'multiline'
  },
  render: createLineConnectionStory,
};

export const StraightLines: Story = {
  args: {
    lineType: 'straight',
    arcHeight: 0.3,
    arcControlPoint: 'center',
    arcOffset: 'perpendicular',
    startArrow: false,
    endArrow: true,
    arrowSize: 10,
    stroke: '#f39c12',
    strokeWidth: 2.5,
    opacity: 0.8,
    projection: 'mercator',
    dataType: 'simple'
  },
  render: createLineConnectionStory,
};

export const OrthographicProjection: Story = {
  args: {
    lineType: 'arc',
    arcHeight: 0.5,
    arcControlPoint: 'center',
    arcOffset: 'perpendicular',
    startArrow: true,
    endArrow: true,
    arrowSize: 15,
    stroke: '#e67e22',
    strokeWidth: 3,
    opacity: 1.0,
    projection: 'orthographic',
    dataType: 'complex'
  },
  render: createLineConnectionStory,
};