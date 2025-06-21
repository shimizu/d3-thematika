import { Selection } from 'd3-selection';
import { ScaleOrdinal, ScaleSequential, ScaleLinear, ScaleThreshold } from 'd3-scale';
import { BaseLayer } from './base-layer';
import { LayerStyle } from '../types';

/**
 * 凡例の位置設定
 */
export interface LegendPosition {
  /** 上からの位置（パーセンテージ） */
  top: string;
  /** 左からの位置（パーセンテージ） */
  left: string;
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
}

/**
 * サポートするD3スケール型
 */
export type SupportedScale = 
  | ScaleOrdinal<any, string>
  | ScaleSequential<string>
  | ScaleLinear<number, string>
  | ScaleThreshold<number, string>;

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
    
    const legendData = this.generateLegendData();
    
    // タイトルを描画
    if (this.title) {
      this.renderTitle();
    }
    
    // 凡例アイテムを描画
    this.renderLegendItems(legendData);
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
   * 凡例アイテムを描画します
   * @param legendData - 凡例データ
   * @private
   */
  private renderLegendItems(legendData: LegendData): void {
    if (!this.layerGroup) return;
    
    const titleOffset = this.title ? this.fontSize + 10 : 0;
    
    const items = this.layerGroup
      .selectAll('.cartography-legend-item')
      .data(legendData.data)
      .enter()
      .append('g')
      .attr('class', 'cartography-legend-item');
    
    // 色見本を描画
    items
      .append('rect')
      .attr('width', 16)
      .attr('height', 16)
      .attr('fill', (d, i) => legendData.colors[i])
      .attr('stroke', '#333')
      .attr('stroke-width', 0.5);
    
    // ラベルを描画
    items
      .append('text')
      .attr('x', 20)
      .attr('y', 8)
      .attr('dy', '0.35em')
      .style('font-size', `${this.fontSize}px`)
      .style('fill', '#333')
      .text((d, i) => legendData.labels[i]);
    
    // 配置の設定
    if (this.orientation === 'vertical') {
      items.attr('transform', (d, i) => 
        `translate(0, ${titleOffset + i * this.itemSpacing})`
      );
    } else {
      // 水平配置は後で実装
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
    if (!this.layerGroup || !this.parentContainer) return;
    
    // 親コンテナのサイズを取得
    const containerNode = this.parentContainer.node();
    if (!containerNode) return;
    
    const containerBBox = containerNode as any;
    const containerWidth = containerBBox.clientWidth || 800; // デフォルト値
    const containerHeight = containerBBox.clientHeight || 600; // デフォルト値
    
    // パーセンテージを実際のピクセル値に変換
    const leftPercent = parseFloat(this.position.left.replace('%', ''));
    const topPercent = parseFloat(this.position.top.replace('%', ''));
    
    const x = (containerWidth * leftPercent) / 100;
    const y = (containerHeight * topPercent) / 100;
    
    this.layerGroup.attr('transform', `translate(${x}, ${y})`);
  }

  /**
   * リサイズイベントの監視を設定します
   * @private
   */
  private setupResizeListener(): void {
    // リサイズイベントの監視を設定
    // 実際の実装では、親コンテナまたはwindowのresizeイベントを監視
    window.addEventListener('resize', () => {
      this.updatePositionTransform();
    });
  }
}