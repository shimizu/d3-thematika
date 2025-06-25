import { Selection } from 'd3-selection';
import { geoPath, GeoPath, GeoProjection } from 'd3-geo';
import { geoInterpolate } from 'd3-geo';
import { BaseLayer } from './base-layer';
import { LayerStyle, ILineConnectionLayer, LineConnectionData, ArcControlPointType, ArcOffsetType } from '../types';

/**
 * LineConnectionLayerの初期化オプション
 */
export interface LineConnectionLayerOptions {
  /** ライン接続データ */
  data: LineConnectionData[];
  /** レイヤーのスタイル設定 */
  style?: LayerStyle;
  /** レイヤーの属性設定（styleのエイリアス） */
  attr?: LayerStyle;
  /** ライン描画タイプ（デフォルト: 'straight'） */
  lineType?: 'straight' | 'arc';
  /** アーク描画時の高さ（デフォルト: 0.3） */
  arcHeight?: number;
  /** アーク制御点の位置（デフォルト: 'center'） */
  arcControlPoint?: ArcControlPointType;
  /** アークオフセットの方向（デフォルト: 'perpendicular'） */
  arcOffset?: ArcOffsetType;
  /** 開始点に矢印を表示（デフォルト: false） */
  startArrow?: boolean;
  /** 終了点に矢印を表示（デフォルト: false） */
  endArrow?: boolean;
  /** 矢印のサイズ（デフォルト: 10） */
  arrowSize?: number;
}

/**
 * 2点間をラインで接続するレイヤークラス
 */
export class LineConnectionLayer extends BaseLayer implements ILineConnectionLayer {
  /** ライン接続データ */
  private data: LineConnectionData[];
  /** パス生成器 */
  private path?: GeoPath;
  /** レイヤーグループ */
  private layerGroup?: Selection<SVGGElement, unknown, HTMLElement, any>;
  /** ライン描画タイプ */
  private lineType: 'straight' | 'arc';
  /** アーク描画時の高さ */
  private arcHeight: number;
  /** アーク制御点の位置 */
  private arcControlPoint: ArcControlPointType;
  /** アークオフセットの方向 */
  private arcOffset: ArcOffsetType;
  /** 開始点に矢印を表示 */
  private startArrow: boolean;
  /** 終了点に矢印を表示 */
  private endArrow: boolean;
  /** 矢印のサイズ */
  private arrowSize: number;
  /** 投影法 */
  private projection?: GeoProjection;

  /**
   * LineConnectionLayerを初期化します
   * @param options - レイヤーの設定オプション
   */
  constructor(options: LineConnectionLayerOptions) {
    // 一意のIDを自動生成
    super(`line-connection-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, options.attr || options.style);
    
    // データ検証
    this.validateData(options.data);
    this.data = options.data;
    
    this.lineType = options.lineType || 'straight';
    this.arcHeight = options.arcHeight || 0.3;
    this.arcControlPoint = options.arcControlPoint || 'center';
    this.arcOffset = options.arcOffset || 'perpendicular';
    this.startArrow = options.startArrow || false;
    this.endArrow = options.endArrow || false;
    this.arrowSize = options.arrowSize || 10;
  }

  /**
   * データを検証します
   * @param data - 検証対象のデータ
   * @private
   */
  private validateData(data: LineConnectionData[]): void {
    if (!Array.isArray(data)) {
      throw new Error('LineConnectionLayer: データは配列である必要があります');
    }

    data.forEach((item, index) => {
      if (!item.start || !item.end) {
        throw new Error(`LineConnectionLayer: データ[${index}]にstartまたはendが存在しません`);
      }

      if (!Array.isArray(item.start) || item.start.length !== 2) {
        throw new Error(`LineConnectionLayer: データ[${index}].startは[経度, 緯度]の配列である必要があります`);
      }

      if (!Array.isArray(item.end) || item.end.length !== 2) {
        throw new Error(`LineConnectionLayer: データ[${index}].endは[経度, 緯度]の配列である必要があります`);
      }

      // 座標値の範囲チェック
      const [startLon, startLat] = item.start;
      const [endLon, endLat] = item.end;

      if (startLon < -180 || startLon > 180 || endLon < -180 || endLon > 180) {
        throw new Error(`LineConnectionLayer: データ[${index}]の経度は-180から180の範囲である必要があります`);
      }

      if (startLat < -90 || startLat > 90 || endLat < -90 || endLat > 90) {
        throw new Error(`LineConnectionLayer: データ[${index}]の緯度は-90から90の範囲である必要があります`);
      }
    });
  }

  /**
   * 投影法を設定します
   * @param projection - 地図投影法
   */
  setProjection(projection: GeoProjection): void {
    this.projection = projection;
    this.path = geoPath(projection);
    if (this.layerGroup) {
      this.update();
    }
  }

  /**
   * レイヤーを描画します
   * @param container - 描画先のSVGコンテナ
   */
  render(container: Selection<SVGGElement, unknown, HTMLElement, any>): void {
    this.layerGroup = this.createLayerGroup(container);
    this.createArrowMarkers();
    this.renderLines();
  }

  /**
   * レイヤーを更新します
   */
  update(): void {
    if (this.layerGroup) {
      this.layerGroup.selectAll('path').remove();
      this.layerGroup.selectAll('defs').remove();
      this.createArrowMarkers();
      this.renderLines();
    }
  }

  /**
   * データを更新します
   * @param data - 新しいライン接続データ
   */
  updateData(data: LineConnectionData[]): void {
    this.validateData(data);
    this.data = data;
    this.update();
  }

  /**
   * ライン描画タイプを更新します
   * @param lineType - ライン描画タイプ
   */
  updateLineType(lineType: 'straight' | 'arc'): void {
    this.lineType = lineType;
    this.update();
  }

  /**
   * アーク描画時の高さを更新します
   * @param height - アークの高さ（0-1の範囲推奨）
   */
  updateArcHeight(height: number): void {
    this.arcHeight = height;
    if (this.lineType === 'arc') {
      this.update();
    }
  }

  /**
   * アーク制御点の位置を更新します
   * @param controlPoint - アーク制御点の位置
   */
  updateArcControlPoint(controlPoint: ArcControlPointType): void {
    this.arcControlPoint = controlPoint;
    if (this.lineType === 'arc') {
      this.update();
    }
  }

  /**
   * アークオフセットの方向を更新します
   * @param offset - アークオフセットの方向
   */
  updateArcOffset(offset: ArcOffsetType): void {
    this.arcOffset = offset;
    if (this.lineType === 'arc') {
      this.update();
    }
  }

  /**
   * 開始点の矢印表示を更新します
   * @param show - 矢印を表示するかどうか
   */
  updateStartArrow(show: boolean): void {
    this.startArrow = show;
    this.update();
  }

  /**
   * 終了点の矢印表示を更新します
   * @param show - 矢印を表示するかどうか
   */
  updateEndArrow(show: boolean): void {
    this.endArrow = show;
    this.update();
  }

  /**
   * 矢印のサイズを更新します
   * @param size - 矢印のサイズ
   */
  updateArrowSize(size: number): void {
    this.arrowSize = size;
    if (this.startArrow || this.endArrow) {
      this.update();
    }
  }

  /**
   * 矢印のマーカーを作成します
   * @private
   */
  private createArrowMarkers(): void {
    if (!this.layerGroup || (!this.startArrow && !this.endArrow)) return;

    const markerId = `arrow-${this.id}`;
    
    
    // defsを作成
    const defs = this.layerGroup.append('defs')
      .attr('class', 'cartography-line-connection-defs');

    // 開始点用の矢印マーカー
    if (this.startArrow) {
      defs.append('marker')
        .attr('id', `${markerId}-start`)
        .attr('viewBox', '0 0 10 10')
        .attr('refX', 0)
        .attr('refY', 5)
        .attr('markerWidth', this.arrowSize / 2)
        .attr('markerHeight', this.arrowSize / 2)
        .attr('orient', 'auto-start-reverse')
        .append('path')
        .attr('d', 'M 0 0 L 10 5 L 0 10 z')
        .style('fill', (typeof this.style.stroke === 'function' ? '#333' : this.style.stroke) || '#333');
    }

    // 終了点用の矢印マーカー
    if (this.endArrow) {
      defs.append('marker')
        .attr('id', `${markerId}-end`)
        .attr('viewBox', '0 0 10 10')
        .attr('refX', 10)
        .attr('refY', 5)
        .attr('markerWidth', this.arrowSize / 2)
        .attr('markerHeight', this.arrowSize / 2)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M 0 0 L 10 5 L 0 10 z')
        .style('fill', (typeof this.style.stroke === 'function' ? '#333' : this.style.stroke) || '#333');
    }
  }

  /**
   * ラインを描画します
   * @private
   */
  private renderLines(): void {
    if (!this.layerGroup || !this.path || !this.projection) return;

    // ライン要素を作成
    const lines = this.layerGroup
      .append('g')
      .attr('class', 'cartography-line-connection-layer')
      .selectAll('path')
      .data(this.data)
      .enter()
      .append('path')
      .attr('d', (d, i) => this.generateLinePath(d, i))
      .attr('class', d => {
        const baseClass = 'cartography-connection-line';
        const customClass = this.style.className || '';
        const dataClass = d.properties?.class || '';
        return [baseClass, customClass, dataClass].filter(Boolean).join(' ');
      })
      .style('fill', 'none')
      .style('cursor', 'pointer');

    // 矢印マーカーを適用
    if (this.startArrow || this.endArrow) {
      const markerId = `arrow-${this.id}`;
      if (this.startArrow) {
        lines.attr('marker-start', `url(#${markerId}-start)`);
      }
      if (this.endArrow) {
        lines.attr('marker-end', `url(#${markerId}-end)`);
      }
    }

    // スタイル属性を適用
    this.applyStylesToElements(lines, this.layerGroup);
  }

  /**
   * ラインのパスを生成します
   * @param connection - ライン接続データ
   * @param index - データのインデックス
   * @returns SVGパス文字列
   * @private
   */
  private generateLinePath(connection: LineConnectionData, index: number): string {
    if (!this.projection) return '';

    const startPoint = this.projection(connection.start);
    const endPoint = this.projection(connection.end);

    if (!startPoint || !endPoint) return '';

    if (this.lineType === 'straight') {
      return `M${startPoint[0]},${startPoint[1]}L${endPoint[0]},${endPoint[1]}`;
    } else {
      return this.generateArcPath(connection.start, connection.end, startPoint, endPoint);
    }
  }

  /**
   * アークパスを生成します
   * @param start - 開始点の地理座標
   * @param end - 終了点の地理座標
   * @param startPoint - 開始点のピクセル座標
   * @param endPoint - 終了点のピクセル座標
   * @returns SVGパス文字列
   * @private
   */
  private generateArcPath(
    start: [number, number], 
    end: [number, number], 
    startPoint: [number, number], 
    endPoint: [number, number]
  ): string {
    if (!this.projection) return '';

    // 制御点の基準位置を計算
    const baseControlPoint = this.calculateBaseControlPoint(start, end, startPoint, endPoint);
    if (!baseControlPoint) return '';

    // オフセットを適用して最終的な制御点を計算
    const controlPoint = this.applyArcOffset(baseControlPoint, startPoint, endPoint);

    // 二次ベジェ曲線でアークを描画
    return `M${startPoint[0]},${startPoint[1]}Q${controlPoint[0]},${controlPoint[1]} ${endPoint[0]},${endPoint[1]}`;
  }

  /**
   * アーク制御点の基準位置を計算します
   * @private
   */
  private calculateBaseControlPoint(
    start: [number, number], 
    end: [number, number], 
    startPoint: [number, number], 
    endPoint: [number, number]
  ): [number, number] | null {
    if (!this.projection) return null;

    switch (this.arcControlPoint) {
      case 'center':
        // 単純な数学的中点（地理的要因を無視）
        const simpleMidGeo: [number, number] = [
          (start[0] + end[0]) / 2,
          (start[1] + end[1]) / 2
        ];
        return this.projection(simpleMidGeo);

      case 'weighted':
        // 2点間の重み付け中点（単純計算）
        const weight = 0.5; // TODO: 重みを設定可能にする
        const weightedGeo: [number, number] = [
          start[0] + (end[0] - start[0]) * weight,
          start[1] + (end[1] - start[1]) * weight
        ];
        return this.projection(weightedGeo);

      default:
        // 絶対座標で制御点を指定
        if (Array.isArray(this.arcControlPoint)) {
          return this.projection(this.arcControlPoint);
        }
        return null;
    }
  }

  /**
   * 制御点にオフセットを適用します
   * @private
   */
  private applyArcOffset(
    basePoint: [number, number], 
    startPoint: [number, number], 
    endPoint: [number, number]
  ): [number, number] {
    const dx = endPoint[0] - startPoint[0];
    const dy = endPoint[1] - startPoint[1];
    const distance = Math.sqrt(dx * dx + dy * dy);

    let offsetX = 0;
    let offsetY = 0;

    switch (this.arcOffset) {
      case 'perpendicular':
        // 垂直方向のオフセット（現在の実装）
        offsetX = -dy / distance * this.arcHeight * distance;
        offsetY = dx / distance * this.arcHeight * distance;
        break;

      case 'north':
        offsetY = -this.arcHeight * distance;
        break;

      case 'south':
        offsetY = this.arcHeight * distance;
        break;

      case 'east':
        offsetX = this.arcHeight * distance;
        break;

      case 'west':
        offsetX = -this.arcHeight * distance;
        break;

      default:
        // 相対座標でオフセットを指定
        if (Array.isArray(this.arcOffset)) {
          offsetX = this.arcOffset[0] * distance;
          offsetY = this.arcOffset[1] * distance;
        }
        break;
    }

    return [
      basePoint[0] + offsetX,
      basePoint[1] + offsetY
    ];
  }

  /**
   * ラインにイベントリスナーを追加します
   * @param eventType - イベントタイプ
   * @param handler - イベントハンドラー
   */
  on(eventType: string, handler: (event: Event, data: LineConnectionData) => void): void {
    if (this.layerGroup) {
      this.layerGroup.selectAll('path')
        .on(eventType, function(event, d) {
          handler(event, d as LineConnectionData);
        });
    }
  }

  /**
   * レイヤーのスタイルを更新します
   * @protected
   */
  protected updateLayerStyle(): void {
    if (!this.layerGroup) return;
    
    const paths = this.layerGroup.selectAll('path');
    if (!paths.empty()) {
      this.applyStylesToElements(paths, this.layerGroup);
    }
  }
}