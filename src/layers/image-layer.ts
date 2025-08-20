import { Selection, select } from 'd3-selection';
import { GeoProjection, geoPath, geoEquirectangular } from 'd3-geo';
import { BaseLayer } from './base-layer';
import { LayerAttr, LayerStyle } from '../types';

/**
 * 画像レイヤーのオプション
 */
export interface ImageLayerOptions {
  /** 画像のURL */
  src: string;
  /** 画像の地理的境界 [west, south, east, north] */
  bounds: [number, number, number, number];
  /** SVG属性設定 */
  attr?: LayerAttr;
  /** CSS style属性設定 */
  style?: LayerStyle;
  /** bboxの四隅にマーカーを表示するかどうか */
  showBboxMarkers?: boolean;
}

/**
 * 画像を地図上に表示するレイヤー
 * Equirectangular投影法の場合は高速に描画し、
 * その他の投影法では画像を再投影して表示します
 */
export class ImageLayer extends BaseLayer {
  private src: string;
  private bounds: [number, number, number, number];
  private projection?: GeoProjection;
  private imageElement?: Selection<SVGImageElement, unknown, any, any>;
  private showBboxMarkers: boolean;

  /**
   * ImageLayerを初期化します
   * @param id - レイヤーの一意識別子
   * @param options - レイヤーのオプション
   */
  constructor(id: string, options: ImageLayerOptions) {
    super(id, options.attr, options.style);
    this.src = options.src;
    this.bounds = options.bounds;
    this.showBboxMarkers = options.showBboxMarkers ?? false;
  }

  /**
   * 投影法を設定します
   * @param projection - 投影法
   */
  public setProjection(projection: GeoProjection): void {
    this.projection = projection;
    if (this.isRendered()) {
      if (!this.element || !this.projection) return;
      
      // 既存の画像とマーカーを削除して再描画
      const selection = select(this.element);
      selection.selectAll('image').remove();
      selection.selectAll('.bbox-marker').remove();
      selection.selectAll('.bbox-marker-label').remove();
      
      this.loadImage(this.src).then(img => {
        if (this.canUseDirectRendering(this.projection!)) {
          this.renderDirect(img);
        } else {
          this.renderReprojected(img);
        }
      }).catch(error => {
        console.error('ImageLayer: 更新に失敗しました', error);
      });
    }
  }

  /**
   * レイヤーを描画します
   * @param container - 描画先のSVGグループ要素
   */
  public async render(container: Selection<SVGGElement, unknown, HTMLElement, any>): Promise<void> {
    if (!this.projection) {
      console.warn('ImageLayer: 投影法が設定されていません');
      return;
    }

    const g = container.append('g')
      .attr('class', `image-layer ${this.attr.className || ''}`)
      .attr('id', `layer-${this.id}`);
    
    if (!this.visible) {
      g.style('display', 'none');
    }
    
    this.element = g.node() as SVGGElement;



    try {
      const img = await this.loadImage(this.src);

      
      if (this.canUseDirectRendering(this.projection)) {
        console.log("direct")
        await this.renderDirect(img);
      } else {
        console.log("repuro")
        await this.renderReprojected(img);
      }
    } catch (error) {
      console.error('ImageLayer: 画像の描画に失敗しました', error);
    }
  }

  /**
   * 画像を読み込みます
   * @param src - 画像のURL
   * @returns 読み込まれた画像要素
   */
  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`画像の読み込みに失敗しました: ${src}`));
      img.src = src;
    });
  }

  /**
   * 高速な直接描画が可能かどうかを判定します
   * @param projection - 投影法
   * @returns 高速描画が可能な場合はtrue
   */
  private canUseDirectRendering(projection: GeoProjection): boolean {
    // Equirectangular投影法のみ高速描画を使用
    return this.isEquirectangularProjection(projection);
  }

  /**
   * Equirectangular投影法かどうかを判定します
   * @param projection - 投影法
   * @returns Equirectangular投影法の場合はtrue
   */
  private isEquirectangularProjection(projection: GeoProjection): boolean {
    const projString = projection.toString ? projection.toString() : '';
    return projString.includes('equirectangular') || 
           projString.includes('Equirectangular');
  }

  /**
   * 画像を高速に直接描画します（Equirectangular投影法用）
   * @param img - 画像要素
   */
  private renderDirect(img: HTMLImageElement): void {
    if (!this.element || !this.projection) return;


    console.log(this.bounds)


    const [west, south, east, north] = this.bounds;

    

    // 境界の四隅を投影法で座標変換
    const topLeft = this.projection([west, north]);
    const topRight = this.projection([east, north]);
    const bottomLeft = this.projection([west, south]);
    const bottomRight = this.projection([east, south]);
    
    if (!topLeft || !bottomRight) {
      console.warn('ImageLayer: 境界が投影範囲外です');
      return;
    }
    
    const projectedX = topLeft[0];
    const projectedY = topLeft[1];
    const projectedWidth = Math.abs(bottomRight[0] - topLeft[0]);
    const projectedHeight = Math.abs(bottomRight[1] - topLeft[1]);

    // 画像要素を作成
    const selection = select(this.element as any) as Selection<SVGGElement, unknown, any, any>;


    this.imageElement = selection
      .append('image')
      .attr('x', projectedX)
      .attr('y', projectedY)
      .attr('width', projectedWidth)
      .attr('height', projectedHeight)
      .attr('href', img.src)
      .attr('preserveAspectRatio', 'none');

    // bbox マーカーを表示（オプション）
    if (this.showBboxMarkers) {
      this.addBboxMarkers(selection, [topLeft, topRight, bottomLeft, bottomRight]);
    }

    // スタイルを適用
    if (this.imageElement) {
      this.applyAllStylesToElement(this.imageElement, this.getLayerGroup()!);
    }
  }

  /**
   * 画像を再投影して描画します（その他の投影法用）
   * @param img - 画像要素
   */
  private async renderReprojected(img: HTMLImageElement): Promise<void> {
    if (!this.element || !this.projection) return;

    try {
      const result = await this.reprojectImage(img);
      
      const selection = select(this.element as any) as Selection<SVGGElement, unknown, any, any>;
      this.imageElement = selection
        .append('image')
        .attr('x', result.x)
        .attr('y', result.y)
        .attr('width', result.width)
        .attr('height', result.height)
        .attr('href', result.dataUrl)
        .attr('preserveAspectRatio', 'none');

      if (this.imageElement) {
        this.applyAllStylesToElement(this.imageElement, this.getLayerGroup()!);
      }

      // bbox マーカーを表示（オプション）
      if (this.showBboxMarkers) {
        const [west, south, east, north] = this.bounds;
        const topLeft = this.projection([west, north]);
        const topRight = this.projection([east, north]);
        const bottomLeft = this.projection([west, south]);
        const bottomRight = this.projection([east, south]);
        this.addBboxMarkers(selection, [topLeft, topRight, bottomLeft, bottomRight]);
      }
    } catch (error) {
      console.error('ImageLayer: 再投影に失敗しました', error);
    }
  }

  /**
   * 画像を再投影変換します
   * @param img - 元画像
   * @returns 変換後の画像の情報
   */
  private async reprojectImage(img: HTMLImageElement): Promise<{ dataUrl: string; x: number; y: number; width: number; height: number }> {
    if (!this.projection) throw new Error('投影法が設定されていません');

    const [west, south, east, north] = this.bounds;
    
    // 出力範囲を計算
    const outputBounds = this.calculateOutputBounds();
    if (!outputBounds) throw new Error('出力範囲の計算に失敗しました');
    
    const { minX, minY, width, height } = outputBounds;
    
    // ソース画像をCanvasに描画
    const srcCanvas = document.createElement('canvas');
    const srcCtx = srcCanvas.getContext('2d');
    if (!srcCtx) throw new Error('Canvas contextの取得に失敗しました');

    srcCanvas.width = img.width;
    srcCanvas.height = img.height;
    srcCtx.drawImage(img, 0, 0);
    const srcImageData = srcCtx.getImageData(0, 0, img.width, img.height);

    // 出力Canvas作成
    const destCanvas = document.createElement('canvas');
    const destCtx = destCanvas.getContext('2d');
    if (!destCtx) throw new Error('Canvas contextの取得に失敗しました');

    destCanvas.width = width;
    destCanvas.height = height;
    
    const destImageData = destCtx.createImageData(width, height);
    
    // 各ピクセルを変換
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const screenX = col + minX;
        const screenY = row + minY;
        
        // 投影の逆変換
        if (this.projection.invert) {
          try {
            const geoCoord = this.projection.invert([screenX, screenY]);
            if (geoCoord && 
                geoCoord[0] >= west && geoCoord[0] <= east &&
                geoCoord[1] >= south && geoCoord[1] <= north) {
              
              // ソース画像の座標を計算
              const srcX = (geoCoord[0] - west) / (east - west) * (img.width - 1);
              const srcY = (north - geoCoord[1]) / (north - south) * (img.height - 1);
              
              // 最近傍補間
              const pixel = this.nearestNeighborInterpolate(srcImageData, srcX, srcY);
              const destIndex = (row * width + col) * 4;
              
              destImageData.data[destIndex] = pixel[0];
              destImageData.data[destIndex + 1] = pixel[1];
              destImageData.data[destIndex + 2] = pixel[2];
              destImageData.data[destIndex + 3] = pixel[3];
            }
          } catch (e) {
            // 投影が失敗した場合はスキップ
          }
        }
      }
    }

    destCtx.putImageData(destImageData, 0, 0);
    
    return {
      dataUrl: destCanvas.toDataURL(),
      x: minX,
      y: minY,
      width,
      height
    };
  }

  /**
   * 最近傍補間を行います
   * @param imageData - 画像データ
   * @param x - X座標（小数）
   * @param y - Y座標（小数）
   * @returns RGBA値の配列
   */
  private nearestNeighborInterpolate(imageData: ImageData, x: number, y: number): [number, number, number, number] {
    const nearestX = Math.round(x);
    const nearestY = Math.round(y);
    
    if (nearestX < 0 || nearestX >= imageData.width || nearestY < 0 || nearestY >= imageData.height) {
      return [0, 0, 0, 0];
    }
    
    const idx = (nearestY * imageData.width + nearestX) * 4;
    return [
      imageData.data[idx],
      imageData.data[idx + 1],
      imageData.data[idx + 2],
      imageData.data[idx + 3]
    ];
  }

  /**
   * 出力画像の境界を計算します
   * @returns 境界情報またはnull
   */
  private calculateOutputBounds(): { minX: number; minY: number; width: number; height: number } | null {
    if (!this.projection) return null;

    const [west, south, east, north] = this.bounds;
    
    // より多くのテストポイントで正確な境界を計算
    const testPoints: [number, number][] = [];
    const steps = 20;
    
    // 境界線上の点を追加
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      testPoints.push(
        [west + (east - west) * t, north],
        [west + (east - west) * t, south],
        [west, south + (north - south) * t],
        [east, south + (north - south) * t]
      );
    }

    const projectedPoints = testPoints
      .map(p => this.projection!(p))
      .filter(p => p !== null) as [number, number][];
    
    if (projectedPoints.length === 0) return null;

    const xs = projectedPoints.map(p => p[0]);
    const ys = projectedPoints.map(p => p[1]);
    
    const minX = Math.floor(Math.min(...xs));
    const maxX = Math.ceil(Math.max(...xs));
    const minY = Math.floor(Math.min(...ys));
    const maxY = Math.ceil(Math.max(...ys));

    return {
      minX,
      minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  /**
   * bbox の四隅にマーカーを表示します
   * @param selection - SVGグループ選択
   * @param corners - 四隅の座標配列
   */
  private addBboxMarkers(
    selection: Selection<SVGGElement, unknown, any, any>, 
    corners: ([number, number] | null)[]
  ): void {
    const validCorners = corners.filter(corner => corner !== null) as [number, number][];
    const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12']; // より見やすい色
    const labels = ['NW', 'NE', 'SW', 'SE']; // 短いラベル
    
    validCorners.forEach((corner, index) => {
      // マーカー用のグループを作成
      const markerGroup = selection
        .append('g')
        .attr('class', 'bbox-marker')
        .attr('transform', `translate(${corner[0]}, ${corner[1]})`);
      
      // 外側の円（白い縁取り）
      markerGroup
        .append('circle')
        .attr('r', 6)
        .attr('fill', 'white')
        .attr('stroke', colors[index] || '#9b59b6')
        .attr('stroke-width', 2);
      
      // 内側の円（メインカラー）
      markerGroup
        .append('circle')
        .attr('r', 4)
        .attr('fill', colors[index] || '#9b59b6');
      
      // ラベル
      markerGroup
        .append('text')
        .attr('x', 10)
        .attr('y', 4)
        .attr('font-size', '11px')
        .attr('font-family', 'Arial, sans-serif')
        .attr('fill', colors[index] || '#9b59b6')
        .attr('font-weight', 'bold')
        .attr('class', 'bbox-marker-label')
        .text(labels[index] || `${index + 1}`);
    });
  }
}