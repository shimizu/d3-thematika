import { Selection, select } from 'd3-selection';
import { GeoProjection } from 'd3-geo';
import { BaseLayer } from './base-layer';
import { LayerStyle } from '../types';

/**
 * ラスターレイヤーのオプション
 */
export interface RasterLayerOptions {
  /** 画像のURL */
  src: string;
  /** 画像の地理的境界 [west, south, east, north] */
  bounds: [number, number, number, number];
  /** スタイル設定 */
  style?: LayerStyle;
  /** bboxの四隅にマーカーを表示するかどうか */
  showBboxMarkers?: boolean;
}

/**
 * ラスター画像を地図上に表示するレイヤー
 * Equirectangular投影法の場合は高速に描画し、
 * その他の投影法では画像を変換して表示します
 */
export class RasterLayer extends BaseLayer {
  private src: string;
  private bounds: [number, number, number, number];
  private projection?: GeoProjection;
  private imageElement?: Selection<SVGImageElement, unknown, any, any>;
  private showBboxMarkers: boolean;

  /**
   * RasterLayerを初期化します
   * @param id - レイヤーの一意識別子
   * @param options - レイヤーのオプション
   */
  constructor(id: string, options: RasterLayerOptions) {
    super(id, options.style);
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
      this.update();
    }
  }

  /**
   * レイヤーを描画します
   * @param container - 描画先のSVGグループ要素
   */
  public async render(container: Selection<SVGGElement, unknown, HTMLElement, any>): Promise<void> {
    if (!this.projection) {
      console.warn('RasterLayer: 投影法が設定されていません');
      return;
    }

    const g = container.append('g')
      .attr('class', `raster-layer ${this.style.className || ''}`)
      .attr('id', `layer-${this.id}`);
    
    if (!this.visible) {
      g.style('display', 'none');
    }
    
    this.element = g.node() as SVGGElement;

    try {
      const img = await this.loadImage(this.src);
      
      // 全ての投影法で画像をそのまま表示（座標変換なし）
      await this.renderSimpleImage(img);
    } catch (error) {
      console.error('RasterLayer: 画像の描画に失敗しました', error);
    }
  }

  /**
   * レイヤーを更新します
   */
  public update(): void {
    if (!this.element || !this.projection) return;
    
    // 既存の画像とマーカーを削除して再描画
    const selection = select(this.element);
    selection.selectAll('image').remove();
    selection.selectAll('.bbox-marker').remove();
    selection.selectAll('.bbox-marker-label').remove();
    
    this.loadImage(this.src).then(img => {
      // 全ての投影法で画像をそのまま表示（座標変換なし）
      this.renderSimpleImage(img);
    }).catch(error => {
      console.error('RasterLayer: 更新に失敗しました', error);
    });
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
   * 画像をそのまま描画します（座標変換なし）
   * @param img - 画像要素
   */
  private renderSimpleImage(img: HTMLImageElement): void {
    if (!this.element || !this.projection) return;

    const [west, south, east, north] = this.bounds;
    
    // bboxの各角を投影法で座標変換してログ出力
    const topLeft = this.projection([west, north]);
    const topRight = this.projection([east, north]);
    const bottomLeft = this.projection([west, south]);
    const bottomRight = this.projection([east, south]);
    
    console.log('=== RasterLayer bbox projection ===');
    console.log('Original bbox coordinates:');
    console.log('  West (left):', west);
    console.log('  South (bottom):', south);
    console.log('  East (right):', east);
    console.log('  North (top):', north);
    console.log('Original bbox:', { west, south, east, north });
    console.log('Image size:', { width: img.width, height: img.height });
    console.log('');
    console.log('Input coordinates for projection:');
    console.log('  Top-left input: [', west, ',', north, ']');
    console.log('  Top-right input: [', east, ',', north, ']');
    console.log('  Bottom-left input: [', west, ',', south, ']');
    console.log('  Bottom-right input: [', east, ',', south, ']');
    console.log('');
    console.log('Projected coordinates (output):');
    console.log('  Top-left (west, north):', topLeft);
    console.log('  Top-right (east, north):', topRight);
    console.log('  Bottom-left (west, south):', bottomLeft);
    console.log('  Bottom-right (east, south):', bottomRight);
    console.log('');
    
    // 投影法の詳細情報を出力
    console.log('Projection details:');
    console.log('  Projection function:', this.projection?.toString());
    if (this.projection && typeof this.projection.scale === 'function') {
      console.log('  Scale:', this.projection.scale());
    }
    if (this.projection && typeof this.projection.translate === 'function') {
      console.log('  Translate:', this.projection.translate());
    }
    
    if (!topLeft || !bottomRight) {
      console.warn('RasterLayer: 境界が投影範囲外です');
      return;
    }
    
    // 投影後の位置とサイズを計算
    const projectedX = topLeft[0];
    const projectedY = topLeft[1];
    const projectedWidth = Math.abs(bottomRight[0] - topLeft[0]);
    const projectedHeight = Math.abs(bottomRight[1] - topLeft[1]);
    
    console.log('Projected position (top-left):', { x: projectedX, y: projectedY });
    console.log('Projected size:', { width: projectedWidth, height: projectedHeight });
    console.log('Original image size:', { width: img.width, height: img.height });
    console.log('Size scaling factor:', { 
      x: projectedWidth / img.width, 
      y: projectedHeight / img.height 
    });
    
    const geoWidth = east - west;
    const geoHeight = north - south;
    console.log('Geographic size:', { width: geoWidth, height: geoHeight });
    console.log('Geographic aspect ratio:', geoWidth / geoHeight);
    console.log('Projected aspect ratio:', projectedWidth / projectedHeight);
    console.log('Image aspect ratio:', img.width / img.height);
    console.log('=====================================');

    // 投影後の位置と変換されたサイズで配置
    const selection = select(this.element as any) as Selection<SVGGElement, unknown, any, any>;
    this.imageElement = selection
      .append('image')
      .attr('x', projectedX)
      .attr('y', projectedY)
      .attr('width', projectedWidth)
      .attr('height', projectedHeight)
      .attr('href', img.src)
      .attr('preserveAspectRatio', 'none');

    // bbox の四隅にcircleを表示（オプション）
    if (this.showBboxMarkers) {
      this.addBboxMarkers(selection, [topLeft, topRight, bottomLeft, bottomRight]);
    }

    if (this.imageElement) {
      this.applyStyle(this.imageElement);
    }
  }

  /**
   * 画像を変換して描画します（その他の投影法用）
   * @param img - 画像要素
   */
  private async renderTransformedImage(img: HTMLImageElement): Promise<void> {
    if (!this.element || !this.projection) return;

    // 画像サイズチェック（1000×1000まで）
    if (img.width > 1000 || img.height > 1000) {
      throw new Error('RasterLayer: 投影変換を行う場合、画像サイズは1000×1000ピクセル以下にしてください');
    }

    const transformedDataUrl = await this.transformRasterImage(img);
    const transformedImg = await this.loadImage(transformedDataUrl);
    
    const selection = select(this.element as any) as Selection<SVGGElement, unknown, any, any>;
    this.imageElement = selection
      .append('image')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', transformedImg.width)
      .attr('height', transformedImg.height)
      .attr('href', transformedDataUrl)
      .attr('preserveAspectRatio', 'none');

    if (this.imageElement) {
      this.applyStyle(this.imageElement);
    }
  }

  /**
   * ラスター画像を投影変換します
   * @param img - 元画像
   * @returns 変換後の画像のData URL
   */
  private async transformRasterImage(img: HTMLImageElement): Promise<string> {
    if (!this.projection) throw new Error('投影法が設定されていません');

    const [west, south, east, north] = this.bounds;
    
    const srcCanvas = document.createElement('canvas');
    const srcCtx = srcCanvas.getContext('2d');
    if (!srcCtx) throw new Error('Canvas contextの取得に失敗しました');

    srcCanvas.width = img.width;
    srcCanvas.height = img.height;
    srcCtx.drawImage(img, 0, 0);
    
    const srcData = srcCtx.getImageData(0, 0, img.width, img.height);
    
    // 出力用Canvasのサイズを計算
    const testPoints = [
      [west, north], [east, north],
      [east, south], [west, south],
      [(west + east) / 2, north], [(west + east) / 2, south],
      [west, (north + south) / 2], [east, (north + south) / 2]
    ];
    
    const projectedPoints = testPoints
      .map(p => this.projection!(p as [number, number]))
      .filter(p => p !== null) as [number, number][];
    
    if (projectedPoints.length === 0) {
      throw new Error('RasterLayer: 画像が投影範囲外です');
    }
    
    const minX = Math.floor(Math.min(...projectedPoints.map(p => p[0])));
    const maxX = Math.ceil(Math.max(...projectedPoints.map(p => p[0])));
    const minY = Math.floor(Math.min(...projectedPoints.map(p => p[1])));
    const maxY = Math.ceil(Math.max(...projectedPoints.map(p => p[1])));
    
    const destCanvas = document.createElement('canvas');
    const destCtx = destCanvas.getContext('2d');
    if (!destCtx) throw new Error('Canvas contextの取得に失敗しました');

    destCanvas.width = maxX - minX;
    destCanvas.height = maxY - minY;
    
    const imageData = destCtx.createImageData(destCanvas.width, destCanvas.height);
    const destData = imageData.data;
    
    // 逆マッピング：出力画像の各ピクセルに対して元画像の対応するピクセルを探す
    for (let destY = 0; destY < destCanvas.height; destY++) {
      for (let destX = 0; destX < destCanvas.width; destX++) {
        const screenX = destX + minX;
        const screenY = destY + minY;
        
        const geoCoord = this.approximateInverseProjection(
          screenX, screenY, west, south, east, north
        );
        
        if (geoCoord) {
          const [lon, lat] = geoCoord;
          
          const srcX = Math.round((lon - west) / (east - west) * (img.width - 1));
          const srcY = Math.round((north - lat) / (north - south) * (img.height - 1));
          
          if (srcX >= 0 && srcX < img.width && srcY >= 0 && srcY < img.height) {
            const srcIndex = (srcY * img.width + srcX) * 4;
            const destIndex = (destY * destCanvas.width + destX) * 4;
            
            destData[destIndex] = srcData.data[srcIndex];
            destData[destIndex + 1] = srcData.data[srcIndex + 1];
            destData[destIndex + 2] = srcData.data[srcIndex + 2];
            destData[destIndex + 3] = srcData.data[srcIndex + 3];
          }
        }
      }
    }
    
    destCtx.putImageData(imageData, 0, 0);
    return destCanvas.toDataURL();
  }

  /**
   * 逆投影を近似的に計算します
   * @param screenX - 画面X座標
   * @param screenY - 画面Y座標
   * @param west - 西端の経度
   * @param south - 南端の緯度
   * @param east - 東端の経度
   * @param north - 北端の緯度
   * @returns 地理座標 [経度, 緯度] またはnull
   */
  private approximateInverseProjection(
    screenX: number, 
    screenY: number, 
    west: number, 
    south: number, 
    east: number, 
    north: number
  ): [number, number] | null {
    if (!this.projection) return null;

    let lonMin = west;
    let lonMax = east;
    let latMin = south;
    let latMax = north;
    
    const tolerance = 0.5;
    const maxIterations = 20;
    
    for (let i = 0; i < maxIterations; i++) {
      const lonMid = (lonMin + lonMax) / 2;
      const latMid = (latMin + latMax) / 2;
      
      const projected = this.projection([lonMid, latMid]);
      if (!projected) return null;
      
      const [projX, projY] = projected;
      
      if (Math.abs(projX - screenX) < tolerance && Math.abs(projY - screenY) < tolerance) {
        return [lonMid, latMid];
      }
      
      if (projX < screenX) {
        lonMin = lonMid;
      } else {
        lonMax = lonMid;
      }
      
      if (projY < screenY) {
        latMax = latMid;
      } else {
        latMin = latMid;
      }
    }
    
    return [(lonMin + lonMax) / 2, (latMin + latMax) / 2];
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

  /**
   * bboxマーカーの表示/非表示を切り替えます
   * @param show - 表示するかどうか
   */
  public setShowBboxMarkers(show: boolean): void {
    this.showBboxMarkers = show;
    if (this.element) {
      const selection = select(this.element);
      if (show) {
        // 再描画して表示
        this.update();
      } else {
        // マーカーのみ削除
        selection.selectAll('.bbox-marker').remove();
        selection.selectAll('.bbox-marker-label').remove();
      }
    }
  }

  /**
   * bboxマーカーが表示されているかを取得します
   * @returns マーカーが表示されている場合はtrue
   */
  public getShowBboxMarkers(): boolean {
    return this.showBboxMarkers;
  }

  /**
   * スタイルを適用します
   * @param element - 対象要素
   */
  private applyStyle(element: Selection<SVGImageElement, unknown, any, any>): void {
    if (this.style.opacity !== undefined) {
      element.attr('opacity', this.style.opacity as number);
    }
    if (this.style.filter) {
      element.attr('filter', this.style.filter as string);
    }
  }
}