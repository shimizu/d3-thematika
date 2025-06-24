import { Selection } from 'd3-selection';
import { geoPath, GeoPath, GeoProjection } from 'd3-geo';
import { geoInterpolate } from 'd3-geo';
import { BaseLayer } from './base-layer';
import { LayerStyle, ILineConnectionLayer, LineConnectionData } from '../types';

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
    this.renderLines();
  }

  /**
   * レイヤーを更新します
   */
  update(): void {
    if (this.layerGroup) {
      this.layerGroup.selectAll('path').remove();
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

    // 地理的な中点を計算
    const interpolator = geoInterpolate(start, end);
    const midGeo = interpolator(0.5);
    
    // 中点をピクセル座標に変換
    const midPoint = this.projection(midGeo);
    if (!midPoint) return '';

    // アークの高さを適用（中点から垂直方向にオフセット）
    const dx = endPoint[0] - startPoint[0];
    const dy = endPoint[1] - startPoint[1];
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // 垂直方向のオフセットを計算
    const offsetX = -dy / distance * this.arcHeight * distance;
    const offsetY = dx / distance * this.arcHeight * distance;
    
    const controlPoint: [number, number] = [
      midPoint[0] + offsetX,
      midPoint[1] + offsetY
    ];

    // 二次ベジェ曲線でアークを描画
    return `M${startPoint[0]},${startPoint[1]}Q${controlPoint[0]},${controlPoint[1]} ${endPoint[0]},${endPoint[1]}`;
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