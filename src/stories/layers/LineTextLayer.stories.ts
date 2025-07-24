import type { Meta, StoryObj } from '@storybook/html-vite';
import { Map } from '../../thematika';
import { LineTextLayer } from '../../layers/line-text-layer';
import { GraticuleLayer } from '../../layers/graticule-layer';
import { GeojsonLayer } from '../../layers/geojson-layer';
import { createMapContainer, generateSampleLines, generateSampleMultiLines } from '../utils/story-helpers';
import * as d3 from 'd3-geo';

interface LineTextLayerArgs {
  textProperty: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  textAnchor: 'start' | 'middle' | 'end';
  startOffset: string;
  usePathText: boolean;
  arcMode: 'none' | 'arc' | 'auto-flip';
  arcOffset: number;
  dataType: 'linestring' | 'multilinestring';
  showLines: boolean;
}

const meta: Meta<LineTextLayerArgs> = {
  title: 'Layers/LineTextLayer',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'LineStringやMultiLineStringに沿ってテキストを描画するレイヤー。線に沿ったラベル表示や、アーク状のテキスト配置が可能。'
      }
    }
  },
  argTypes: {
    textProperty: {
      control: { type: 'text' },
      description: 'テキストを取得するプロパティ名',
      defaultValue: 'text'
    },
    fontSize: {
      control: { type: 'range', min: 8, max: 32, step: 1 },
      description: 'フォントサイズ',
      defaultValue: 14
    },
    fontFamily: {
      control: { type: 'select' },
      options: ['sans-serif', 'serif', 'monospace', 'メイリオ, Meiryo, "ＭＳ Ｐゴシック", MS Gothic, sans-serif'],
      description: 'フォントファミリー',
      defaultValue: 'sans-serif'
    },
    fontWeight: {
      control: { type: 'select' },
      options: ['normal', 'bold', '300', '500', '700'],
      description: 'フォントウェイト',
      defaultValue: 'normal'
    },
    textAnchor: {
      control: { type: 'select' },
      options: ['start', 'middle', 'end'],
      description: 'テキストアンカー',
      defaultValue: 'middle'
    },
    startOffset: {
      control: { type: 'text' },
      description: 'テキストの開始位置オフセット',
      defaultValue: '50%'
    },
    usePathText: {
      control: { type: 'boolean' },
      description: 'パス沿いに配置するか中心点に配置するか',
      defaultValue: true
    },
    arcMode: {
      control: { type: 'select' },
      options: ['none', 'arc', 'auto-flip'],
      description: 'アークテキストモード',
      defaultValue: 'none'
    },
    arcOffset: {
      control: { type: 'range', min: 0, max: 100, step: 5 },
      description: 'アークオフセット（arcMode有効時）',
      defaultValue: 50
    },
    dataType: {
      control: { type: 'select' },
      options: ['linestring', 'multilinestring'],
      description: 'データタイプ',
      defaultValue: 'linestring'
    },
    showLines: {
      control: { type: 'boolean' },
      description: '背景の線を表示',
      defaultValue: true
    }
  }
};

export default meta;
type Story = StoryObj<LineTextLayerArgs>;

const render = (args: LineTextLayerArgs) => {
  const container = createMapContainer();
  
  setTimeout(() => {
    const mapElement = container.querySelector('#map') as HTMLDivElement;
    const width = mapElement.clientWidth;
    const height = mapElement.clientHeight;
    
    // データを準備
    const data = args.dataType === 'linestring' 
      ? generateSampleLines(8)
      : generateSampleMultiLines(5);
    
    // 投影法を設定
    const projection = d3.geoNaturalEarth1()
      .fitExtent([[50, 50], [width-50, height-50]], data);
    
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
    
    // 線を表示する場合は GeojsonLayer を追加
    if (args.showLines) {
      const lineLayer = new GeojsonLayer({
        data: data,
        attr: {
          fill: 'none',
          stroke: '#74b9ff',
          strokeWidth: 2,
          opacity: 0.5
        }
      });
      map.addLayer('lines', lineLayer);
    }
    
    // LineTextLayerのオプションを設定
    const lineTextOptions: any = {
      data: data,
      textProperty: args.textProperty,
      fontSize: args.fontSize,
      fontFamily: args.fontFamily,
      fontWeight: args.fontWeight,
      textAnchor: args.textAnchor,
      startOffset: args.startOffset,
      usePathText: args.usePathText,
      attr: {
        fill: '#2d3436',
        stroke: 'white',
        strokeWidth: 3,
        paintOrder: 'stroke'
      }
    };
    
    // アークモードの設定
    if (args.arcMode !== 'none') {
      lineTextOptions.arcMode = args.arcMode;
      lineTextOptions.arcOffset = args.arcOffset;
    }
    
    // LineTextLayerを作成
    const textLayer = new LineTextLayer(lineTextOptions);
    
    // レイヤーを追加
    map.addLayer('graticule', graticuleLayer);
    map.addLayer('text', textLayer);
  }, 0);
  
  return container;
};

export const Default: Story = {
  args: {
    textProperty: 'text',
    fontSize: 14,
    fontFamily: 'sans-serif',
    fontWeight: 'normal',
    textAnchor: 'middle',
    startOffset: '50%',
    usePathText: true,
    arcMode: 'none',
    arcOffset: 50,
    dataType: 'linestring',
    showLines: true
  },
  render
};

export const ArcText: Story = {
  args: {
    textProperty: 'text',
    fontSize: 16,
    fontFamily: 'serif',
    fontWeight: 'bold',
    textAnchor: 'middle',
    startOffset: '50%',
    usePathText: true,
    arcMode: 'arc',
    arcOffset: 30,
    dataType: 'linestring',
    showLines: true
  },
  render
};

export const AutoFlipText: Story = {
  args: {
    textProperty: 'name',
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: 'normal',
    textAnchor: 'middle',
    startOffset: '50%',
    usePathText: true,
    arcMode: 'auto-flip',
    arcOffset: 0,
    dataType: 'multilinestring',
    showLines: true
  },
  render
};

export const CenterPointText: Story = {
  args: {
    textProperty: 'text',
    fontSize: 18,
    fontFamily: 'メイリオ, Meiryo, "ＭＳ Ｐゴシック", MS Gothic, sans-serif',
    fontWeight: '500',
    textAnchor: 'middle',
    startOffset: '50%',
    usePathText: false,
    arcMode: 'none',
    arcOffset: 50,
    dataType: 'linestring',
    showLines: true
  },
  render
};

export const EdgeLabels: Story = {
  args: {
    textProperty: 'text',
    fontSize: 11,
    fontFamily: 'sans-serif',
    fontWeight: '300',
    textAnchor: 'start',
    startOffset: '10%',
    usePathText: true,
    arcMode: 'none',
    arcOffset: 50,
    dataType: 'linestring',
    showLines: false
  },
  render
};