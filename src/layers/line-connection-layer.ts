import { Selection, select as d3Select } from 'd3-selection';
import { geoPath, GeoPath, GeoProjection } from 'd3-geo';
import { path as d3Path } from 'd3-path';
import { line, curveBasis, curveCardinal, curveCatmullRom, curveLinear, curveMonotoneX, curveMonotoneY, curveNatural, curveStep, curveStepAfter, curveStepBefore } from 'd3-shape';
import { BaseLayer } from './base-layer';
import { LayerAttr, LayerStyle, ILineConnectionLayer, ArcControlPointType, ArcOffsetType } from '../types';
import * as GeoJSON from 'geojson';

/**
 * 統一されたラインデータ構造
 */
interface LineData {
  /** フィーチャー情報 */
  feature: GeoJSON.Feature;
  /** フィーチャーのインデックス（全体通し番号） */
  featureIndex: number;
  /** ライン座標配列 */
  coordinates: GeoJSON.Position[];
  /** MultiLineString内のラインインデックス（LineStringの場合は未定義） */
  lineIndex?: number;
  /** 生成されたSVGパスデータ */
  pathData: string;
  /** 開始矢印が必要かどうか */
  needsStartArrow: boolean;
  /** 終了矢印が必要かどうか */
  needsEndArrow: boolean;
}

/**
 * LineConnectionLayerの初期化オプション
 */
export interface LineConnectionLayerOptions {
  /** GeoJSONデータ（LineString/MultiLineString） */
  data: GeoJSON.Feature | GeoJSON.Feature[] | GeoJSON.FeatureCollection;
  /** レイヤーの属性設定 */
  attr?: LayerAttr;
  /** レイヤーのCSS style属性設定 */
  style?: LayerStyle;
  /** ライン描画タイプ（デフォルト: 'straight'） */
  lineType?: 'straight' | 'arc' | 'smooth';
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
  /** スムージング時のカーブタイプ（デフォルト: 'curveBasis'） */
  smoothType?: 'curveBasis' | 'curveCardinal' | 'curveCatmullRom' | 'curveLinear' | 'curveMonotoneX' | 'curveMonotoneY' | 'curveNatural' | 'curveStep' | 'curveStepAfter' | 'curveStepBefore';
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
  private lineType: 'straight' | 'arc' | 'smooth';
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
  /** スムージング時のカーブタイプ */
  private smoothType: 'curveBasis' | 'curveCardinal' | 'curveCatmullRom' | 'curveLinear' | 'curveMonotoneX' | 'curveMonotoneY' | 'curveNatural' | 'curveStep' | 'curveStepAfter' | 'curveStepBefore';
  /** 投影法 */
  private projection?: GeoProjection;
  /** マーカー定義を格納するdefs要素 */
  private defs?: Selection<SVGDefsElement, unknown, HTMLElement, any>;

  /**
   * LineConnectionLayerを初期化します
   * @param options - レイヤーの設定オプション
   */
  constructor(options: LineConnectionLayerOptions) {
    // 一意のIDを自動生成
    super(`line-connection-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, options.attr || {}, options.style || {});
    
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
    this.smoothType = options.smoothType || 'curveBasis';
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

    // defsを作成
    const defs = this.layerGroup.append('defs')
      .attr('class', 'thematika-line-connection-defs');

    // 基本的なマーカーを格納（後でdynamic markersが作成される）
    this.defs = defs;
  }

  /**
   * ライン描画を実行します（リファクタリング版：一括データバインディング）
   * @private
   */
  private renderLines(): void {
    if (!this.layerGroup || !this.path || !this.projection) return;

    const lineGroup = this.layerGroup
      .append('g')
      .attr('class', 'thematika-line-connection-layer');

    // 全ラインデータを準備
    const allLinesData = this.prepareAllLinesData();

    if (allLinesData.length === 0) return;

    // D3データバインディングで一括処理
    const paths = lineGroup
      .selectAll('.thematika-line-path')
      .data(allLinesData)
      .enter()
      .append('path')
      .attr('class', (d, i) => {
        const baseClass = 'thematika-line-path thematika-connection-line';
        const customClass = this.attr.className || '';
        const featureClass = d.feature.properties?.class || '';
        const lineClass = d.lineIndex !== undefined ? `line-${d.lineIndex}` : '';
        const globalLineClass = `global-line-${i}`;
        return [baseClass, customClass, featureClass, lineClass, globalLineClass].filter(Boolean).join(' ');
      })
      .attr('d', d => d.pathData)
      .style('fill', 'none');

    // 属性とスタイルを一括適用
    super.applyAllStylesToElements(paths, this.layerGroup!);

    // 矢印マーカーを適用（スタイル適用後）
    this.applyArrowMarkers(paths);
  }

  /**
   * 全フィーチャーから統一されたラインデータを準備します
   * @returns 統一されたラインデータの配列
   * @private
   */
  private prepareAllLinesData(): LineData[] {
    const allLinesData: LineData[] = [];

    this.data.features.forEach((feature, featureIndex) => {
      const geometry = feature.geometry;
      
      if (geometry.type === 'LineString') {
        const coordinates = geometry.coordinates as GeoJSON.Position[];
        const pathData = this.generateLinePath(coordinates);
        
        if (pathData) {
          allLinesData.push({
            feature,
            featureIndex,
            coordinates,
            pathData,
            needsStartArrow: this.startArrow,
            needsEndArrow: this.endArrow
          });
        }
      } else if (geometry.type === 'MultiLineString') {
        (geometry.coordinates as GeoJSON.Position[][]).forEach((line, lineIndex) => {
          const pathData = this.generateLinePath(line);
          
          if (pathData) {
            allLinesData.push({
              feature,
              featureIndex,
              coordinates: line,
              lineIndex,
              pathData,
              needsStartArrow: this.startArrow,
              needsEndArrow: this.endArrow
            });
          }
        });
      }
    });

    return allLinesData;
  }

  /**
   * パス要素に矢印マーカーを適用します
   * @param paths - パス要素のselection
   * @private
   */
  private applyArrowMarkers(paths: Selection<SVGPathElement, LineData, SVGGElement, unknown>): void {
    if (!this.defs) return;

    const self = this;
    
    paths.each(function(d, i) {
      const path = d3Select(this);
      
      // パスの現在のstroke色を取得
      const strokeColor = path.style('stroke') || path.attr('stroke') || '#333';
      
      if (d.needsStartArrow) {
        const startMarkerId = `arrow-start-${self.id}-${i}`;
        self.createDynamicMarker(startMarkerId, strokeColor, 'start');
        path.attr('marker-start', `url(#${startMarkerId})`);
      }
      
      if (d.needsEndArrow) {
        const endMarkerId = `arrow-end-${self.id}-${i}`;
        self.createDynamicMarker(endMarkerId, strokeColor, 'end');
        path.attr('marker-end', `url(#${endMarkerId})`);
      }
    });
  }

  /**
   * 動的に色付きマーカーを作成します
   * @param markerId - マーカーID
   * @param color - 矢印の色
   * @param type - マーカータイプ（start/end）
   * @private
   */
  private createDynamicMarker(markerId: string, color: string, type: 'start' | 'end'): void {
    if (!this.defs) return;

    // 既存のマーカーがあれば削除
    this.defs.select(`#${markerId}`).remove();

    const marker = this.defs.append('marker')
      .attr('id', markerId)
      .attr('viewBox', '0 0 10 10')
      .attr('markerWidth', this.arrowSize)
      .attr('markerHeight', this.arrowSize);

    if (type === 'start') {
      marker
        .attr('refX', 1)
        .attr('refY', 5)
        .attr('orient', 'auto-start-reverse');
    } else {
      marker
        .attr('refX', 9)
        .attr('refY', 5)
        .attr('orient', 'auto');
    }

    marker.append('path')
      .attr('d', 'M 0 0 L 10 5 L 0 10 z')
      .style('fill', color);
  }

  /**
   * LineStringをセグメントごとに描画します（旧実装 - 非推奨）
   * @deprecated 新しいrenderLines()メソッドで置き換えられました
   * @private
   */
  /*
  private renderLineString(
    container: Selection<SVGGElement, unknown, HTMLElement, any>,
    coordinates: GeoJSON.Position[],
    feature: GeoJSON.Feature,
    featureIndex: number,
    lineIndex?: number
  ): void {
    // この実装は新しいrenderLines()メソッドで置き換えられました
  }
  */


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
    } else if (this.lineType === 'arc') {
      return this.generateArcPath(start, end, startPoint, endPoint);
    } else if (this.lineType === 'smooth') {
      // スムージングの場合は単一セグメントでは意味がないので直線として処理
      return `M${startPoint[0]},${startPoint[1]}L${endPoint[0]},${endPoint[1]}`;
    } else {
      return `M${startPoint[0]},${startPoint[1]}L${endPoint[0]},${endPoint[1]}`;
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
   * スムージングでLineStringを描画します（旧実装 - 非推奨）
   * @deprecated 新しいrenderLines()メソッドで置き換えられました
   * @private
   */
  /*
  private renderSmoothLineString(
    container: Selection<SVGGElement, unknown, HTMLElement, any>,
    coordinates: GeoJSON.Position[],
    feature: GeoJSON.Feature,
    featureIndex: number,
    lineIndex?: number
  ): void {
    // この実装は新しいrenderLines()メソッドで置き換えられました
  }
  */

  /**
   * 地理座標系でスムージングパスを生成します
   * @private
   */
  private geoSmoothPath(coordinates: GeoJSON.Position[]): string {
    if (!this.projection) return '';

    // 地理座標をピクセル座標に変換
    const pixelCoordinates = coordinates
      .map(coord => this.projection!([coord[0], coord[1]]))
      .filter(coord => coord !== null) as [number, number][];

    if (pixelCoordinates.length < 2) return '';

    // カーブタイプに応じたカーブ関数を取得
    const curveFunction = this.getCurveFunction();

    // D3のlineジェネレーターを使用してスムージングパスを生成
    const lineGenerator = line<[number, number]>()
      .x(d => d[0])
      .y(d => d[1])
      .curve(curveFunction);

    return lineGenerator(pixelCoordinates) || '';
  }

  /**
   * 設定されたカーブタイプに応じたカーブ関数を取得します
   * @private
   */
  private getCurveFunction(): any {
    switch (this.smoothType) {
      case 'curveBasis':
        return curveBasis;
      case 'curveCardinal':
        return curveCardinal;
      case 'curveCatmullRom':
        return curveCatmullRom;
      case 'curveLinear':
        return curveLinear;
      case 'curveMonotoneX':
        return curveMonotoneX;
      case 'curveMonotoneY':
        return curveMonotoneY;
      case 'curveNatural':
        return curveNatural;
      case 'curveStep':
        return curveStep;
      case 'curveStepAfter':
        return curveStepAfter;
      case 'curveStepBefore':
        return curveStepBefore;
      default:
        return curveBasis;
    }
  }

  /**
   * ラインにイベントリスナーを追加します
   * @param eventType - イベントタイプ
   * @param handler - イベントハンドラー
   */
  on(eventType: string, handler: (event: Event, data: any) => void): void {
    if (this.layerGroup) {
      this.layerGroup.selectAll('.thematika-line-path')
        .on(eventType, function(event, d: any) {
          // 統一されたLineDataを直接渡す
          handler(event, {
            feature: d.feature,
            featureIndex: d.featureIndex,
            coordinates: d.coordinates,
            lineIndex: d.lineIndex
          });
        });
    }
  }

  /**
   * ライン座標から統一されたパス文字列を生成します
   * @param coordinates - ライン座標配列
   * @returns SVGパス文字列
   * @private
   */
  private generateLinePath(coordinates: GeoJSON.Position[]): string {
    if (!this.projection || coordinates.length < 2) return '';

    switch (this.lineType) {
      case 'straight':
        return this.generateStraightPath(coordinates);
      case 'arc':
        return this.generateArcLinePath(coordinates);
      case 'smooth':
        return this.generateSmoothPath(coordinates);
      default:
        return this.generateStraightPath(coordinates);
    }
  }

  /**
   * 直線パスを生成します
   * @param coordinates - ライン座標配列
   * @returns SVGパス文字列
   * @private
   */
  private generateStraightPath(coordinates: GeoJSON.Position[]): string {
    if (!this.projection) return '';

    const projectedPoints = coordinates
      .map(coord => this.projection!(coord as [number, number]))
      .filter(point => point !== null) as [number, number][];

    if (projectedPoints.length < 2) return '';

    let pathString = `M${projectedPoints[0][0]},${projectedPoints[0][1]}`;
    for (let i = 1; i < projectedPoints.length; i++) {
      pathString += `L${projectedPoints[i][0]},${projectedPoints[i][1]}`;
    }

    return pathString;
  }

  /**
   * アークパスを生成します（セグメント毎にアーク処理）
   * @param coordinates - ライン座標配列
   * @returns SVGパス文字列
   * @private
   */
  private generateArcLinePath(coordinates: GeoJSON.Position[]): string {
    if (!this.projection || coordinates.length < 2) return '';

    let pathString = '';
    for (let i = 0; i < coordinates.length - 1; i++) {
      const segmentPath = this.generateSegmentPath(
        coordinates[i] as [number, number],
        coordinates[i + 1] as [number, number]
      );
      
      if (i === 0) {
        pathString = segmentPath;
      } else {
        // 既存のパスに継続して追加（Mコマンドを削除してQから開始）
        const segmentWithoutMove = segmentPath.replace(/^M[^LQ]*/, '');
        pathString += segmentWithoutMove;
      }
    }

    return pathString;
  }

  /**
   * スムースパスを生成します
   * @param coordinates - ライン座標配列  
   * @returns SVGパス文字列
   * @private
   */
  private generateSmoothPath(coordinates: GeoJSON.Position[]): string {
    return this.geoSmoothPath(coordinates);
  }

  /**
   * GeoJSONデータを取得します
   * @returns GeoJSONデータ
   */
  getData(): GeoJSON.FeatureCollection {
    return this.data;
  }

}