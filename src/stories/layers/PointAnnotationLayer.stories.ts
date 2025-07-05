import type { Meta, StoryObj } from '@storybook/html';
import { Map } from '../../thematika';
import { PointAnnotationLayer, AnnotationType } from '../../layers/point-annotation-layer';
import { GraticuleLayer } from '../../layers/graticule-layer';
import { createMapContainer, generateSamplePoints, loadWorldData } from '../utils/story-helpers';
import * as d3 from 'd3-geo';

interface PointAnnotationLayerArgs {
  annotationType: AnnotationType;
  textProperty: string;
  useTitle: boolean;
  offsetX: number;
  offsetY: number;
  subjectRadius: number;
  subjectFill: string;
  connectorStroke: string;
  noteBackgroundColor: string;
  noteFontSize: string;
  noteTextColor: string;
  dataSource: 'cities' | 'polygons';
}

const meta: Meta<PointAnnotationLayerArgs> = {
  title: 'Layers/PointAnnotationLayer',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'GeoJSONポイントデータにアノテーション（注釈）を表示するレイヤー。様々なアノテーションタイプをサポートし、引き出し線やテキストボックスで情報を表示できます。'
      }
    }
  },
  argTypes: {
    annotationType: {
      control: { type: 'select' },
      options: ['callout', 'calloutElbow', 'calloutCurve', 'label', 'badge', 'calloutCircle', 'calloutRect'],
      description: 'アノテーションタイプ',
      defaultValue: 'callout'
    },
    textProperty: {
      control: { type: 'select' },
      options: ['name', 'country', 'custom'],
      description: 'テキストに使用するプロパティ',
      defaultValue: 'name'
    },
    useTitle: {
      control: { type: 'boolean' },
      description: 'タイトル行を表示する',
      defaultValue: false
    },
    offsetX: {
      control: { type: 'range', min: -100, max: 100, step: 5 },
      description: 'X軸オフセット',
      defaultValue: 30
    },
    offsetY: {
      control: { type: 'range', min: -100, max: 100, step: 5 },
      description: 'Y軸オフセット',
      defaultValue: -20
    },
    subjectRadius: {
      control: { type: 'range', min: 1, max: 15, step: 1 },
      description: 'サブジェクト（対象点）の半径',
      defaultValue: 3
    },
    subjectFill: {
      control: { type: 'color' },
      description: 'サブジェクトの塗りつぶし色',
      defaultValue: '#e74c3c'
    },
    connectorStroke: {
      control: { type: 'color' },
      description: 'コネクター（引き出し線）の色',
      defaultValue: '#666666'
    },
    noteBackgroundColor: {
      control: { type: 'color' },
      description: 'ノート背景色',
      defaultValue: '#ffffff'
    },
    noteFontSize: {
      control: { type: 'select' },
      options: ['10px', '12px', '14px', '16px', '18px'],
      description: 'ノートフォントサイズ',
      defaultValue: '12px'
    },
    noteTextColor: {
      control: { type: 'color' },
      description: 'ノートテキスト色',
      defaultValue: '#000000'
    },
    dataSource: {
      control: { type: 'select' },
      options: ['cities', 'polygons'],
      description: 'データソース',
      defaultValue: 'cities'
    }
  }
};

export default meta;
type Story = StoryObj<PointAnnotationLayerArgs>;

const render = (args: PointAnnotationLayerArgs) => {
  const container = createMapContainer();
  
  // 非同期で地図を作成
  setTimeout(async () => {
    const mapElement = container.querySelector('#map') as HTMLDivElement;
    const width = mapElement.clientWidth;
    const height = mapElement.clientHeight;
    
    // データを準備
    let data: GeoJSON.FeatureCollection;
    if (args.dataSource === 'cities') {
      // 主要都市のサンプルデータを生成
      data = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [139.6917, 35.6895] },
            properties: { name: 'Tokyo', country: 'Japan', population: 37833000 }
          },
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [-74.0060, 40.7128] },
            properties: { name: 'New York', country: 'USA', population: 20140470 }
          },
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [2.3522, 48.8566] },
            properties: { name: 'Paris', country: 'France', population: 11174000 }
          },
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [-0.1276, 51.5074] },
            properties: { name: 'London', country: 'UK', population: 9648110 }
          },
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [116.4074, 39.9042] },
            properties: { name: 'Beijing', country: 'China', population: 21893095 }
          },
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [37.6173, 55.7558] },
            properties: { name: 'Moscow', country: 'Russia', population: 12641000 }
          }
        ]
      };
    } else {
      data = await loadWorldData();
      // ポリゴンデータの場合、一部の国のみ表示
      data.features = data.features.slice(0, 10);
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
    
    // テキストアクセサーを設定
    let textAccessor: string | ((feature: GeoJSON.Feature, index: number) => string);
    let titleAccessor: string | ((feature: GeoJSON.Feature, index: number) => string) | undefined;
    
    switch (args.textProperty) {
      case 'name':
        textAccessor = 'name';
        if (args.useTitle && args.dataSource === 'cities') {
          titleAccessor = 'country';
        }
        break;
      case 'country':
        textAccessor = 'country';
        break;
      case 'custom':
        textAccessor = (feature, index) => {
          const name = feature.properties?.name || feature.properties?.NAME || `Point ${index + 1}`;
          const pop = feature.properties?.population || feature.properties?.POP_EST;
          return pop ? `${name} (${Math.round(pop / 1000000)}M)` : name;
        };
        break;
      default:
        textAccessor = 'name';
    }
    
    // PointAnnotationLayerを作成
    const annotationLayer = new PointAnnotationLayer({
      data: data,
      annotationType: args.annotationType,
      textAccessor: textAccessor,
      titleAccessor: titleAccessor,
      offsetAccessor: (feature, index) => [args.offsetX, args.offsetY],
      subjectOptions: {
        radius: args.subjectRadius,
        fill: args.subjectFill,
        stroke: 'white',
        strokeWidth: 1
      },
      connectorOptions: {
        stroke: args.connectorStroke,
        strokeWidth: 1
      },
      noteOptions: {
        backgroundColor: args.noteBackgroundColor,
        fontSize: args.noteFontSize,
        textColor: args.noteTextColor,
        borderColor: '#cccccc',
        borderWidth: 1,
        padding: 4
      }
    });
    
    // レイヤーを追加
    map.addLayer('graticule', graticuleLayer);
    map.addLayer('annotations', annotationLayer);
  }, 0);
  
  return container;
};

export const Default: Story = {
  args: {
    annotationType: 'callout',
    textProperty: 'name',
    useTitle: false,
    offsetX: 30,
    offsetY: -20,
    subjectRadius: 3,
    subjectFill: '#e74c3c',
    connectorStroke: '#666666',
    noteBackgroundColor: '#ffffff',
    noteFontSize: '12px',
    noteTextColor: '#000000',
    dataSource: 'cities'
  },
  render
};

export const CalloutElbow: Story = {
  args: {
    annotationType: 'calloutElbow',
    textProperty: 'name',
    useTitle: true,
    offsetX: 50,
    offsetY: -30,
    subjectRadius: 4,
    subjectFill: '#3498db',
    connectorStroke: '#2980b9',
    noteBackgroundColor: '#ecf0f1',
    noteFontSize: '12px',
    noteTextColor: '#2c3e50',
    dataSource: 'cities'
  },
  render
};

export const CalloutCurve: Story = {
  args: {
    annotationType: 'calloutCurve',
    textProperty: 'name',
    useTitle: false,
    offsetX: 40,
    offsetY: 25,
    subjectRadius: 3,
    subjectFill: '#9b59b6',
    connectorStroke: '#8e44ad',
    noteBackgroundColor: '#f8f9fa',
    noteFontSize: '14px',
    noteTextColor: '#6c757d',
    dataSource: 'cities'
  },
  render
};

export const Label: Story = {
  args: {
    annotationType: 'label',
    textProperty: 'name',
    useTitle: false,
    offsetX: 0,
    offsetY: -15,
    subjectRadius: 2,
    subjectFill: '#f39c12',
    connectorStroke: '#e67e22',
    noteBackgroundColor: '#ffffff',
    noteFontSize: '11px',
    noteTextColor: '#000000',
    dataSource: 'cities'
  },
  render
};

export const Badge: Story = {
  args: {
    annotationType: 'badge',
    textProperty: 'name',
    useTitle: false,
    offsetX: 0,
    offsetY: 0,
    subjectRadius: 10,
    subjectFill: '#e74c3c',
    connectorStroke: '#c0392b',
    noteBackgroundColor: '#ffffff',
    noteFontSize: '10px',
    noteTextColor: '#ffffff',
    dataSource: 'cities'
  },
  render
};

export const CalloutCircle: Story = {
  args: {
    annotationType: 'calloutCircle',
    textProperty: 'custom',
    useTitle: false,
    offsetX: -40,
    offsetY: 30,
    subjectRadius: 8,
    subjectFill: 'none',
    connectorStroke: '#27ae60',
    noteBackgroundColor: '#d5f4e6',
    noteFontSize: '12px',
    noteTextColor: '#1e8449',
    dataSource: 'cities'
  },
  render
};

export const CalloutRect: Story = {
  args: {
    annotationType: 'calloutRect',
    textProperty: 'name',
    useTitle: true,
    offsetX: -50,
    offsetY: -25,
    subjectRadius: 6,
    subjectFill: 'none',
    connectorStroke: '#e67e22',
    noteBackgroundColor: '#fdeaa7',
    noteFontSize: '13px',
    noteTextColor: '#d35400',
    dataSource: 'cities'
  },
  render
};

export const PolygonAnnotations: Story = {
  args: {
    annotationType: 'callout',
    textProperty: 'name',
    useTitle: false,
    offsetX: 35,
    offsetY: -15,
    subjectRadius: 4,
    subjectFill: '#16a085',
    connectorStroke: '#1abc9c',
    noteBackgroundColor: '#e8f8f5',
    noteFontSize: '12px',
    noteTextColor: '#117a65',
    dataSource: 'polygons'
  },
  render
};