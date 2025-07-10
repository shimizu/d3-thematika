import { Selection } from 'd3-selection';
import { geoPath, GeoPath, GeoProjection } from 'd3-geo';
import { line, curveBasis, curveCardinal, curveCatmullRom, curveLinear, curveMonotoneX, curveMonotoneY, curveNatural, curveStep, curveStepAfter, curveStepBefore } from 'd3-shape';
import { BaseLayer } from './base-layer';
import { LayerAttr, LayerStyle, IGeojsonLayer, ArcControlPointType, ArcOffsetType } from '../types';
import * as GeoJSON from 'geojson';

/**
 * LineTextLayerの初期化オプション
 */
export interface LineTextLayerOptions {
  /** GeoJSONデータ（LineString/MultiLineString） */
  data: GeoJSON.Feature | GeoJSON.Feature[] | GeoJSON.FeatureCollection;
  /** レイヤーの属性設定 */
  attr?: LayerAttr;
  /** レイヤーのCSS style属性設定 */
  style?: LayerStyle;
  
  // テキスト関連オプション
  /** テキストの内容を取得するプロパティ名（デフォルト: 'text'、次候補: 'name'） */
  textProperty?: string;
  /** フォントファミリー（デフォルト: "メイリオ, Meiryo, 'ＭＳ Ｐゴシック', MS Gothic, sans-serif"） */
  fontFamily?: string | ((feature: GeoJSON.Feature, index: number) => string);
  /** フォントサイズ（デフォルト: 16） */
  fontSize?: number | string | ((feature: GeoJSON.Feature, index: number) => number | string);
  /** フォントウェイト（デフォルト: "normal"） */
  fontWeight?: "normal" | "bold" | "bolder" | "lighter" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | "inherit" | ((feature: GeoJSON.Feature, index: number) => string);
  
  // textPath関連オプション
  /** テキストアンカー（デフォルト: "middle"） */
  textAnchor?: "start" | "middle" | "end" | "inherit";
  /** textPath使用時のstartOffset（デフォルト: "50%"） */
  startOffset?: string | number;
  
  // パス生成関連オプション（line-connection-layerと同じ）
  /** ライン描画タイプ（デフォルト: 'straight'） */
  lineType?: 'straight' | 'arc' | 'smooth';
  /** アーク描画時の高さ（デフォルト: 0.3） */
  arcHeight?: number;
  /** アーク制御点の位置（デフォルト: 'center'） */
  arcControlPoint?: ArcControlPointType;
  /** アークオフセットの方向（デフォルト: 'perpendicular'） */
  arcOffset?: ArcOffsetType;
  /** スムージング時のカーブタイプ（デフォルト: 'curveBasis'） */
  smoothType?: 'curveBasis' | 'curveCardinal' | 'curveCatmullRom' | 'curveLinear' | 'curveMonotoneX' | 'curveMonotoneY' | 'curveNatural' | 'curveStep' | 'curveStepAfter' | 'curveStepBefore';
  
  // デバッグ機能
  /** ガイドパスを表示するかどうか（デフォルト: false） */
  showGuidePath?: boolean;
  /** ガイドパスのスタイル設定 */
  guidePathStyle?: LayerAttr;
  
  // textPath制御
  /** パスに沿ってテキストを配置するかどうか（デフォルト: true） */
  followPath?: boolean;
}

/**
 * LineString/MultiLineString上にテキストを配置するレイヤークラス
 * textPathを使用してパス沿いにテキストを配置
 */
export class LineTextLayer extends BaseLayer implements IGeojsonLayer {
  /** GeoJSONデータ */
  private data: GeoJSON.FeatureCollection;
  /** パス生成器 */
  private path?: GeoPath;
  /** レイヤーグループ */
  private layerGroup?: Selection<SVGGElement, unknown, HTMLElement, any>;
  /** 投影法 */
  private projection?: GeoProjection;
  
  // テキスト関連プロパティ
  /** テキストプロパティ名 */
  private textProperty: string;
  /** フォントファミリー関数 */
  private fontFamilyFunction: (feature: GeoJSON.Feature, index: number) => string;
  /** フォントサイズ関数 */
  private fontSizeFunction: (feature: GeoJSON.Feature, index: number) => number | string;
  /** フォントウェイト関数 */
  private fontWeightFunction: (feature: GeoJSON.Feature, index: number) => string;
  /** テキストアンカー */
  private textAnchor: "start" | "middle" | "end" | "inherit";
  /** textPath用startOffset */
  private startOffset: string | number;
  
  // パス生成関連プロパティ
  /** ライン描画タイプ */
  private lineType: 'straight' | 'arc' | 'smooth';
  /** アーク描画時の高さ */
  private arcHeight: number;
  /** アーク制御点の位置 */
  private arcControlPoint: ArcControlPointType;
  /** アークオフセットの方向 */
  private arcOffset: ArcOffsetType;
  /** スムージング時のカーブタイプ */
  private smoothType: 'curveBasis' | 'curveCardinal' | 'curveCatmullRom' | 'curveLinear' | 'curveMonotoneX' | 'curveMonotoneY' | 'curveNatural' | 'curveStep' | 'curveStepAfter' | 'curveStepBefore';
  
  // デバッグ機能
  /** ガイドパス表示フラグ */
  private showGuidePath: boolean;
  /** ガイドパスのスタイル */
  private guidePathStyle: LayerAttr;
  
  // textPath制御
  /** パスに沿ってテキストを配置するかどうか */
  private followPath: boolean;

  /**
   * LineTextLayerを初期化します
   * @param options - レイヤーの設定オプション
   */
  constructor(options: LineTextLayerOptions) {
    // 一意のIDを自動生成
    super(`line-text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, options.attr || {}, options.style || {});
    
    // データをFeatureCollectionに正規化（line-connection-layerと同じロジック）
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
    
    // テキスト関連プロパティの初期化
    this.textProperty = options.textProperty || 'text';
    this.textAnchor = options.textAnchor || 'middle';
    this.startOffset = options.startOffset || '50%';
    
    // フォント設定の処理（point-text-layerと同じパターン）
    if (typeof options.fontFamily === 'function') {
      this.fontFamilyFunction = options.fontFamily;
    } else {
      const fontFamily = options.fontFamily || "メイリオ, Meiryo, 'ＭＳ Ｐゴシック', MS Gothic, sans-serif";
      this.fontFamilyFunction = () => fontFamily;
    }
    
    if (typeof options.fontSize === 'function') {
      this.fontSizeFunction = options.fontSize;
    } else {
      const fontSize = options.fontSize || 16;
      this.fontSizeFunction = () => fontSize;
    }
    
    if (typeof options.fontWeight === 'function') {
      this.fontWeightFunction = options.fontWeight;
    } else {
      const fontWeight = options.fontWeight || "normal";
      this.fontWeightFunction = () => fontWeight;
    }
    
    // パス生成関連プロパティの初期化（line-connection-layerと同じ）
    this.lineType = options.lineType || 'straight';
    this.arcHeight = options.arcHeight || 0.3;
    this.arcControlPoint = options.arcControlPoint || 'center';
    this.arcOffset = options.arcOffset || 'perpendicular';
    this.smoothType = options.smoothType || 'curveBasis';
    
    // デバッグ機能の初期化
    this.showGuidePath = options.showGuidePath || false;
    this.guidePathStyle = options.guidePathStyle || {
      fill: 'none',
      stroke: '#800080', // 紫色
      strokeWidth: 1,
      strokeDasharray: '5,5',
      opacity: 0.7
    };
    
    // textPath制御の初期化
    this.followPath = options.followPath !== undefined ? options.followPath : true;
  }

  /**
   * データを検証します（line-connection-layerと同じ）
   * @param data - 検証対象のデータ
   * @private
   */
  private validateData(data: GeoJSON.FeatureCollection): void {
    if (!data || data.type !== 'FeatureCollection') {
      throw new Error('LineTextLayer: データはFeatureCollectionである必要があります');
    }

    if (!Array.isArray(data.features)) {
      throw new Error('LineTextLayer: featuresが配列ではありません');
    }

    data.features.forEach((feature, index) => {
      if (!feature.geometry) {
        throw new Error(`LineTextLayer: フィーチャー[${index}]にgeometryが存在しません`);
      }

      const geometry = feature.geometry as GeoJSON.LineString | GeoJSON.MultiLineString;
      const { type, coordinates } = geometry;
      
      if (type !== 'LineString' && type !== 'MultiLineString') {
        throw new Error(`LineTextLayer: フィーチャー[${index}]は'LineString'または'MultiLineString'である必要があります`);
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
      throw new Error(`LineTextLayer: フィーチャー${lineId}は少なくとも2点の座標が必要です`);
    }

    coordinates.forEach((coord, coordIndex) => {
      if (!Array.isArray(coord) || coord.length < 2) {
        throw new Error(`LineTextLayer: フィーチャー${lineId}の座標[${coordIndex}]は[経度, 緯度]の配列である必要があります`);
      }

      const [lon, lat] = coord;
      if (lon < -180 || lon > 180) {
        throw new Error(`LineTextLayer: フィーチャー${lineId}の座標[${coordIndex}]の経度は-180から180の範囲である必要があります`);
      }

      if (lat < -90 || lat > 90) {
        throw new Error(`LineTextLayer: フィーチャー${lineId}の座標[${coordIndex}]の緯度は-90から90の範囲である必要があります`);
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
      this.layerGroup.selectAll('*').remove();
      this.render(this.layerGroup);
    }
  }

  /**
   * レイヤーを描画します
   * @param container - 描画先のSVGコンテナ
   */
  render(container: Selection<SVGGElement, unknown, HTMLElement, any>): void {
    this.layerGroup = this.createLayerGroup(container);
    
    if (!this.projection) {
      console.warn('LineTextLayer: 投影法が設定されていません');
      return;
    }
    
    // ガイドパスを描画（デバッグ機能）
    if (this.showGuidePath) {
      this.renderGuidePaths();
    }
    
    // フラグに応じてテキストを描画
    if (this.followPath) {
      this.renderTextPath();
    } else {
      this.renderSimpleText();
    }
  }

  /**
   * textPathを使用してテキストを描画します
   * @private
   */
  private renderTextPath(): void {
    if (!this.layerGroup || !this.projection) return;

    // defs要素を作成（パス定義用）
    const defs = this.layerGroup.append('defs');
    
    // テキストグループを作成
    const textGroup = this.layerGroup
      .append('g')
      .attr('class', 'thematika-line-text-layer');

    this.data.features.forEach((feature, featureIndex) => {
      // テキスト内容を取得
      let textContent = '';
      if (feature.properties) {
        textContent = feature.properties[this.textProperty] || feature.properties['name'] || '';
      }
      
      if (!textContent) return; // テキストが空の場合はスキップ
      
      const geometry = feature.geometry;
      
      if (geometry.type === 'LineString') {
        this.renderLineStringTextPath(
          defs,
          textGroup,
          geometry.coordinates as GeoJSON.Position[],
          feature,
          featureIndex,
          textContent
        );
      } else if (geometry.type === 'MultiLineString') {
        (geometry.coordinates as GeoJSON.Position[][]).forEach((line, lineIndex) => {
          this.renderLineStringTextPath(
            defs,
            textGroup,
            line,
            feature,
            featureIndex,
            textContent,
            lineIndex
          );
        });
      }
    });
  }

  /**
   * LineString用のtextPathを描画します
   * @private
   */
  private renderLineStringTextPath(
    defs: Selection<SVGDefsElement, unknown, HTMLElement, any>,
    textGroup: Selection<SVGGElement, unknown, HTMLElement, any>,
    coordinates: GeoJSON.Position[],
    feature: GeoJSON.Feature,
    featureIndex: number,
    textContent: string,
    lineIndex?: number
  ): void {
    if (!this.projection || coordinates.length < 2) return;

    // 一意のpath IDを生成
    const pathId = `line-text-path-${this.id}-${featureIndex}${lineIndex !== undefined ? `-${lineIndex}` : ''}`;
    
    // パス文字列を生成
    const pathString = this.generateLineStringPath(coordinates);
    
    if (!pathString) return;

    // path要素をdefsに追加
    defs.append('path')
      .attr('id', pathId)
      .attr('d', pathString)
      .attr('fill', 'none')
      .attr('stroke', 'none');

    // text要素を作成
    const textElement = textGroup
      .append('text')
      .attr('font-family', this.fontFamilyFunction(feature, featureIndex))
      .attr('font-size', this.fontSizeFunction(feature, featureIndex))
      .attr('font-weight', this.fontWeightFunction(feature, featureIndex))
      .attr('class', () => {
        const baseClass = 'thematika-line-text';
        const customClass = this.attr.className || '';
        const featureClass = (feature.properties?.class as string) || '';
        const lineClass = lineIndex !== undefined ? `line-${lineIndex}` : '';
        return [baseClass, customClass, featureClass, lineClass].filter(Boolean).join(' ');
      });

    // textPath要素を作成
    textElement
      .append('textPath')
      .attr('href', `#${pathId}`)
      .attr('startOffset', this.startOffset)
      .attr('text-anchor', this.textAnchor)
      .text(textContent);

    // 属性とスタイルを適用
    if (this.layerGroup) {
      this.applyAllStylesToElements(textElement, this.layerGroup);
    }
  }

  /**
   * デバッグ用ガイドパスを描画します
   * @private
   */
  private renderGuidePaths(): void {
    if (!this.layerGroup || !this.projection) return;

    // ガイドパス用のグループを作成（テキストレイヤーより下位に配置）
    const guideGroup = this.layerGroup
      .append('g')
      .attr('class', 'thematika-line-text-guide')
      .style('pointer-events', 'none'); // クリック無効

    // マーカー定義用のdefs要素を作成
    const defs = guideGroup.append('defs');
    
    // 開始点マーカーを定義
    const startMarkerId = `guide-start-${this.id}`;
    defs.append('marker')
      .attr('id', startMarkerId)
      .attr('viewBox', '0 0 10 10')
      .attr('refX', 5)
      .attr('refY', 5)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .append('circle')
      .attr('cx', 5)
      .attr('cy', 5)
      .attr('r', 3)
      .style('fill', '#00ff00') // 緑色
      .style('stroke', '#006600')
      .style('stroke-width', 1);

    // 終了点マーカーを定義
    const endMarkerId = `guide-end-${this.id}`;
    defs.append('marker')
      .attr('id', endMarkerId)
      .attr('viewBox', '0 0 10 10')
      .attr('refX', 5)
      .attr('refY', 5)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .append('circle')
      .attr('cx', 5)
      .attr('cy', 5)
      .attr('r', 3)
      .style('fill', '#ff0000') // 赤色
      .style('stroke', '#660000')
      .style('stroke-width', 1);

    this.data.features.forEach((feature, featureIndex) => {
      const geometry = feature.geometry;
      
      if (geometry.type === 'LineString') {
        this.renderGuideLineString(
          guideGroup,
          geometry.coordinates as GeoJSON.Position[],
          feature,
          featureIndex,
          startMarkerId,
          endMarkerId
        );
      } else if (geometry.type === 'MultiLineString') {
        (geometry.coordinates as GeoJSON.Position[][]).forEach((line, lineIndex) => {
          this.renderGuideLineString(
            guideGroup,
            line,
            feature,
            featureIndex,
            startMarkerId,
            endMarkerId,
            lineIndex
          );
        });
      }
    });
  }

  /**
   * 単一LineString用のガイドパスを描画します
   * @private
   */
  private renderGuideLineString(
    guideGroup: Selection<SVGGElement, unknown, HTMLElement, any>,
    coordinates: GeoJSON.Position[],
    feature: GeoJSON.Feature,
    featureIndex: number,
    startMarkerId: string,
    endMarkerId: string,
    lineIndex?: number
  ): void {
    if (!this.projection || coordinates.length < 2) return;

    // パス文字列を生成
    const pathString = this.generateLineStringPath(coordinates);
    
    if (!pathString) return;

    // ガイドパス要素を作成
    const guidePath = guideGroup
      .append('path')
      .attr('d', pathString)
      .attr('class', () => {
        const baseClass = 'thematika-line-text-guide-path';
        const featureClass = (feature.properties?.class as string) || '';
        const lineClass = lineIndex !== undefined ? `line-${lineIndex}` : '';
        return [baseClass, featureClass, lineClass].filter(Boolean).join(' ');
      })
      .attr('marker-start', `url(#${startMarkerId})`)
      .attr('marker-end', `url(#${endMarkerId})`);

    // ガイドパスのスタイルを適用
    Object.entries(this.guidePathStyle).forEach(([key, value]) => {
      if (key === 'className') return; // classNameは既に処理済み
      
      if (typeof value === 'function') {
        guidePath.attr(key, value(feature, featureIndex));
      } else {
        guidePath.attr(key, value);
      }
    });
  }

  /**
   * シンプルなテキスト（textPathを使わない）を描画します
   * @private
   */
  private renderSimpleText(): void {
    if (!this.layerGroup || !this.projection) return;
    
    // テキストグループを作成
    const textGroup = this.layerGroup
      .append('g')
      .attr('class', 'thematika-line-text-layer');

    this.data.features.forEach((feature, featureIndex) => {
      // テキスト内容を取得
      let textContent = '';
      if (feature.properties) {
        textContent = feature.properties[this.textProperty] || feature.properties['name'] || '';
      }
      
      if (!textContent) return; // テキストが空の場合はスキップ
      
      const geometry = feature.geometry;
      
      if (geometry.type === 'LineString') {
        this.renderLineStringSimpleText(
          textGroup,
          geometry.coordinates as GeoJSON.Position[],
          feature,
          featureIndex,
          textContent
        );
      } else if (geometry.type === 'MultiLineString') {
        (geometry.coordinates as GeoJSON.Position[][]).forEach((line, lineIndex) => {
          this.renderLineStringSimpleText(
            textGroup,
            line,
            feature,
            featureIndex,
            textContent,
            lineIndex
          );
        });
      }
    });
  }

  /**
   * LineString用のシンプルテキストを描画します
   * @private
   */
  private renderLineStringSimpleText(
    textGroup: Selection<SVGGElement, unknown, HTMLElement, any>,
    coordinates: GeoJSON.Position[],
    feature: GeoJSON.Feature,
    featureIndex: number,
    textContent: string,
    lineIndex?: number
  ): void {
    if (!this.projection || coordinates.length < 2) return;

    // ラインの中心点を計算
    const centerIndex = Math.floor(coordinates.length / 2);
    const centerCoord = coordinates[centerIndex];
    const centerPoint = this.projection(centerCoord as [number, number]);
    
    if (!centerPoint) return;

    // text要素を作成
    const textElement = textGroup
      .append('text')
      .attr('x', centerPoint[0])
      .attr('y', centerPoint[1])
      .attr('font-family', this.fontFamilyFunction(feature, featureIndex))
      .attr('font-size', this.fontSizeFunction(feature, featureIndex))
      .attr('font-weight', this.fontWeightFunction(feature, featureIndex))
      .attr('text-anchor', this.textAnchor)
      .attr('alignment-baseline', 'middle')
      .attr('class', () => {
        const baseClass = 'thematika-line-text';
        const customClass = this.attr.className || '';
        const featureClass = (feature.properties?.class as string) || '';
        const lineClass = lineIndex !== undefined ? `line-${lineIndex}` : '';
        return [baseClass, customClass, featureClass, lineClass].filter(Boolean).join(' ');
      })
      .text(textContent);

    // 属性とスタイルを適用
    if (this.layerGroup) {
      this.applyAllStylesToElements(textElement, this.layerGroup);
    }
  }

  /**
   * フィーチャーにイベントリスナーを追加します
   * @param eventType - イベントタイプ
   * @param handler - イベントハンドラー
   */
  on(eventType: string, handler: (event: Event, data: GeoJSON.Feature) => void): void {
    if (this.layerGroup) {
      this.layerGroup.selectAll('text')
        .on(eventType, function(event, d) {
          handler(event, d as GeoJSON.Feature);
        });
    }
  }

  /**
   * セグメントのパスを生成します（line-connection-layerから移植）
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
   * アークパスを生成します（line-connection-layerから移植）
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
   * アーク制御点の基準位置を計算します（line-connection-layerから移植）
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
   * 制御点にオフセットを適用します（line-connection-layerから移植）
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
   * 地理座標系でスムージングパスを生成します（line-connection-layerから移植）
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
   * 設定されたカーブタイプに応じたカーブ関数を取得します（line-connection-layerから移植）
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
   * LineString用のパス文字列を生成します
   * @private
   */
  private generateLineStringPath(coordinates: GeoJSON.Position[]): string {
    if (!this.projection || coordinates.length < 2) return '';

    if (this.lineType === 'smooth') {
      // スムージングの場合は全体を一つのパスとして生成
      return this.geoSmoothPath(coordinates);
    } else {
      // 直線・アークの場合はセグメントごとに生成して結合
      let pathString = '';
      for (let i = 0; i < coordinates.length - 1; i++) {
        const segmentPath = this.generateSegmentPath(
          coordinates[i] as [number, number],
          coordinates[i + 1] as [number, number]
        );
        if (i === 0) {
          pathString = segmentPath;
        } else {
          // 既存のパスに継続して追加（Mコマンドを削除してLまたはQから開始）
          const segmentWithoutMove = segmentPath.replace(/^M[^LQ]*/, '');
          pathString += segmentWithoutMove;
        }
      }
      return pathString;
    }
  }

  /**
   * GeoJSONデータを取得します
   * @returns GeoJSONデータ
   */
  getData(): GeoJSON.FeatureCollection {
    return this.data;
  }
}