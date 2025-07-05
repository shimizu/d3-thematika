import type { Meta, StoryObj } from '@storybook/html';
import { Map } from '../../thematika';
import { ImageLayer } from '../../layers/image-layer';
import { GraticuleLayer } from '../../layers/graticule-layer';
import { readCOG } from '../../utils/cog-utils';
import { createMapContainer } from '../utils/story-helpers';
import * as d3 from 'd3-geo';

interface ImageLayerArgs {
  imageSource: 'static' | 'cog';
  showBboxMarkers: boolean;
  useAdvancedReprojection: boolean;
  useMask: boolean;
  opacity: number;
  projection: 'naturalEarth1' | 'mercator' | 'equirectangular' | 'orthographic';
  cogImageIndex: number;
  cogSizeLimit: number;
  showGraticule: boolean;
}

const meta: Meta<ImageLayerArgs> = {
  title: 'Layers/ImageLayer',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: '画像を地図上に表示するレイヤー。静的画像とCOG（Cloud Optimized GeoTIFF）の両方をサポートします。'
      }
    }
  },
  argTypes: {
    imageSource: {
      control: { type: 'radio' },
      options: ['static', 'cog'],
      description: '画像ソースタイプ',
      defaultValue: 'static'
    },
    showBboxMarkers: {
      control: { type: 'boolean' },
      description: 'バウンディングボックスマーカーを表示',
      defaultValue: false
    },
    useAdvancedReprojection: {
      control: { type: 'boolean' },
      description: '高度な再投影を使用',
      defaultValue: true
    },
    useMask: {
      control: { type: 'boolean' },
      description: 'マスク処理を使用',
      defaultValue: true
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
    cogImageIndex: {
      control: { type: 'range', min: 0, max: 6, step: 1 },
      description: 'COG画像インデックス（オーバービューレベル）',
      defaultValue: 0
    },
    cogSizeLimit: {
      control: { type: 'select' },
      options: [256, 512, 1024, 2048],
      description: 'COGサイズ制限',
      defaultValue: 512
    },
    showGraticule: {
      control: { type: 'boolean' },
      description: '経緯線を表示',
      defaultValue: true
    }
  }
};

export default meta;
type Story = StoryObj<ImageLayerArgs>;

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
        .rotate([-10, -20]);
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

// 静的画像のサンプルデータ（Data URI）
const SAMPLE_IMAGE_DATA_URI = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

// ストーリー作成関数
function createImageStory(args: ImageLayerArgs) {
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
  
  if (args.imageSource === 'cog') {
      // COG読み込みのデモ
      const loadingDiv = document.createElement('div');
      loadingDiv.innerHTML = '<p>COG読み込み中...</p>';
      loadingDiv.style.position = 'absolute';
      loadingDiv.style.top = '10px';
      loadingDiv.style.left = '10px';
      loadingDiv.style.background = 'rgba(255,255,255,0.9)';
      loadingDiv.style.padding = '10px';
      loadingDiv.style.borderRadius = '4px';
      container.appendChild(loadingDiv);
      
      // サンプルCOGを読み込み（南アメリカ）
      readCOG(
        'https://storage.googleapis.com/g3-open-resource/d3-thematika/cog/NE1_HR_SR_OB_DRv6_COG.tif',
        {
          imageIndex: args.cogImageIndex,
          bbox: [-82, -56, -34, 13], // 南アメリカ
          sizeLimit: {
            maxWidth: args.cogSizeLimit,
            maxHeight: args.cogSizeLimit,
            onExceed: 'resample'
          },
          resampleMethod: 'bilinear'
        }
      ).then(cogResult => {
        // 読み込み完了表示
        loadingDiv.innerHTML = `
          <p><strong>COG読み込み完了</strong></p>
          <p>サイズ: ${cogResult.width} × ${cogResult.height}</p>
          <p>元サイズ: ${cogResult.originalWidth} × ${cogResult.originalHeight}</p>
          <p>リサンプリング: ${cogResult.wasResampled ? 'あり' : 'なし'}</p>
        `;
        
        // COGデータでImageLayerを作成
        const imageLayer = new ImageLayer('cog-image', {
          src: cogResult.dataUri,
          bounds: cogResult.bounds,
          showBboxMarkers: args.showBboxMarkers,
          useAdvancedReprojection: args.useAdvancedReprojection,
          useMask: args.useMask,
          attr: {
            opacity: args.opacity
          }
        });
        
        // 境界に合わせて投影法を調整
        const [west, south, east, north] = cogResult.bounds;
        const geoBounds = {
          type: 'LineString' as const,
          coordinates: [[west, south], [east, north]]
        };
        projection.fitExtent([[50, 50], [width-50, height-50]], geoBounds);
        
        // レイヤーを地図に追加
        map.addLayer('image', imageLayer);
      }).catch(error => {
        console.error('Image loading error:', error);
        
        // エラー表示
        loadingDiv.innerHTML = `<p style="color: red;">画像読み込みエラー: ${error instanceof Error ? error.message : String(error)}</p>`;
      });
      
  } else {
      // 静的画像のデモ（日本周辺）
      const imageLayer = new ImageLayer('static-image', {
        src: SAMPLE_IMAGE_DATA_URI,
        bounds: [130, 30, 145, 45], // 日本周辺
        showBboxMarkers: args.showBboxMarkers,
        useAdvancedReprojection: args.useAdvancedReprojection,
        useMask: args.useMask,
        attr: {
          opacity: args.opacity
        }
      });
      
      // レイヤーを地図に追加
      map.addLayer('image', imageLayer);
      
      // 情報表示
      const infoDiv = document.createElement('div');
      infoDiv.innerHTML = `
        <p><strong>静的画像デモ</strong></p>
        <p>境界: 日本周辺 [130°-145°E, 30°-45°N]</p>
        <p>※実際の使用時は有効な画像URLを指定してください</p>
      `;
      infoDiv.style.position = 'absolute';
      infoDiv.style.top = '10px';
      infoDiv.style.left = '10px';
      infoDiv.style.background = 'rgba(255,255,255,0.9)';
      infoDiv.style.padding = '10px';
      infoDiv.style.borderRadius = '4px';
      infoDiv.style.fontSize = '12px';
      container.appendChild(infoDiv);
  }
  
  return container;
}

export const StaticImage: Story = {
  args: {
    imageSource: 'static',
    showBboxMarkers: false,
    useAdvancedReprojection: true,
    useMask: true,
    opacity: 0.8,
    projection: 'naturalEarth1',
    cogImageIndex: 0,
    cogSizeLimit: 512,
    showGraticule: true
  },
  render: createImageStory,
};

export const COGImage: Story = {
  args: {
    imageSource: 'cog',
    showBboxMarkers: true,
    useAdvancedReprojection: true,
    useMask: true,
    opacity: 0.9,
    projection: 'naturalEarth1',
    cogImageIndex: 0,
    cogSizeLimit: 512,
    showGraticule: true
  },
  render: createImageStory,
};

export const COGHighResolution: Story = {
  args: {
    imageSource: 'cog',
    showBboxMarkers: false,
    useAdvancedReprojection: true,
    useMask: true,
    opacity: 1.0,
    projection: 'equirectangular',
    cogImageIndex: 0,
    cogSizeLimit: 1024,
    showGraticule: false
  },
  render: createImageStory,
};

export const COGOverview: Story = {
  args: {
    imageSource: 'cog',
    showBboxMarkers: true,
    useAdvancedReprojection: false,
    useMask: false,
    opacity: 0.7,
    projection: 'mercator',
    cogImageIndex: 3,
    cogSizeLimit: 256,
    showGraticule: true
  },
  render: createImageStory,
};