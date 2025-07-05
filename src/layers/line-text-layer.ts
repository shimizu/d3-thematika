import { Selection } from 'd3-selection';
import { GeoProjection } from 'd3-geo';
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

    // 既存のテキストを削除
    this.layerGroup.selectAll('g.thematika-line-text-layer').remove();

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
    const textGroup = this.layerGroup
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
    this.applyAllStylesToElements(texts, this.layerGroup);
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
      // turf.jsでLineStringを作成
      const line = turf.lineString(coordinates);
      
      // 位置を計算
      let targetDistance: number;
      
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
          const totalLength = turf.length(line, { units: 'kilometers' });
          targetDistance = Math.max(0, Math.min(1, position / totalLength));
        }
      } else {
        targetDistance = 0.5;
      }

      // ライン上の点を取得
      const pointOnLine = turf.along(line, targetDistance * turf.length(line, { units: 'kilometers' }), { units: 'kilometers' });
      const pointCoords = pointOnLine.geometry.coordinates as [number, number];
      
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
   * GeoJSONデータを取得します
   * @returns 現在のGeoJSONデータ
   */
  getData(): GeoJSON.FeatureCollection {
    return this.data;
  }
}