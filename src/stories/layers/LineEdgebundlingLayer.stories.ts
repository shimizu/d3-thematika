import type { Meta, StoryObj } from '@storybook/html-vite';
import { Map } from '../../thematika';
import { LineEdgeBundlingLayer } from '../../layers/line-edgebundling-layer';
import { GraticuleLayer } from '../../layers/graticule-layer';
import { OutlineLayer } from '../../layers/outline-layer';
import { createMapContainer, generateConnectionLines, loadWorldData } from '../utils/story-helpers';
import * as d3 from 'd3-geo';

interface LineEdgebundlingLayerArgs {
  bundlingStrength: number;
  segmentSteps: number | 'auto';
  forceStrength: number;
  animateForce: boolean;
  showControlPoints: boolean;
  showOriginalLines: boolean;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  showBackground: boolean;
}

const meta: Meta<LineEdgebundlingLayerArgs> = {
  title: 'Layers/LineEdgebundlingLayer',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'エッジバンドリングアルゴリズムを使用して、複数の線を束ねて描画するレイヤー。ネットワークの可視化や接続関係の表現に適している。'
      }
    }
  },
  argTypes: {
    bundlingStrength: {
      control: { type: 'range', min: 0, max: 1, step: 0.1 },
      description: 'バンドリングの強度（0:なし〜1:最大）',
      defaultValue: 0.85
    },
    segmentSteps: {
      control: { type: 'range', min: 1, max: 20, step: 1 },
      description: '制御点の数（autoの場合は自動計算）',
      defaultValue: 10
    },
    forceStrength: {
      control: { type: 'range', min: 1, max: 100, step: 5 },
      description: 'Force-directed layoutの強度',
      defaultValue: 20
    },
    animateForce: {
      control: { type: 'boolean' },
      description: 'Force layoutのアニメーション',
      defaultValue: true
    },
    showControlPoints: {
      control: { type: 'boolean' },
      description: '制御点を表示',
      defaultValue: false
    },
    showOriginalLines: {
      control: { type: 'boolean' },
      description: '元の線も表示',
      defaultValue: false
    },
    fill: {
      control: { type: 'color' },
      description: '塗りつぶし色',
      defaultValue: 'none'
    },
    stroke: {
      control: { type: 'color' },
      description: '線の色',
      defaultValue: '#e74c3c'
    },
    strokeWidth: {
      control: { type: 'range', min: 0.5, max: 5, step: 0.5 },
      description: '線の太さ',
      defaultValue: 1.5
    },
    opacity: {
      control: { type: 'range', min: 0, max: 1, step: 0.1 },
      description: '透明度',
      defaultValue: 0.7
    },
    showBackground: {
      control: { type: 'boolean' },
      description: '背景地図を表示',
      defaultValue: true
    }
  }
};

export default meta;
type Story = StoryObj<LineEdgebundlingLayerArgs>;

const render = (args: LineEdgebundlingLayerArgs) => {
  const container = createMapContainer();
  
  setTimeout(async () => {
    const mapElement = container.querySelector('#map') as HTMLDivElement;
    const width = mapElement.clientWidth;
    const height = mapElement.clientHeight;
    
    // 接続線データを生成
    const connectionData = generateConnectionLines();
    
    // 投影法を設定（世界地図用）
    const projection = d3.geoNaturalEarth1()
      .fitExtent([[10, 10], [width-10, height-10]], {
        type: 'Sphere'
      });
    
    // 地図を作成
    const map = new Map({
      container: '#map',
      width: width,
      height: height,
      projection: projection
    });
    
    // 背景レイヤーを追加
    if (args.showBackground) {
      // 経緯線
      const graticuleLayer = new GraticuleLayer({
        step: [20, 20],
        attr: {
          fill: 'none',
          stroke: '#f0f0f0',
          strokeWidth: 0.5,
          opacity: 0.5
        }
      });
      
      // 世界地図の輪郭
      const outlineLayer = new OutlineLayer({
        attr: {
          fill: '#f8f9fa',
          stroke: '#ddd',
          strokeWidth: 1
        }
      });
      
      map.addLayer('outline', outlineLayer);
      map.addLayer('graticule', graticuleLayer);
      
      // 世界地図データを読み込んで表示
      try {
        const worldData = await loadWorldData();
        const worldLayer = new (await import('../../layers/geojson-layer')).GeojsonLayer({
          data: worldData,
          attr: {
            fill: '#ecf0f1',
            stroke: '#bdc3c7',
            strokeWidth: 0.5,
            opacity: 0.8
          }
        });
        map.addLayer('world', worldLayer);
      } catch (error) {
        console.warn('World data not available');
      }
    }
    
    // エッジバンドリングレイヤーを作成
    const edgebundlingLayer = new LineEdgeBundlingLayer({
      data: connectionData,
      bundlingStrength: args.bundlingStrength,
      segmentSteps: args.segmentSteps,
      forceStrength: args.forceStrength,
      animateForce: args.animateForce,
      showControlPoints: args.showControlPoints,
      showOriginalLines: args.showOriginalLines,
      attr: {
        fill: args.fill,
        stroke: args.stroke,
        strokeWidth: args.strokeWidth,
        opacity: args.opacity
      }
    });
    
    // レイヤーを追加
    map.addLayer('edgebundling', edgebundlingLayer);
  }, 0);
  
  return container;
};

export const Default: Story = {
  args: {
    bundlingStrength: 0.85,
    segmentSteps: 10,
    forceStrength: 20,
    animateForce: true,
    showControlPoints: false,
    showOriginalLines: false,
    fill: 'none',
    stroke: '#e74c3c',
    strokeWidth: 1.5,
    opacity: 0.7,
    showBackground: true
  },
  render
};

export const HighBundling: Story = {
  args: {
    bundlingStrength: 0.95,
    segmentSteps: 15,
    forceStrength: 30,
    animateForce: true,
    showControlPoints: true,
    showOriginalLines: false,
    fill: 'none',
    stroke: '#3498db',
    strokeWidth: 2,
    opacity: 0.6,
    showBackground: true
  },
  render
};

export const LowBundling: Story = {
  args: {
    bundlingStrength: 0.3,
    segmentSteps: 5,
    forceStrength: 10,
    animateForce: false,
    showControlPoints: false,
    showOriginalLines: true,
    fill: 'none',
    stroke: '#27ae60',
    strokeWidth: 1,
    opacity: 0.8,
    showBackground: false
  },
  render
};

export const AnimatedFlow: Story = {
  args: {
    bundlingStrength: 0.7,
    segmentSteps: 12,
    forceStrength: 25,
    animateForce: true,
    showControlPoints: false,
    showOriginalLines: false,
    fill: 'none',
    stroke: '#9b59b6',
    strokeWidth: 2.5,
    opacity: 0.5,
    showBackground: true
  },
  render
};

export const MinimalStyle: Story = {
  args: {
    bundlingStrength: 0.8,
    segmentSteps: 'auto',
    forceStrength: 20,
    animateForce: false,
    showControlPoints: false,
    showOriginalLines: false,
    fill: 'none',
    stroke: '#2c3e50',
    strokeWidth: 0.5,
    opacity: 0.9,
    showBackground: false
  },
  render
};