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
 * 背景ボックスのスタイル設定
 */
export interface LegendBackgroundStyle {
  /** 背景色 */
  fill?: string;
  /** 境界線の色 */
  stroke?: string;
  /** 境界線の幅 */
  strokeWidth?: number;
  /** 透明度 */
  opacity?: number;
  /** 角丸の半径 */
  rx?: number;
  /** 角丸の半径（Y方向） */
  ry?: number;
  /** パディング */
  padding?: number;
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
  /** アイテム間のスペース（ピクセル） */
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
  /** 背景ボックスを表示するか */
  showBackground?: boolean;
  /** 背景ボックスのスタイル */
  backgroundStyle?: LegendBackgroundStyle;
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
  /** 背景ボックスの表示/非表示 */
  private showBackground: boolean;
  /** 背景ボックスのスタイル */
  private backgroundStyle: LegendBackgroundStyle;

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
    this.showBackground = options.showBackground !== false; // デフォルトで有効
    this.backgroundStyle = {
      fill: '#ffffff',
      stroke: '#cccccc',
      strokeWidth: 1,
      opacity: 0.9,
      rx: 4,
      ry: 4,
      padding: 8,
      ...options.backgroundStyle
    };
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
   * 背景ボックスの表示状態を更新します
   * @param show - 表示するかどうか
   */
  updateBackgroundVisibility(show: boolean): void {
    this.showBackground = show;
    this.updateBackgroundOpacity();
  }

  /**
   * 背景ボックスのスタイルを更新します
   * @param style - 新しい背景スタイル
   */
  updateBackgroundStyle(style: Partial<LegendBackgroundStyle>): void {
    this.backgroundStyle = { ...this.backgroundStyle, ...style };
    this.updateBackgroundStyles();
  }

  /**
   * レイヤーを描画します
   * @param container - 描画先のSVGコンテナ
   */
  render(container: Selection<SVGGElement, unknown, HTMLElement, any>): void {
    this.parentContainer = container;
    this.layerGroup = this.createLayerGroup(container);
    
    this.renderLegend();
    this.renderBackground();
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
    this.renderBackground();
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
   * 値が色を表す文字列かどうかを判定します
   * @param value - 判定する値
   * @returns 色の場合true
   * @private
   */
  private isColorValue(value: any): boolean {
    if (typeof value !== 'string') return false;
    
    // 一般的な色のパターンをチェック
    // #RGB, #RRGGBB, #RRGGBBAA
    if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(value)) return true;
    // rgb(), rgba()
    if (/^rgba?\(/.test(value)) return true;
    // hsl(), hsla()
    if (/^hsla?\(/.test(value)) return true;
    // 名前付き色
    if (/^(red|green|blue|black|white|yellow|cyan|magenta|gray|grey|orange|purple|brown|pink)$/i.test(value)) return true;
    
    return false;
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
    
    // rangeが数値か色かを判定
    const isNumericRange = range.length > 0 && typeof range[0] === 'number';
    
    const legendData: LegendData = {
      data: range,
      labels: range.map((value: any) => {
        const extent = scale.invertExtent(value);
        if (extent[0] != null && extent[1] != null) {
          return `${extent[0]} - ${extent[1]}`;
        }
        return value.toString();
      }),
      colors: isNumericRange 
        ? range.map(() => '#0066cc') // 数値の場合はデフォルト色
        : range
    };
    
    // 数値rangeの場合はサイズデータとして追加
    if (isNumericRange) {
      legendData.sizes = range;
    }
    
    return legendData;
  }

  /**
   * 序数スケール用の凡例データを生成します
   * @returns 凡例データ
   * @private
   */
  private generateOrdinalLegend(): LegendData {
    const scale = this.scale as any;
    const domain = scale.domain();
    const range = scale.range();
    
    // rangeが数値か色かを判定
    const isNumericRange = range.length > 0 && typeof range[0] === 'number';
    
    const legendData: LegendData = {
      data: domain,
      labels: domain.map((d: any) => d.toString()),
      colors: isNumericRange
        ? domain.map(() => '#0066cc') // 数値の場合はデフォルト色
        : domain.map((d: any) => scale(d))
    };
    
    // 数値rangeの場合はサイズデータとして追加
    if (isNumericRange) {
      legendData.sizes = domain.map((d: any) => scale(d));
    }
    
    return legendData;
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
    
    // サイズスケールがある場合は使用、なければ固定サイズ
    const getSize = (d: any, i: number) => {
      if (this.sizeScale) {
        // インデックスを使用してサイズを取得
        const area = this.sizeScale(i);
        return Math.sqrt(area);
      } else if (legendData.sizes && legendData.sizes[i]) {
        // スケールのrangeが数値の場合
        return Math.sqrt(legendData.sizes[i]);
      } else {
        return this.symbolSize.fixed || 16;
      }
    };
    
    // サイズスケールが有効かどうかを判定
    const hasSizeVariation = this.sizeScale || (legendData.sizes && legendData.sizes.length > 0);
    const maxSize = hasSizeVariation ? Math.max(...legendData.data.map((d, i) => getSize(d, i))) : 0;
    
    // 色見本を描画
    items
      .append('rect')
      .attr('x', (d, i) => {
        // 縦方向かつサイズが可変の場合、中心を揃える
        if (this.orientation === 'vertical' && hasSizeVariation) {
          return (maxSize - getSize(d, i)) / 2;
        }
        return 0;
      })
      .attr('y', (d, i) => {
        // 縦方向かつサイズが可変の場合、中心を揃える
        if (this.orientation === 'vertical' && hasSizeVariation) {
          return (maxSize - getSize(d, i)) / 2;
        }
        return 0;
      })
      .attr('width', (d, i) => getSize(d, i))
      .attr('height', (d, i) => getSize(d, i))
      .attr('fill', (d, i) => legendData.colors[i])
      .attr('stroke', '#333')
      .attr('stroke-width', 0.5);
    
    // ラベルを描画
    items
      .append('text')
      .attr('x', (d, i) => {
        if (this.orientation === 'vertical' && hasSizeVariation) {
          return maxSize + 4;
        }
        return getSize(d, i) + 4;
      })
      .attr('y', (d, i) => {
        if (this.orientation === 'vertical' && hasSizeVariation) {
          return maxSize / 2;
        }
        return getSize(d, i) / 2;
      })
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
        // インデックスを使用してサイズを取得
        return this.sizeScale(i) / 2;
      } else if (legendData.sizes && legendData.sizes[i]) {
        // スケールのrangeが数値の場合
        return legendData.sizes[i] / 2;
      } else {
        return (this.symbolSize.fixed || 16) / 2;
      }
    };
    
    // サイズスケールが有効かどうかを判定
    const hasSizeVariation = this.sizeScale || (legendData.sizes && legendData.sizes.length > 0);
    const maxRadius = hasSizeVariation ? Math.max(...legendData.data.map((d, i) => getRadius(d, i))) : 0;
    
    // 円を描画
    items
      .append('circle')
      .attr('cx', (d, i) => {
        // 縦方向かつサイズが可変の場合、中心を揃える
        if (this.orientation === 'vertical' && hasSizeVariation) {
          return maxRadius;
        }
        return getRadius(d, i);
      })
      .attr('cy', (d, i) => {
        // 縦方向かつサイズが可変の場合、中心を揃える
        if (this.orientation === 'vertical' && hasSizeVariation) {
          return maxRadius;
        }
        return getRadius(d, i);
      })
      .attr('r', (d, i) => getRadius(d, i))
      .attr('fill', (d, i) => legendData.colors[i])
      .attr('stroke', '#333')
      .attr('stroke-width', 0.5);
    
    // ラベルを描画
    items
      .append('text')
      .attr('x', (d, i) => {
        if (this.orientation === 'vertical' && hasSizeVariation) {
          return maxRadius * 2 + 4;
        }
        return getRadius(d, i) * 2 + 4;
      })
      .attr('y', (d, i) => {
        if (this.orientation === 'vertical' && hasSizeVariation) {
          return maxRadius;
        }
        return getRadius(d, i);
      })
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
    
    // サイズスケールがある場合は線の太さに使用
    const getStrokeWidth = (d: any, i: number) => {
      if (this.sizeScale) {
        // インデックスを使用してサイズを取得
        return this.sizeScale(i);
      } else if (legendData.sizes && legendData.sizes[i]) {
        // スケールのrangeが数値の場合
        return legendData.sizes[i];
      } else {
        return 2; // デフォルトの線の太さ
      }
    };
    
    // サイズスケールが有効かどうかを判定
    const hasSizeVariation = this.sizeScale || (legendData.sizes && legendData.sizes.length > 0);
    const maxStrokeWidth = hasSizeVariation ? Math.max(...legendData.data.map((d, i) => getStrokeWidth(d, i))) : 0;
    
    // 線を描画
    const lineLength = this.symbolSize.fixed || 24;
    items
      .append('line')
      .attr('x1', 0)
      .attr('y1', (d, i) => {
        // 縦方向かつサイズが可変の場合、中心を揃える
        if (this.orientation === 'vertical' && hasSizeVariation) {
          return maxStrokeWidth / 2;
        }
        return 8;
      })
      .attr('x2', lineLength)
      .attr('y2', (d, i) => {
        // 縦方向かつサイズが可変の場合、中心を揃える
        if (this.orientation === 'vertical' && hasSizeVariation) {
          return maxStrokeWidth / 2;
        }
        return 8;
      })
      .attr('stroke', (d, i) => legendData.colors[i])
      .attr('stroke-width', (d, i) => getStrokeWidth(d, i));
    
    // ラベルを描画
    items
      .append('text')
      .attr('x', lineLength + 4)
      .attr('y', (d, i) => {
        if (this.orientation === 'vertical' && hasSizeVariation) {
          return maxStrokeWidth / 2;
        }
        return 8;
      })
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
      // 水平配置
      items.attr('transform', (d, i) => 
        `translate(${i * this.itemSpacing}, ${titleOffset})`
      );
    }
  }

  /**
   * 背景ボックスを描画します
   * @private
   */
  private renderBackground(): void {
    if (!this.layerGroup) return;

    // 凡例の境界ボックスを計算
    const legendBBox = this.calculateLegendBounds();
    const padding = this.backgroundStyle.padding || 8;

    // 背景の透明度を設定（showBackgroundがfalseの場合は0）
    const backgroundOpacity = this.showBackground 
      ? (this.backgroundStyle.opacity || 0.9) 
      : 0;

    // 背景矩形を最初に挿入（z-orderを背面にするため）
    const background = this.layerGroup
      .insert('rect', ':first-child')
      .attr('class', 'cartography-legend-background')
      .attr('x', legendBBox.x - padding)
      .attr('y', legendBBox.y - padding)
      .attr('width', legendBBox.width + padding * 2)
      .attr('height', legendBBox.height + padding * 2)
      .attr('fill', this.backgroundStyle.fill || '#ffffff')
      .attr('stroke', this.backgroundStyle.stroke || '#cccccc')
      .attr('stroke-width', this.backgroundStyle.strokeWidth || 1)
      .attr('opacity', backgroundOpacity);

    // 角丸を設定
    if (this.backgroundStyle.rx) {
      background.attr('rx', this.backgroundStyle.rx);
    }
    if (this.backgroundStyle.ry) {
      background.attr('ry', this.backgroundStyle.ry);
    }
  }

  /**
   * 凡例の境界ボックスを計算します
   * @returns 境界ボックス
   * @private
   */
  private calculateLegendBounds(): { x: number; y: number; width: number; height: number } {
    if (!this.layerGroup) {
      return { x: 0, y: 0, width: 100, height: 50 };
    }

    try {
      // レイヤーグループのboundingBoxを取得
      const bbox = (this.layerGroup.node() as SVGGElement).getBBox();
      return {
        x: bbox.x,
        y: bbox.y,
        width: bbox.width,
        height: bbox.height
      };
    } catch (error) {
      // フォールバック値
      const itemCount = this.generateLegendData().data.length;
      const titleHeight = this.title ? this.fontSize + 10 : 0;
      
      if (this.orientation === 'vertical') {
        return {
          x: 0,
          y: 0,
          width: 150,
          height: titleHeight + itemCount * this.itemSpacing
        };
      } else {
        return {
          x: 0,
          y: 0,
          width: itemCount * 100,
          height: titleHeight + 30
        };
      }
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
   * 背景ボックスの透明度のみを更新します
   * @private
   */
  private updateBackgroundOpacity(): void {
    if (!this.layerGroup) return;

    const background = this.layerGroup.select('.cartography-legend-background');
    if (!background.empty()) {
      const backgroundOpacity = this.showBackground 
        ? (this.backgroundStyle.opacity || 0.9) 
        : 0;
      
      background.attr('opacity', backgroundOpacity);
    }
  }

  /**
   * 背景ボックスのスタイルを更新します
   * @private
   */
  private updateBackgroundStyles(): void {
    if (!this.layerGroup) return;

    const background = this.layerGroup.select('.cartography-legend-background');
    if (!background.empty()) {
      const backgroundOpacity = this.showBackground 
        ? (this.backgroundStyle.opacity || 0.9) 
        : 0;

      background
        .attr('fill', this.backgroundStyle.fill || '#ffffff')
        .attr('stroke', this.backgroundStyle.stroke || '#cccccc')
        .attr('stroke-width', this.backgroundStyle.strokeWidth || 1)
        .attr('opacity', backgroundOpacity)
        .attr('rx', this.backgroundStyle.rx || null)
        .attr('ry', this.backgroundStyle.ry || null);
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