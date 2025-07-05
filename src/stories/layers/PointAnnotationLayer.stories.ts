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
  subjectType: 'point' | 'circle' | 'rect';
  subjectRadius: number;
  subjectWidth: number;
  subjectHeight: number;
  subjectFill: string;
  subjectStroke: string;
  subjectStrokeWidth: number;
  subjectStrokeDasharray: string;
  connectorStroke: string;
  connectorStrokeWidth: number;
  noteBackgroundColor: string;
  noteFontSize: string;
  noteTextColor: string;
  notePadding: number;
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
    subjectType: {
      control: { type: 'select' },
      options: ['point', 'circle', 'rect'],
      description: 'サブジェクトの形状タイプ',
      defaultValue: 'point'
    },
    subjectRadius: {
      control: { type: 'range', min: 1, max: 20, step: 1 },
      description: 'サブジェクトの半径（point/circle用）',
      defaultValue: 3
    },
    subjectWidth: {
      control: { type: 'range', min: 4, max: 40, step: 2 },
      description: 'サブジェクトの幅（rect用）',
      defaultValue: 16
    },
    subjectHeight: {
      control: { type: 'range', min: 4, max: 40, step: 2 },
      description: 'サブジェクトの高さ（rect用）',
      defaultValue: 16
    },
    subjectFill: {
      control: { type: 'color' },
      description: 'サブジェクトの塗りつぶし色',
      defaultValue: '#e74c3c'
    },
    subjectStroke: {
      control: { type: 'color' },
      description: 'サブジェクトの境界線色',
      defaultValue: '#ffffff'
    },
    subjectStrokeWidth: {
      control: { type: 'range', min: 0, max: 5, step: 0.5 },
      description: 'サブジェクトの境界線太さ',
      defaultValue: 1
    },
    subjectStrokeDasharray: {
      control: { type: 'select' },
      options: ['none', '2,2', '4,4', '8,4', '2,4,2', '4,2,1,2'],
      description: 'サブジェクトの境界線ダッシュパターン',
      defaultValue: 'none'
    },
    connectorStroke: {
      control: { type: 'color' },
      description: 'コネクター（引き出し線）の色',
      defaultValue: '#666666'
    },
    connectorStrokeWidth: {
      control: { type: 'range', min: 0.5, max: 5, step: 0.5 },
      description: 'コネクター（引き出し線）の太さ',
      defaultValue: 1
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
    notePadding: {
      control: { type: 'range', min: 0, max: 20, step: 1 },
      description: 'ノートの内側余白（パディング）',
      defaultValue: 4
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
        type: args.subjectType,
        r: args.subjectRadius,
        width: args.subjectWidth,
        height: args.subjectHeight,
        fill: args.subjectFill,
        stroke: args.subjectStroke,
        strokeWidth: args.subjectStrokeWidth,
        strokeDasharray: args.subjectStrokeDasharray,
        // 後方互換性のため
        radius: args.subjectRadius
      },
      connectorOptions: {
        stroke: args.connectorStroke,
        strokeWidth: args.connectorStrokeWidth
      },
      noteOptions: {
        backgroundColor: args.noteBackgroundColor,
        fontSize: args.noteFontSize,
        textColor: args.noteTextColor,
        borderColor: '#cccccc',
        borderWidth: 1,
        padding: args.notePadding
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
    subjectType: 'point',
    subjectRadius: 3,
    subjectWidth: 16,
    subjectHeight: 16,
    subjectFill: '#e74c3c',
    subjectStroke: '#ffffff',
    subjectStrokeWidth: 1,
    subjectStrokeDasharray: 'none',
    connectorStroke: '#666666',
    connectorStrokeWidth: 1,
    noteBackgroundColor: '#ffffff',
    noteFontSize: '12px',
    noteTextColor: '#000000',
    notePadding: 4,
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
    subjectType: 'circle',
    subjectRadius: 6,
    subjectWidth: 16,
    subjectHeight: 16,
    subjectFill: '#3498db',
    subjectStroke: '#ffffff',
    subjectStrokeWidth: 1.5,
    subjectStrokeDasharray: '4,4',
    connectorStroke: '#2980b9',
    connectorStrokeWidth: 1.5,
    noteBackgroundColor: '#ecf0f1',
    noteFontSize: '12px',
    noteTextColor: '#2c3e50',
    notePadding: 6,
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
    subjectType: 'point',
    subjectRadius: 4,
    subjectWidth: 16,
    subjectHeight: 16,
    subjectFill: '#9b59b6',
    subjectStroke: '#ffffff',
    subjectStrokeWidth: 2,
    subjectStrokeDasharray: 'none',
    connectorStroke: '#8e44ad',
    connectorStrokeWidth: 1.5,
    noteBackgroundColor: '#f8f9fa',
    noteFontSize: '14px',
    noteTextColor: '#6c757d',
    notePadding: 5,
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
    subjectType: 'point',
    subjectRadius: 2,
    subjectWidth: 16,
    subjectHeight: 16,
    subjectFill: '#f39c12',
    subjectStroke: '#ffffff',
    subjectStrokeWidth: 1,
    subjectStrokeDasharray: 'none',
    connectorStroke: '#e67e22',
    connectorStrokeWidth: 1,
    noteBackgroundColor: '#ffffff',
    noteFontSize: '11px',
    noteTextColor: '#000000',
    notePadding: 3,
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
    subjectType: 'circle',
    subjectRadius: 12,
    subjectWidth: 16,
    subjectHeight: 16,
    subjectFill: '#e74c3c',
    subjectStroke: '#ffffff',
    subjectStrokeWidth: 2,
    subjectStrokeDasharray: 'none',
    connectorStroke: '#c0392b',
    connectorStrokeWidth: 1,
    noteBackgroundColor: '#ffffff',
    noteFontSize: '10px',
    noteTextColor: '#ffffff',
    notePadding: 2,
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
    subjectType: 'circle',
    subjectRadius: 10,
    subjectWidth: 16,
    subjectHeight: 16,
    subjectFill: 'none',
    subjectStroke: '#27ae60',
    subjectStrokeWidth: 2,
    subjectStrokeDasharray: '8,4',
    connectorStroke: '#27ae60',
    connectorStrokeWidth: 1.5,
    noteBackgroundColor: '#d5f4e6',
    noteFontSize: '12px',
    noteTextColor: '#1e8449',
    notePadding: 5,
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
    subjectType: 'rect',
    subjectRadius: 6,
    subjectWidth: 20,
    subjectHeight: 14,
    subjectFill: 'none',
    subjectStroke: '#e67e22',
    subjectStrokeWidth: 2,
    subjectStrokeDasharray: '2,4,2',
    connectorStroke: '#e67e22',
    connectorStrokeWidth: 1.5,
    noteBackgroundColor: '#fdeaa7',
    noteFontSize: '13px',
    noteTextColor: '#d35400',
    notePadding: 6,
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
    subjectType: 'circle',
    subjectRadius: 5,
    subjectWidth: 16,
    subjectHeight: 16,
    subjectFill: '#16a085',
    subjectStroke: '#ffffff',
    subjectStrokeWidth: 1,
    subjectStrokeDasharray: 'none',
    connectorStroke: '#1abc9c',
    connectorStrokeWidth: 1,
    noteBackgroundColor: '#e8f8f5',
    noteFontSize: '12px',
    noteTextColor: '#117a65',
    notePadding: 4,
    dataSource: 'polygons'
  },
  render
};

export const SubjectTypeDemo: Story = {
  args: {
    annotationType: 'callout',
    textProperty: 'name',
    useTitle: true,
    offsetX: 45,
    offsetY: -30,
    subjectType: 'rect',
    subjectRadius: 8,
    subjectWidth: 24,
    subjectHeight: 18,
    subjectFill: '#ff6b6b',
    subjectStroke: '#2c3e50',
    subjectStrokeWidth: 2,
    subjectStrokeDasharray: '4,2,1,2',
    connectorStroke: '#34495e',
    connectorStrokeWidth: 2,
    noteBackgroundColor: '#fff3cd',
    noteFontSize: '13px',
    noteTextColor: '#856404',
    notePadding: 8,
    dataSource: 'cities'
  },
  render
};