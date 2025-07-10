import { Selection } from 'd3-selection';
import { GeoProjection } from 'd3-geo';
import { line, curveBasis, curveCardinal, curveCatmullRom, curveLinear, curveMonotoneX, curveMonotoneY, curveNatural, curveStep, curveStepAfter, curveStepBefore } from 'd3-shape';
import { BaseLayer } from './base-layer';
import { LayerAttr, LayerStyle, IGeojsonLayer } from '../types';
import * as turf from '@turf/turf';

/**
 * テキストの位置指定タイプ
 */
export type TextPositionType = 
  | 'start'           // ライン開始点
  | 'middle'          // ライン中点
  | 'end'             // ライン終了点
  | number;           // 距離（0-1のパーセンテージ、または実距離）

/**
 * テキストの配置方向
 */
export type TextPlacementType = 
  | 'along'           // ライン沿い（回転あり）
  | 'horizontal'      // 水平（回転なし）
  | 'perpendicular';  // 垂直（90度回転）

/**
 * LineTextLayerの初期化オプション
 */
export interface LineTextLayerOptions {
  /** GeoJSONデータ（LineString/MultiLineString） */
  data: GeoJSON.FeatureCollection | GeoJSON.Feature[];
  /** レイヤーの属性設定 */
  attr?: LayerAttr;
  /** レイヤーのCSS style属性設定 */
  style?: LayerStyle;
  /** テキストの内容を取得するプロパティ名（デフォルト: 'text'、次候補: 'name'） */
  textProperty?: string;
  /** テキストの位置（デフォルト: 'middle'） */
  position?: TextPositionType;
  /** テキストの配置方向（デフォルト: 'along'） */
  placement?: TextPlacementType;
  /** パーセンテージベースかどうか（デフォルト: true） */
  usePercentage?: boolean;
  /** X方向のオフセット（デフォルト: 0） */
  dx?: number | ((feature: GeoJSON.Feature, index: number) => number);
  /** Y方向のオフセット（デフォルト: 0） */
  dy?: number | ((feature: GeoJSON.Feature, index: number) => number);
  /** 追加の回転角度（デフォルト: 0） */
  rotate?: number | ((feature: GeoJSON.Feature, index: number) => number);
  /** テキストの長さ調整（デフォルト: "spacing"） */
  lengthAdjust?: "spacing" | "spacingAndGlyphs";
  /** ベースラインの位置（デフォルト: "middle"） */
  alignmentBaseline?: "auto" | "baseline" | "before-edge" | "text-before-edge" | "middle" | "central" | "after-edge" | "text-after-edge" | "ideographic" | "alphabetic" | "hanging" | "mathematical" | "inherit";
  /** テキストアンカー（デフォルト: "middle"） */
  textAnchor?: "start" | "middle" | "end" | "inherit";
  /** フォントファミリー（デフォルト: "メイリオ, Meiryo, 'ＭＳ Ｐゴシック', MS Gothic, sans-serif"） */
  fontFamily?: string | ((feature: GeoJSON.Feature, index: number) => string);
  /** フォントサイズ（デフォルト: 16） */
  fontSize?: number | string | ((feature: GeoJSON.Feature, index: number) => number | string);
  /** フォントウェイト（デフォルト: "normal"） */
  fontWeight?: "normal" | "bold" | "bolder" | "lighter" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | "inherit" | ((feature: GeoJSON.Feature, index: number) => string);
  /** 複数のテキストを配置する場合の位置配列 */
  multiplePositions?: TextPositionType[];
  /** ライン描画タイプ（デフォルト: 'straight'） */
  lineType?: 'straight' | 'smooth';
  /** スムージング時のカーブタイプ（デフォルト: 'curveBasis'） */
  smoothType?: 'curveBasis' | 'curveCardinal' | 'curveCatmullRom' | 'curveLinear' | 'curveMonotoneX' | 'curveMonotoneY' | 'curveNatural' | 'curveStep' | 'curveStepAfter' | 'curveStepBefore';
  /** スムージングしたラインも描画するかどうか（デフォルト: false） */
  showSmoothLine?: boolean;
  /** スムージングラインのスタイル設定 */
  smoothLineStyle?: LayerAttr;
  /** テキスト表示方式（デフォルト: 'positioned'） */
  textMode?: 'positioned' | 'textPath';
  /** textPath使用時のstartOffset（デフォルト: '50%'） */
  startOffset?: string | number;
}

/**
 * LineString/MultiLineString上にテキストを配置するレイヤークラス
 */
export class LineTextLayer extends BaseLayer implements IGeojsonLayer {
  /** GeoJSONデータ */
  private data: GeoJSON.FeatureCollection;
  /** 投影法 */
  private projection?: GeoProjection;
  /** レイヤーグループ */
  private layerGroup?: Selection<SVGGElement, unknown, HTMLElement, any>;
  /** テキストプロパティ名 */
  private textProperty: string;
  /** テキストの位置 */
  private position: TextPositionType;
  /** テキストの配置方向 */
  private placement: TextPlacementType;
  /** パーセンテージベースかどうか */
  private usePercentage: boolean;
  /** X方向オフセット関数 */
  private dxFunction: (feature: GeoJSON.Feature, index: number) => number;
  /** Y方向オフセット関数 */
  private dyFunction: (feature: GeoJSON.Feature, index: number) => number;
  /** 追加回転角度関数 */
  private rotateFunction: (feature: GeoJSON.Feature, index: number) => number;
  /** テキスト長さ調整 */
  private lengthAdjust: "spacing" | "spacingAndGlyphs";
  /** ベースライン位置 */
  private alignmentBaseline: string;
  /** テキストアンカー */
  private textAnchor: "start" | "middle" | "end" | "inherit";
  /** フォントファミリー関数 */
  private fontFamilyFunction: (feature: GeoJSON.Feature, index: number) => string;
  /** フォントサイズ関数 */
  private fontSizeFunction: (feature: GeoJSON.Feature, index: number) => number | string;
  /** フォントウェイト関数 */
  private fontWeightFunction: (feature: GeoJSON.Feature, index: number) => string;
  /** 複数のテキスト位置 */
  private multiplePositions?: TextPositionType[];
  /** ライン描画タイプ */
  private lineType: 'straight' | 'smooth';
  /** スムージング時のカーブタイプ */
  private smoothType: 'curveBasis' | 'curveCardinal' | 'curveCatmullRom' | 'curveLinear' | 'curveMonotoneX' | 'curveMonotoneY' | 'curveNatural' | 'curveStep' | 'curveStepAfter' | 'curveStepBefore';
  /** スムージングしたラインも描画するかどうか */
  private showSmoothLine: boolean;
  /** スムージングラインのスタイル設定 */
  private smoothLineStyle: LayerAttr;
  /** テキスト表示方式 */
  private textMode: 'positioned' | 'textPath';
  /** textPath使用時のstartOffset */
  private startOffset: string | number;

  /**
   * LineTextLayerを初期化します
   * @param options - レイヤーの設定オプション
   */
  constructor(options: LineTextLayerOptions) {
    // 一意のIDを自動生成
    super(`line-text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, options.attr || {}, options.style || {});
    
    // データの正規化
    this.data = Array.isArray(options.data)
      ? { type: 'FeatureCollection', features: options.data }
      : options.data as GeoJSON.FeatureCollection;
    
    // データ検証
    this.validateData(this.data);
    
    // 基本設定
    this.textProperty = options.textProperty || 'text';
    this.position = options.position || 'middle';
    this.placement = options.placement || 'along';
    this.usePercentage = options.usePercentage !== false;
    this.multiplePositions = options.multiplePositions;
    
    // オフセット設定の処理
    if (typeof options.dx === 'function') {
      this.dxFunction = options.dx;
    } else {
      const dx = options.dx || 0;
      this.dxFunction = () => dx;
    }
    
    if (typeof options.dy === 'function') {
      this.dyFunction = options.dy;
    } else {
      const dy = options.dy || 0;
      this.dyFunction = () => dy;
    }
    
    // 回転設定の処理
    if (typeof options.rotate === 'function') {
      this.rotateFunction = options.rotate;
    } else {
      const rotate = options.rotate || 0;
      this.rotateFunction = () => rotate;
    }
    
    // テキスト調整設定
    this.lengthAdjust = options.lengthAdjust || "spacing";
    this.alignmentBaseline = options.alignmentBaseline || "middle";
    this.textAnchor = options.textAnchor || "middle";
    
    // フォント設定の処理
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
    
    // スムージング設定
    this.lineType = options.lineType || 'straight';
    this.smoothType = options.smoothType || 'curveBasis';
    this.showSmoothLine = options.showSmoothLine || false;
    this.smoothLineStyle = options.smoothLineStyle || {
      fill: 'none',
      stroke: '#999',
      strokeWidth: 1,
      opacity: 0.7
    };
    
    // textPath設定
    this.textMode = options.textMode || 'positioned';
    this.startOffset = options.startOffset || '50%';
  }

  /**
   * データを検証します
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

      const geometry = feature.geometry;
      if (geometry.type !== 'LineString' && geometry.type !== 'MultiLineString') {
        throw new Error(`LineTextLayer: フィーチャー[${index}]は'LineString'または'MultiLineString'である必要があります`);
      }
    });
  }

  /**
   * レイヤーを描画します
   * @param container - 描画先のSVGコンテナ
   */
  render(container: Selection<SVGGElement, unknown, HTMLElement, any>): void {
    this.layerGroup = this.createLayerGroup(container);
    this.renderTexts();
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
   * 投影法を設定します
   * @param projection - 新しい投影法
   */
  setProjection(projection: GeoProjection): void {
    this.projection = projection;
    // 投影法が変更されたら再描画
    if (this.layerGroup) {
      this.renderTexts();
    }
  }

  /**
   * テキストを描画します
   * @private
   */
  private renderTexts(): void {
    if (!this.layerGroup || !this.projection) return;

    // 既存のテキストとラインを削除
    this.layerGroup.selectAll('g.thematika-line-text-layer').remove();
    this.layerGroup.selectAll('g.thematika-smooth-line-layer').remove();
    this.layerGroup.selectAll('defs').remove();

    // スムージングラインを描画（オプション）
    if (this.showSmoothLine && this.lineType === 'smooth') {
      this.renderSmoothLines();
    }

    // テキスト表示方式に応じて分岐
    if (this.textMode === 'textPath') {
      this.renderTextPath();
    } else {
      this.renderPositionedText();
    }
  }

  /**
   * textPathを使用してテキストを描画します
   * @private
   */
  private renderTextPath(): void {
    if (!this.layerGroup || !this.projection) return;

    // defs要素を作成
    const defs = this.layerGroup.append('defs');
    
    // テキストグループを作成
    const textGroup = this.layerGroup
      .append('g')
      .attr('class', 'thematika-line-text-layer');

    this.data.features.forEach((feature, featureIndex) => {
      // テキスト内容を取得
      let text = '';
      if (feature.properties) {
        text = feature.properties[this.textProperty] || feature.properties['name'] || '';
      }
      
      if (!text) return; // テキストが空の場合はスキップ
      
      const geometry = feature.geometry;
      
      if (geometry.type === 'LineString') {
        this.renderLineStringTextPath(
          defs,
          textGroup,
          geometry.coordinates as GeoJSON.Position[],
          feature,
          featureIndex,
          text
        );
      } else if (geometry.type === 'MultiLineString') {
        (geometry.coordinates as GeoJSON.Position[][]).forEach((line, lineIndex) => {
          this.renderLineStringTextPath(
            defs,
            textGroup,
            line,
            feature,
            featureIndex,
            text,
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
    text: string,
    lineIndex?: number
  ): void {
    if (!this.projection || coordinates.length < 2) return;

    // 一意のpath IDを生成
    const pathId = `line-text-path-${this.id}-${featureIndex}${lineIndex !== undefined ? `-${lineIndex}` : ''}`;
    
    // パス文字列を生成
    const pathString = this.generatePathString(coordinates);
    
    if (!pathString) return;

    // path要素をdefsに追加
    defs.append('path')
      .attr('id', pathId)
      .attr('d', pathString)
      .attr('fill', 'none')
      .attr('stroke', 'none');

    // 使用する位置配列を決定
    const positions = this.multiplePositions || [this.position];
    
    positions.forEach((position, positionIndex) => {
      // textPath用のstartOffsetを計算
      let startOffset: string;
      if (position === 'start') {
        startOffset = '0%';
      } else if (position === 'middle') {
        startOffset = '50%';
      } else if (position === 'end') {
        startOffset = '100%';
      } else if (typeof position === 'number') {
        startOffset = `${position * 100}%`;
      } else {
        startOffset = typeof this.startOffset === 'string' ? this.startOffset : `${this.startOffset}%`;
      }

      // text要素を作成
      const textElement = textGroup
        .append('text')
        .attr('lengthAdjust', this.lengthAdjust)
        .attr('font-family', this.fontFamilyFunction(feature, featureIndex))
        .attr('font-size', this.fontSizeFunction(feature, featureIndex))
        .attr('font-weight', this.fontWeightFunction(feature, featureIndex))
        .attr('class', () => {
          const baseClass = 'thematika-line-text';
          const customClass = this.attr.className || '';
          const featureClass = (feature.properties?.class as string) || '';
          return [baseClass, customClass, featureClass].filter(Boolean).join(' ');
        });

      // textPath要素を作成
      textElement
        .append('textPath')
        .attr('href', `#${pathId}`)
        .attr('startOffset', startOffset)
        .attr('text-anchor', this.textAnchor)
        .text(text);

      // 属性とスタイルを適用
      if (this.layerGroup) {
        this.applyAllStylesToElements(textElement, this.layerGroup);
      }
    });
  }

  /**
   * 従来の位置指定方式でテキストを描画します
   * @private
   */
  private renderPositionedText(): void {
    // 各フィーチャーのテキストデータを取得
    const allTextData: any[] = [];
    
    this.data.features.forEach((feature, featureIndex) => {
      // テキスト内容を取得
      let text = '';
      if (feature.properties) {
        text = feature.properties[this.textProperty] || feature.properties['name'] || '';
      }
      
      if (!text) return; // テキストが空の場合はスキップ
      
      // 使用する位置配列を決定
      const positions = this.multiplePositions || [this.position];
      
      positions.forEach((position, positionIndex) => {
        const textData = this.calculateTextPositions(feature, featureIndex, position, text, positionIndex);
        if (textData) {
          allTextData.push(textData);
        }
      });
    });

    // テキスト要素を作成
    const textGroup = this.layerGroup!
      .append('g')
      .attr('class', 'thematika-line-text-layer');

    const texts = textGroup
      .selectAll('text')
      .data(allTextData)
      .enter()
      .append('text')
      .attr('x', d => d.x)
      .attr('y', d => d.y)
      .attr('dx', d => d.dx)
      .attr('dy', d => d.dy)
      .attr('transform', d => d.rotation !== 0 ? `rotate(${d.rotation}, ${d.x}, ${d.y})` : null)
      .attr('lengthAdjust', this.lengthAdjust)
      .attr('alignment-baseline', this.alignmentBaseline)
      .attr('text-anchor', this.textAnchor)
      .attr('font-family', d => d.fontFamily)
      .attr('font-size', d => d.fontSize)
      .attr('font-weight', d => d.fontWeight)
      .attr('class', d => {
        const baseClass = 'thematika-line-text';
        const customClass = this.attr.className || '';
        const featureClass = (d.feature.properties?.class as string) || '';
        return [baseClass, customClass, featureClass].filter(Boolean).join(' ');
      })
      .text(d => d.text);

    // 属性とスタイルを適用
    this.applyAllStylesToElements(texts, this.layerGroup!);
  }

  /**
   * 座標配列からパス文字列を生成します
   * @private
   */
  private generatePathString(coordinates: GeoJSON.Position[]): string {
    if (!this.projection || coordinates.length < 2) return '';

    if (this.lineType === 'smooth') {
      // スムージングパスを生成
      return this.geoSmoothPath(coordinates);
    } else {
      // 直線パスを生成
      const projectedCoords = coordinates
        .map(coord => this.projection!([coord[0], coord[1]]))
        .filter(coord => coord !== null) as [number, number][];

      if (projectedCoords.length < 2) return '';

      let pathString = `M${projectedCoords[0][0]},${projectedCoords[0][1]}`;
      for (let i = 1; i < projectedCoords.length; i++) {
        pathString += `L${projectedCoords[i][0]},${projectedCoords[i][1]}`;
      }
      return pathString;
    }
  }

  /**
   * 指定された位置でのテキスト配置情報を計算します
   * @private
   */
  private calculateTextPositions(
    feature: GeoJSON.Feature,
    featureIndex: number,
    position: TextPositionType,
    text: string,
    positionIndex: number
  ): any | null {
    const geometry = feature.geometry;
    
    if (geometry.type === 'LineString') {
      return this.calculateLineStringTextPosition(
        geometry.coordinates as GeoJSON.Position[],
        feature,
        featureIndex,
        position,
        text,
        positionIndex
      );
    } else if (geometry.type === 'MultiLineString') {
      // MultiLineStringの場合は最初のラインを使用
      const firstLine = geometry.coordinates[0] as GeoJSON.Position[];
      return this.calculateLineStringTextPosition(
        firstLine,
        feature,
        featureIndex,
        position,
        text,
        positionIndex
      );
    }
    
    return null;
  }

  /**
   * LineString上のテキスト配置情報を計算します
   * @private
   */
  private calculateLineStringTextPosition(
    coordinates: GeoJSON.Position[],
    feature: GeoJSON.Feature,
    featureIndex: number,
    position: TextPositionType,
    text: string,
    positionIndex: number
  ): any | null {
    if (coordinates.length < 2) return null;

    try {
      // スムージングが有効な場合とそうでない場合で処理を分ける
      let pointCoords: [number, number];
      let targetDistance: number;

      // 位置を計算
      if (position === 'start') {
        targetDistance = 0;
      } else if (position === 'middle') {
        targetDistance = 0.5;
      } else if (position === 'end') {
        targetDistance = 1;
      } else if (typeof position === 'number') {
        if (this.usePercentage) {
          targetDistance = Math.max(0, Math.min(1, position));
        } else {
          // 実距離の場合はライン全長に対する比率に変換
          const line = turf.lineString(coordinates);
          const totalLength = turf.length(line, { units: 'kilometers' });
          targetDistance = Math.max(0, Math.min(1, position / totalLength));
        }
      } else {
        targetDistance = 0.5;
      }

      if (this.lineType === 'smooth') {
        // スムージングが有効な場合は、スムージングされた座標を使用
        pointCoords = this.calculateSmoothTextPosition(coordinates, targetDistance);
      } else {
        // 通常の場合はturfを使用
        const line = turf.lineString(coordinates);
        const pointOnLine = turf.along(line, targetDistance * turf.length(line, { units: 'kilometers' }), { units: 'kilometers' });
        pointCoords = pointOnLine.geometry.coordinates as [number, number];
      }
      
      // 投影法で座標変換
      const projectedCoords = this.projection ? this.projection(pointCoords) : null;
      if (!projectedCoords) return null;

      // 回転角度を計算
      let rotation = 0;
      if (this.placement === 'along') {
        rotation = this.calculateLineRotation(coordinates, targetDistance);
      } else if (this.placement === 'perpendicular') {
        rotation = this.calculateLineRotation(coordinates, targetDistance) + 90;
      }
      
      // 追加の回転角度を加算
      rotation += this.rotateFunction(feature, featureIndex);

      return {
        feature,
        featureIndex,
        positionIndex,
        text: String(text),
        x: projectedCoords[0],
        y: projectedCoords[1],
        dx: this.dxFunction(feature, featureIndex),
        dy: this.dyFunction(feature, featureIndex),
        rotation: rotation,
        fontFamily: this.fontFamilyFunction(feature, featureIndex),
        fontSize: this.fontSizeFunction(feature, featureIndex),
        fontWeight: this.fontWeightFunction(feature, featureIndex)
      };
    } catch (error) {
      console.warn('LineTextLayer: テキスト位置の計算でエラーが発生しました:', error);
      return null;
    }
  }

  /**
   * スムージングライン上の指定位置での座標を計算します
   * @private
   */
  private calculateSmoothTextPosition(coordinates: GeoJSON.Position[], targetDistance: number): [number, number] {
    // 簡易実装：スムージングされた座標の代わりに、
    // 元の座標から補間した位置を返す
    const index = targetDistance * (coordinates.length - 1);
    const lowerIndex = Math.floor(index);
    const upperIndex = Math.ceil(index);
    const fraction = index - lowerIndex;

    if (lowerIndex === upperIndex || upperIndex >= coordinates.length) {
      return coordinates[lowerIndex] as [number, number];
    }

    const lowerCoord = coordinates[lowerIndex];
    const upperCoord = coordinates[upperIndex];

    return [
      lowerCoord[0] + (upperCoord[0] - lowerCoord[0]) * fraction,
      lowerCoord[1] + (upperCoord[1] - lowerCoord[1]) * fraction
    ];
  }

  /**
   * ライン上の指定位置での回転角度を計算します
   * @private
   */
  private calculateLineRotation(coordinates: GeoJSON.Position[], targetDistance: number): number {
    if (coordinates.length < 2) return 0;

    try {
      // turf.jsでLineStringを作成
      const line = turf.lineString(coordinates);
      const totalLength = turf.length(line, { units: 'kilometers' });
      
      // 微小区間での傾きを計算するため、前後の点を取得
      const delta = 0.001; // 0.1%の微小区間
      const beforeDistance = Math.max(0, targetDistance - delta);
      const afterDistance = Math.min(1, targetDistance + delta);
      
      const beforePoint = turf.along(line, beforeDistance * totalLength, { units: 'kilometers' });
      const afterPoint = turf.along(line, afterDistance * totalLength, { units: 'kilometers' });
      
      const beforeCoords = beforePoint.geometry.coordinates as [number, number];
      const afterCoords = afterPoint.geometry.coordinates as [number, number];
      
      // 投影法で座標変換
      const beforeProjected = this.projection ? this.projection(beforeCoords) : null;
      const afterProjected = this.projection ? this.projection(afterCoords) : null;
      
      if (!beforeProjected || !afterProjected) return 0;
      
      // 角度を計算（ラジアンから度に変換）
      const dx = afterProjected[0] - beforeProjected[0];
      const dy = afterProjected[1] - beforeProjected[1];
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      
      return angle;
    } catch (error) {
      console.warn('LineTextLayer: 回転角度の計算でエラーが発生しました:', error);
      return 0;
    }
  }

  /**
   * スムージングラインを描画します
   * @private
   */
  private renderSmoothLines(): void {
    if (!this.layerGroup || !this.projection) return;

    const smoothLineGroup = this.layerGroup
      .append('g')
      .attr('class', 'thematika-smooth-line-layer');

    this.data.features.forEach((feature, featureIndex) => {
      const geometry = feature.geometry;
      
      if (geometry.type === 'LineString') {
        this.renderSmoothLineString(
          smoothLineGroup,
          geometry.coordinates as GeoJSON.Position[],
          feature,
          featureIndex
        );
      } else if (geometry.type === 'MultiLineString') {
        (geometry.coordinates as GeoJSON.Position[][]).forEach((line, lineIndex) => {
          this.renderSmoothLineString(
            smoothLineGroup,
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
   * スムージングLineStringを描画します
   * @private
   */
  private renderSmoothLineString(
    container: Selection<SVGGElement, unknown, HTMLElement, any>,
    coordinates: GeoJSON.Position[],
    feature: GeoJSON.Feature,
    featureIndex: number,
    lineIndex?: number
  ): void {
    if (!this.projection) return;

    // スムージングパスを生成
    const smoothPath = this.geoSmoothPath(coordinates);

    if (!smoothPath) return;

    const lineData = {
      coordinates: coordinates,
      feature: feature,
      featureIndex: featureIndex,
      lineIndex: lineIndex
    };

    const path = container
      .append('path')
      .datum(lineData)
      .attr('d', smoothPath)
      .attr('class', () => {
        const baseClass = 'thematika-smooth-line';
        const customClass = this.smoothLineStyle.className || '';
        const dataClass = feature.properties?.class || '';
        const lineClass = lineIndex !== undefined ? `line-${lineIndex}` : '';
        return [baseClass, customClass, dataClass, lineClass].filter(Boolean).join(' ');
      });

    // スムージングラインのスタイルを適用
    Object.entries(this.smoothLineStyle).forEach(([key, value]) => {
      if (key === 'className') return; // classNameは既に処理済み
      
      if (typeof value === 'function') {
        path.attr(key, (d: any) => value(d.feature, d.featureIndex));
      } else {
        path.attr(key, value);
      }
    });
  }

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
   * スムージングライン上の座標を取得します
   * @private
   */
  private getSmoothLineCoordinates(coordinates: GeoJSON.Position[]): [number, number][] {
    if (!this.projection) return [];

    // 地理座標をピクセル座標に変換
    const pixelCoordinates = coordinates
      .map(coord => this.projection!([coord[0], coord[1]]))
      .filter(coord => coord !== null) as [number, number][];

    if (pixelCoordinates.length < 2) return [];

    // カーブタイプに応じたカーブ関数を取得
    const curveFunction = this.getCurveFunction();

    // D3のlineジェネレーターを使用してスムージングパスを生成
    const lineGenerator = line<[number, number]>()
      .x(d => d[0])
      .y(d => d[1])
      .curve(curveFunction);

    // パスを生成し、座標点として返す（簡易実装）
    // 実際にはパスから座標を抽出する必要がありますが、
    // ここでは元の座標をスムージング用として返します
    return pixelCoordinates;
  }

  /**
   * テキスト表示方式を設定します
   * @param textMode - 新しいテキスト表示方式
   */
  setTextMode(textMode: 'positioned' | 'textPath'): void {
    this.textMode = textMode;
    if (this.layerGroup) {
      this.renderTexts();
    }
  }

  /**
   * startOffsetを設定します
   * @param startOffset - 新しいstartOffset
   */
  setStartOffset(startOffset: string | number): void {
    this.startOffset = startOffset;
    if (this.layerGroup && this.textMode === 'textPath') {
      this.renderTexts();
    }
  }

  /**
   * GeoJSONデータを取得します
   * @returns 現在のGeoJSONデータ
   */
  getData(): GeoJSON.FeatureCollection {
    return this.data;
  }
}