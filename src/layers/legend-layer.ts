import { Selection } from 'd3-selection';
import { drag } from 'd3-drag';
import { ScaleOrdinal, ScaleSequential, ScaleLinear, ScaleThreshold } from 'd3-scale';
import { BaseLayer } from './base-layer';
import { LayerStyle } from '../types';

/**
 * 凡例の位置設定
 */
export interface LegendPosition {
  /** 上からの位置（ピクセル） */
  top: number;
  /** 左からの位置（ピクセル） */
  left: number;
}

/**
 * 凡例データの統一インターフェース
 */
export interface LegendData {
  /** 表示する値の配列 */
  data: any[];
  /** ラベル文字列の配列 */
  labels: string[];
  /** 色の配列 */
  colors: string[];
  /** サイズの配列（オプション） */
  sizes?: number[];
}

/**
 * サポートするD3スケール型
 */
export type SupportedScale = 
  | ScaleOrdinal<any, string>
  | ScaleSequential<string>
  | ScaleLinear<number, string>
  | ScaleThreshold<number, string>
  | ScaleLinear<number, number>; // サイズスケール用

/**
 * 凡例の視覚表現タイプ
 */
export type LegendSymbolType = 'cell' | 'circle' | 'line' | 'gradient';

/**
 * シンボルのサイズ設定
 */
export interface SymbolSize {
  /** 最小サイズ（ピクセル） */
  min?: number;
  /** 最大サイズ（ピクセル） */
  max?: number;
  /** 固定サイズ（ピクセル） */
  fixed?: number;
}

/**
 * LegendLayerの初期化オプション
 */
export interface LegendLayerOptions {
  /** D3スケール関数 */
  scale: SupportedScale;
  /** 凡例の位置 */
  position: LegendPosition;
  /** 凡例のタイトル */
  title?: string;
  /** 配置の向き */
  orientation?: 'vertical' | 'horizontal';
  /** アイテム間のスペース */
  itemSpacing?: number;
  /** フォントサイズ */
  fontSize?: number;
  /** 凡例の幅 */
  width?: number;
  /** 凡例の高さ */
  height?: number;
  /** レイヤーのスタイル設定 */
  style?: LayerStyle;
  /** 凡例の視覚表現タイプ */
  symbolType?: LegendSymbolType;
  /** シンボルのサイズ設定 */
  symbolSize?: SymbolSize;
  /** サイズスケール（circleタイプ用） */
  sizeScale?: ScaleLinear<number, number>;
  /** グラデーションのステップ数（gradientタイプ用） */
  gradientSteps?: number;
  /** ドラッグ機能を有効にするか */
  enableDrag?: boolean;
}

/**
 * スケール型の判別結果
 */
type ScaleType = 'quantized' | 'continuous' | 'ordinal';

/**
 * D3スケールを受け取って地図に凡例を表示するレイヤークラス
 */
export class LegendLayer extends BaseLayer {
  /** D3スケール */
  private scale: SupportedScale;
  /** 凡例の位置 */
  private position: LegendPosition;
  /** 凡例のタイトル */
  private title?: string;
  /** 配置の向き */
  private orientation: 'vertical' | 'horizontal';
  /** アイテム間のスペース */
  private itemSpacing: number;
  /** フォントサイズ */
  private fontSize: number;
  /** 凡例の幅 */
  private width?: number;
  /** 凡例の高さ */
  private height?: number;
  /** レイヤーグループ */
  private layerGroup?: Selection<SVGGElement, unknown, HTMLElement, any>;
  /** 親コンテナの参照（リサイズ対応用） */
  private parentContainer?: Selection<SVGGElement, unknown, HTMLElement, any>;
  /** 凡例の視覚表現タイプ */
  private symbolType: LegendSymbolType;
  /** シンボルのサイズ設定 */
  private symbolSize: SymbolSize;
  /** サイズスケール */
  private sizeScale?: ScaleLinear<number, number>;
  /** グラデーションのステップ数 */
  private gradientSteps: number;
  /** ドラッグ機能の有効/無効 */
  private enableDrag: boolean;

  /**
   * LegendLayerを初期化します
   * @param options - レイヤーの設定オプション
   */
  constructor(options: LegendLayerOptions) {
    // 一意のIDを自動生成
    super(`legend-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, options.style || {});
    
    this.scale = options.scale;
    this.position = options.position;
    this.title = options.title;
    this.orientation = options.orientation || 'vertical';
    this.itemSpacing = options.itemSpacing || 20;
    this.fontSize = options.fontSize || 12;
    this.width = options.width;
    this.height = options.height;
    this.symbolType = options.symbolType || this.inferSymbolType();
    this.symbolSize = options.symbolSize || { fixed: 16 };
    this.sizeScale = options.sizeScale;
    this.gradientSteps = options.gradientSteps || 256;
    this.enableDrag = options.enableDrag !== false; // デフォルトで有効
  }

  /**
   * スケール型から適切なシンボルタイプを推論します
   * @returns 推論されたシンボルタイプ
   * @private
   */
  private inferSymbolType(): LegendSymbolType {
    const scaleType = this.detectScaleType();
    
    switch (scaleType) {
      case 'continuous':
        return 'gradient';
      case 'quantized':
      case 'ordinal':
      default:
        return 'cell';
    }
  }

  /**
   * スケールを更新します
   * @param newScale - 新しいスケール
   */
  updateScale(newScale: SupportedScale): void {
    this.scale = newScale;
    this.update();
  }

  /**
   * 位置を更新します
   * @param newPosition - 新しい位置
   */
  updatePosition(newPosition: LegendPosition): void {
    this.position = newPosition;
    this.updatePositionTransform();
  }

  /**
   * レイヤーを描画します
   * @param container - 描画先のSVGコンテナ
   */
  render(container: Selection<SVGGElement, unknown, HTMLElement, any>): void {
    this.parentContainer = container;
    this.layerGroup = this.createLayerGroup(container);
    
    this.renderLegend();
    this.updatePositionTransform();

    // ドラッグ機能を設定
    if (this.enableDrag) {
      this.setupDragBehavior();
    }

    // リサイズイベントの監視を設定
    this.setupResizeListener();
  }

  /**
   * レイヤーを更新します
   */
  update(): void {
    if (!this.layerGroup) return;
    
    // 既存の凡例要素をクリア
    this.layerGroup.selectAll('*').remove();
    
    // 凡例を再描画
    this.renderLegend();
  }

  /**
   * d3-legendの設計思想に基づいてスケール型を自動判別します
   * @returns スケール型
   * @private
   */
  private detectScaleType(): ScaleType {
    const scale = this.scale as any;
    
    // invertExtentメソッドがあるかチェック（量的スケール）
    if (typeof scale.invertExtent === 'function') {
      return 'quantized';
    }
    
    // ticksメソッドがあるかチェック（連続スケール）
    if (typeof scale.ticks === 'function') {
      return 'continuous';
    }
    
    // どちらもない場合は序数スケール
    return 'ordinal';
  }

  /**
   * スケール型に応じた凡例データを生成します
   * @returns 凡例データ
   * @private
   */
  private generateLegendData(): LegendData {
    const scaleType = this.detectScaleType();
    
    switch (scaleType) {
      case 'continuous':
        return this.generateContinuousLegend();
      case 'quantized':
        return this.generateQuantizedLegend();
      case 'ordinal':
        return this.generateOrdinalLegend();
      default:
        throw new Error(`Unsupported scale type: ${scaleType}`);
    }
  }

  /**
   * 連続スケール用の凡例データを生成します
   * @returns 凡例データ
   * @private
   */
  private generateContinuousLegend(): LegendData {
    const scale = this.scale as any;
    const domain = scale.domain();
    
    // ticksメソッドを使用して適切な刻み値を取得
    const ticks = scale.ticks ? scale.ticks(5) : domain;
    
    return {
      data: ticks,
      labels: ticks.map((d: any) => d.toString()),
      colors: ticks.map((d: any) => scale(d))
    };
  }

  /**
   * 量的スケール用の凡例データを生成します
   * @returns 凡例データ
   * @private
   */
  private generateQuantizedLegend(): LegendData {
    const scale = this.scale as any;
    const range = scale.range();
    
    return {
      data: range,
      labels: range.map((color: string) => {
        const extent = scale.invertExtent(color);
        if (extent[0] != null && extent[1] != null) {
          return `${extent[0]} - ${extent[1]}`;
        }
        return color;
      }),
      colors: range
    };
  }

  /**
   * 序数スケール用の凡例データを生成します
   * @returns 凡例データ
   * @private
   */
  private generateOrdinalLegend(): LegendData {
    const scale = this.scale as any;
    const domain = scale.domain();
    
    return {
      data: domain,
      labels: domain.map((d: any) => d.toString()),
      colors: domain.map((d: any) => scale(d))
    };
  }

  /**
   * 凡例を描画します
   * @private
   */
  private renderLegend(): void {
    if (!this.layerGroup) return;
    
    // タイトルを描画
    if (this.title) {
      this.renderTitle();
    }
    
    // シンボルタイプに応じて適切なレンダリング関数を呼び出す
    switch (this.symbolType) {
      case 'cell':
        this.renderCellLegend();
        break;
      case 'circle':
        this.renderCircleLegend();
        break;
      case 'line':
        this.renderLineLegend();
        break;
      case 'gradient':
        this.renderGradientLegend();
        break;
      default:
        throw new Error(`Unsupported symbol type: ${this.symbolType}`);
    }
  }

  /**
   * タイトルを描画します
   * @private
   */
  private renderTitle(): void {
    if (!this.layerGroup || !this.title) return;
    
    this.layerGroup
      .append('text')
      .attr('class', 'cartography-legend-title')
      .attr('x', 0)
      .attr('y', 0)
      .style('font-size', `${this.fontSize + 2}px`)
      .style('font-weight', 'bold')
      .style('fill', '#333')
      .text(this.title);
  }

  /**
   * セル（矩形）タイプの凡例を描画します
   * @private
   */
  private renderCellLegend(): void {
    if (!this.layerGroup) return;
    
    const legendData = this.generateLegendData();
    const titleOffset = this.title ? this.fontSize + 10 : 0;
    
    const items = this.layerGroup
      .selectAll('.cartography-legend-item')
      .data(legendData.data)
      .enter()
      .append('g')
      .attr('class', 'cartography-legend-item');
    
    // 色見本を描画
    const cellSize = this.symbolSize.fixed || 16;
    items
      .append('rect')
      .attr('width', cellSize)
      .attr('height', cellSize)
      .attr('fill', (d, i) => legendData.colors[i])
      .attr('stroke', '#333')
      .attr('stroke-width', 0.5);
    
    // ラベルを描画
    items
      .append('text')
      .attr('x', cellSize + 4)
      .attr('y', cellSize / 2)
      .attr('dy', '0.35em')
      .style('font-size', `${this.fontSize}px`)
      .style('fill', '#333')
      .text((d, i) => legendData.labels[i]);
    
    // 配置の設定
    this.positionItems(items, titleOffset);
  }

  /**
   * 円タイプの凡例を描画します
   * @private
   */
  private renderCircleLegend(): void {
    if (!this.layerGroup) return;
    
    const legendData = this.generateLegendData();
    const titleOffset = this.title ? this.fontSize + 10 : 0;
    
    const items = this.layerGroup
      .selectAll('.cartography-legend-item')
      .data(legendData.data)
      .enter()
      .append('g')
      .attr('class', 'cartography-legend-item');
    
    // サイズスケールがある場合は使用、なければ固定サイズ
    const getRadius = (d: any, i: number) => {
      if (this.sizeScale) {
        return this.sizeScale(d) / 2;
      } else if (legendData.sizes && legendData.sizes[i]) {
        return legendData.sizes[i] / 2;
      } else {
        return (this.symbolSize.fixed || 16) / 2;
      }
    };
    
    // 円を描画
    items
      .append('circle')
      .attr('cx', (d, i) => getRadius(d, i))
      .attr('cy', (d, i) => getRadius(d, i))
      .attr('r', (d, i) => getRadius(d, i))
      .attr('fill', (d, i) => legendData.colors[i])
      .attr('stroke', '#333')
      .attr('stroke-width', 0.5);
    
    // ラベルを描画
    items
      .append('text')
      .attr('x', (d, i) => getRadius(d, i) * 2 + 4)
      .attr('y', (d, i) => getRadius(d, i))
      .attr('dy', '0.35em')
      .style('font-size', `${this.fontSize}px`)
      .style('fill', '#333')
      .text((d, i) => legendData.labels[i]);
    
    // 配置の設定
    this.positionItems(items, titleOffset);
  }

  /**
   * 線タイプの凡例を描画します
   * @private
   */
  private renderLineLegend(): void {
    if (!this.layerGroup) return;
    
    const legendData = this.generateLegendData();
    const titleOffset = this.title ? this.fontSize + 10 : 0;
    
    const items = this.layerGroup
      .selectAll('.cartography-legend-item')
      .data(legendData.data)
      .enter()
      .append('g')
      .attr('class', 'cartography-legend-item');
    
    // 線を描画
    const lineLength = this.symbolSize.fixed || 24;
    items
      .append('line')
      .attr('x1', 0)
      .attr('y1', 8)
      .attr('x2', lineLength)
      .attr('y2', 8)
      .attr('stroke', (d, i) => legendData.colors[i])
      .attr('stroke-width', 2);
    
    // ラベルを描画
    items
      .append('text')
      .attr('x', lineLength + 4)
      .attr('y', 8)
      .attr('dy', '0.35em')
      .style('font-size', `${this.fontSize}px`)
      .style('fill', '#333')
      .text((d, i) => legendData.labels[i]);
    
    // 配置の設定
    this.positionItems(items, titleOffset);
  }

  /**
   * グラデーションタイプの凡例を描画します
   * @private
   */
  private renderGradientLegend(): void {
    if (!this.layerGroup) return;
    
    const scale = this.scale as any;
    const domain = scale.domain();
    
    // グラデーション定義を作成
    const gradientId = `gradient-${this.id}`;
    const defs = this.layerGroup.append('defs');
    const linearGradient = defs.append('linearGradient')
      .attr('id', gradientId)
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', this.orientation === 'horizontal' ? '100%' : '0%')
      .attr('y2', this.orientation === 'horizontal' ? '0%' : '100%');
    
    // グラデーションストップを追加
    const steps = this.gradientSteps;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const value = domain[0] + t * (domain[1] - domain[0]);
      linearGradient.append('stop')
        .attr('offset', `${t * 100}%`)
        .attr('stop-color', scale(value));
    }
    
    const titleOffset = this.title ? this.fontSize + 10 : 0;
    
    // グラデーションバーを描画
    const barWidth = this.width || 200;
    const barHeight = this.height || 20;
    this.layerGroup.append('rect')
      .attr('x', 0)
      .attr('y', titleOffset)
      .attr('width', this.orientation === 'horizontal' ? barWidth : barHeight)
      .attr('height', this.orientation === 'horizontal' ? barHeight : barWidth)
      .attr('fill', `url(#${gradientId})`)
      .attr('stroke', '#333')
      .attr('stroke-width', 0.5);
    
    // ラベルを描画
    const ticks = scale.ticks ? scale.ticks(5) : domain;
    const labelGroup = this.layerGroup.append('g')
      .attr('transform', `translate(0, ${titleOffset})`);
    
    ticks.forEach((tick: any, i: number) => {
      const position = (tick - domain[0]) / (domain[1] - domain[0]);
      labelGroup.append('text')
        .attr('x', this.orientation === 'horizontal' ? position * barWidth : barHeight + 4)
        .attr('y', this.orientation === 'horizontal' ? barHeight + 16 : position * barWidth)
        .attr('text-anchor', this.orientation === 'horizontal' ? 'middle' : 'start')
        .style('font-size', `${this.fontSize}px`)
        .style('fill', '#333')
        .text(tick.toString());
    });
  }

  /**
   * アイテムの配置を設定します
   * @param items - アイテムの選択セット
   * @param titleOffset - タイトルのオフセット
   * @private
   */
  private positionItems(
    items: Selection<SVGGElement, any, SVGGElement, any>,
    titleOffset: number
  ): void {
    if (this.orientation === 'vertical') {
      items.attr('transform', (d, i) => 
        `translate(0, ${titleOffset + i * this.itemSpacing})`
      );
    } else {
      // 水平配置（要改善）
      items.attr('transform', (d, i) => 
        `translate(${i * 100}, ${titleOffset})`
      );
    }
  }

  /**
   * 位置のtransformを更新します
   * @private
   */
  private updatePositionTransform(): void {
    if (!this.layerGroup) return;
    
    // 直接ピクセル値を使用
    const x = this.position.left;
    const y = this.position.top;
    
    this.layerGroup.attr('transform', `translate(${x}, ${y})`);
  }

  /**
   * ドラッグ動作を設定します
   * @private
   */
  private setupDragBehavior(): void {
    if (!this.layerGroup) return;

    const dragBehavior = drag<SVGGElement, unknown>()
      .on('start', () => {
        // ドラッグ開始時の処理
        if (this.layerGroup) {
          this.layerGroup.style('cursor', 'grabbing');
        }
      })
      .on('drag', (event) => {
        // ドラッグ中の処理
        this.position.left += event.dx;
        this.position.top += event.dy;
        this.updatePositionTransform();
        
        // スライダーがある場合は更新
        this.updateSliders();
      })
      .on('end', () => {
        // ドラッグ終了時の処理
        if (this.layerGroup) {
          this.layerGroup.style('cursor', 'grab');
        }
      });

    // ドラッグ動作をレイヤーグループに適用
    this.layerGroup
      .style('cursor', 'grab')
      .call(dragBehavior);
  }

  /**
   * スライダーの値を更新します（デモページ用）
   * @private
   */
  private updateSliders(): void {
    // ブラウザ環境でのみ実行
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const xSlider = document.getElementById('legend-x-slider') as HTMLInputElement;
      const ySlider = document.getElementById('legend-y-slider') as HTMLInputElement;
      const xValue = document.getElementById('legend-x-value');
      const yValue = document.getElementById('legend-y-value');

      if (xSlider && ySlider && xValue && yValue) {
        xSlider.value = this.position.left.toString();
        ySlider.value = this.position.top.toString();
        xValue.textContent = this.position.left.toString();
        yValue.textContent = this.position.top.toString();
      }
    }
  }

  /**
   * リサイズイベントの監視を設定します
   * @private
   */
  private setupResizeListener(): void {
    // ピクセル値を使用する場合、リサイズイベントの監視は不要
  }
}