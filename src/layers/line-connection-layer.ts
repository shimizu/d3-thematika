import { Selection } from 'd3-selection';
import { geoPath, GeoPath, GeoProjection } from 'd3-geo';
import { BaseLayer } from './base-layer';
import { LayerStyle, ILineConnectionLayer, ArcControlPointType, ArcOffsetType } from '../types';
import * as GeoJSON from 'geojson';

/**
 * LineConnectionLayerの初期化オプション
 */
export interface LineConnectionLayerOptions {
  /** GeoJSONデータ（LineString/MultiLineString） */
  data: GeoJSON.Feature | GeoJSON.Feature[] | GeoJSON.FeatureCollection;
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
 * 複数点間をラインで接続するレイヤークラス
 * LineString/MultiLineString形式のGeoJSONデータをサポート
 */
export class LineConnectionLayer extends BaseLayer implements ILineConnectionLayer {
  /** GeoJSONデータ */
  private data: GeoJSON.FeatureCollection;
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
    
    // データをFeatureCollectionに正規化
    if (Array.isArray(options.data)) {
      // Feature配列の場合
      this.data = { type: 'FeatureCollection', features: options.data };
    } else if (options.data.type === 'Feature') {
      // 単一Featureの場合
      this.data = { type: 'FeatureCollection', features: [options.data as GeoJSON.Feature] };
    } else {
      // FeatureCollectionの場合
      this.data = options.data as GeoJSON.FeatureCollection;
    }
    
    // データ検証
    this.validateData(this.data);
    
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
  private validateData(data: GeoJSON.FeatureCollection): void {
    if (!data || data.type !== 'FeatureCollection') {
      throw new Error('LineConnectionLayer: データはFeatureCollectionである必要があります');
    }

    if (!Array.isArray(data.features)) {
      throw new Error('LineConnectionLayer: featuresが配列ではありません');
    }

    data.features.forEach((feature, index) => {
      if (!feature.geometry) {
        throw new Error(`LineConnectionLayer: フィーチャー[${index}]にgeometryが存在しません`);
      }

      const geometry = feature.geometry as GeoJSON.LineString | GeoJSON.MultiLineString;
      const { type, coordinates } = geometry;
      
      if (type !== 'LineString' && type !== 'MultiLineString') {
        throw new Error(`LineConnectionLayer: フィーチャー[${index}]は'LineString'または'MultiLineString'である必要があります`);
      }

      // 座標の検証
      if (type === 'LineString') {
        this.validateCoordinates(coordinates as GeoJSON.Position[], index);
      } else if (type === 'MultiLineString') {
        (coordinates as GeoJSON.Position[][]).forEach((line, lineIndex) => {
          this.validateCoordinates(line, index, lineIndex);
        });
      }
    });
  }

  /**
   * 座標配列を検証します
   * @private
   */
  private validateCoordinates(coordinates: GeoJSON.Position[], featureIndex: number, lineIndex?: number): void {
    const lineId = lineIndex !== undefined ? `[${featureIndex}]のライン[${lineIndex}]` : `[${featureIndex}]`;
    
    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      throw new Error(`LineConnectionLayer: フィーチャー${lineId}は少なくとも2点の座標が必要です`);
    }

    coordinates.forEach((coord, coordIndex) => {
      if (!Array.isArray(coord) || coord.length < 2) {
        throw new Error(`LineConnectionLayer: フィーチャー${lineId}の座標[${coordIndex}]は[経度, 緯度]の配列である必要があります`);
      }

      const [lon, lat] = coord;
      if (lon < -180 || lon > 180) {
        throw new Error(`LineConnectionLayer: フィーチャー${lineId}の座標[${coordIndex}]の経度は-180から180の範囲である必要があります`);
      }

      if (lat < -90 || lat > 90) {
        throw new Error(`LineConnectionLayer: フィーチャー${lineId}の座標[${coordIndex}]の緯度は-90から90の範囲である必要があります`);
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
      this.layerGroup.selectAll('path').remove();
      this.layerGroup.selectAll('defs').remove();
      this.createArrowMarkers();
      this.renderLines();
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

    const lineGroup = this.layerGroup
      .append('g')
      .attr('class', 'cartography-line-connection-layer');

    // 各フィーチャーを処理
    this.data.features.forEach((feature, featureIndex) => {
      const geometry = feature.geometry;
      
      if (geometry.type === 'LineString') {
        this.renderLineString(
          lineGroup,
          geometry.coordinates as GeoJSON.Position[],
          feature,
          featureIndex
        );
      } else if (geometry.type === 'MultiLineString') {
        (geometry.coordinates as GeoJSON.Position[][]).forEach((line, lineIndex) => {
          this.renderLineString(
            lineGroup,
            line,
            feature,
            featureIndex,
            lineIndex
          );
        });
      }
    });
  }

  /**
   * LineStringをセグメントごとに描画します
   * @private
   */
  private renderLineString(
    container: Selection<SVGGElement, unknown, HTMLElement, any>,
    coordinates: GeoJSON.Position[],
    feature: GeoJSON.Feature,
    featureIndex: number,
    lineIndex?: number
  ): void {
    // 連続する2点ごとにセグメントを作成
    for (let i = 0; i < coordinates.length - 1; i++) {
      const segmentData = {
        start: coordinates[i],
        end: coordinates[i + 1],
        feature: feature,
        segmentIndex: i,
        isFirst: i === 0,
        isLast: i === coordinates.length - 2
      };

      const path = container
        .append('path')
        .datum(segmentData)
        .attr('d', d => this.generateSegmentPath(d.start as [number, number], d.end as [number, number]))
        .attr('class', () => {
          const baseClass = 'cartography-connection-line';
          const customClass = this.style.className || '';
          const dataClass = feature.properties?.class || '';
          const segmentClass = `segment-${i}`;
          const lineClass = lineIndex !== undefined ? `line-${lineIndex}` : '';
          return [baseClass, customClass, dataClass, segmentClass, lineClass].filter(Boolean).join(' ');
        })
        .style('fill', 'none')
        .style('cursor', 'pointer');

      // 矢印マーカーを適用
      const markerId = `arrow-${this.id}`;
      if (this.startArrow && segmentData.isFirst) {
        path.attr('marker-start', `url(#${markerId}-start)`);
      }
      if (this.endArrow && segmentData.isLast) {
        path.attr('marker-end', `url(#${markerId}-end)`);
      }

      // スタイル属性を適用
      super.applyStylesToElement(path, feature, featureIndex);
    }
  }


  /**
   * セグメントのパスを生成します
   * @param start - 開始点の地理座標
   * @param end - 終了点の地理座標
   * @returns SVGパス文字列
   * @private
   */
  private generateSegmentPath(start: [number, number], end: [number, number]): string {
    if (!this.projection) return '';

    const startPoint = this.projection(start);
    const endPoint = this.projection(end);

    if (!startPoint || !endPoint) return '';

    if (this.lineType === 'straight') {
      return `M${startPoint[0]},${startPoint[1]}L${endPoint[0]},${endPoint[1]}`;
    } else {
      return this.generateArcPath(start, end, startPoint, endPoint);
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
  on(eventType: string, handler: (event: Event, data: any) => void): void {
    if (this.layerGroup) {
      this.layerGroup.selectAll('path')
        .on(eventType, function(event, d: any) {
          // セグメントデータにfeature情報を含めて返す
          handler(event, {
            feature: d.feature,
            segmentIndex: d.segmentIndex,
            start: d.start,
            end: d.end,
            isFirst: d.isFirst,
            isLast: d.isLast
          });
        });
    }
  }

}