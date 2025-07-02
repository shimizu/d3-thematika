import { Selection } from 'd3-selection';
import { GeoProjection } from 'd3-geo';
import { BaseLayer } from './base-layer';
import { LayerAttributes, IGeojsonLayer } from '../types';
import { getCentroid } from '../utils/gis-utils';

/**
 * PointTextLayerの初期化オプション
 */
export interface PointTextLayerOptions {
  /** GeoJSONデータ */
  data: GeoJSON.FeatureCollection | GeoJSON.Feature[];
  /** レイヤーの属性設定 */
  attributes?: LayerAttributes;
  /** テキストの内容を取得するプロパティ名（デフォルト: 'text'、次候補: 'name'） */
  textProperty?: string;
  /** X方向のオフセット（デフォルト: 0） */
  dx?: number | ((feature: GeoJSON.Feature, index: number) => number);
  /** Y方向のオフセット（デフォルト: 0） */
  dy?: number | ((feature: GeoJSON.Feature, index: number) => number);
  /** テキストの回転角度（デフォルト: 0） */
  rotate?: number | ((feature: GeoJSON.Feature, index: number) => number);
  /** テキストの長さ調整（デフォルト: "spacing"） */
  lengthAdjust?: "spacing" | "spacingAndGlyphs";
  /** ベースラインの位置（デフォルト: "middle"） */
  alignmentBaseline?: "auto" | "baseline" | "before-edge" | "text-before-edge" | "middle" | "central" | "after-edge" | "text-after-edge" | "ideographic" | "alphabetic" | "hanging" | "mathematical" | "inherit";
  /** テキストアンカー（デフォルト: "start"） */
  textAnchor?: "start" | "middle" | "end" | "inherit";
  /** フォントファミリー（デフォルト: "メイリオ, Meiryo, 'ＭＳ Ｐゴシック', MS Gothic, sans-serif"） */
  fontFamily?: string | ((feature: GeoJSON.Feature, index: number) => string);
  /** フォントサイズ（デフォルト: 16） */
  fontSize?: number | string | ((feature: GeoJSON.Feature, index: number) => number | string);
  /** フォントウェイト（デフォルト: "normal"） */
  fontWeight?: "normal" | "bold" | "bolder" | "lighter" | "100" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "900" | "inherit" | ((feature: GeoJSON.Feature, index: number) => string);
}

/**
 * GeoJSONデータをテキスト要素として描画するレイヤークラス
 * ポイントならそのまま、ポリゴンやラインなら中心点にテキストを配置
 */
export class PointTextLayer extends BaseLayer implements IGeojsonLayer {
  /** GeoJSONデータ */
  private data: GeoJSON.FeatureCollection;
  /** 投影法 */
  private projection?: GeoProjection;
  /** レイヤーグループ */
  private layerGroup?: Selection<SVGGElement, unknown, HTMLElement, any>;
  /** テキストプロパティ名 */
  private textProperty: string;
  /** X方向オフセット関数 */
  private dxFunction: (feature: GeoJSON.Feature, index: number) => number;
  /** Y方向オフセット関数 */
  private dyFunction: (feature: GeoJSON.Feature, index: number) => number;
  /** 回転角度関数 */
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

  /**
   * PointTextLayerを初期化します
   * @param options - レイヤーの設定オプション
   */
  constructor(options: PointTextLayerOptions) {
    // 一意のIDを自動生成
    super(`point-text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, options.attributes);
    
    // データの正規化
    this.data = Array.isArray(options.data)
      ? { type: 'FeatureCollection', features: options.data }
      : options.data as GeoJSON.FeatureCollection;
    
    // テキストプロパティ名
    this.textProperty = options.textProperty || 'text';
    
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
    this.textAnchor = options.textAnchor || "start";
    
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
    this.layerGroup.selectAll('g.thematika-point-text-layer').remove();

    // 各フィーチャーの座標とテキストデータを取得
    const textData = this.data.features.map((feature, index) => {
      let coordinates: [number, number];

      if (feature.geometry.type === 'Point') {
        // ポイントの場合はそのまま使用
        coordinates = feature.geometry.coordinates as [number, number];
      } else {
        // ポリゴンやラインの場合は中心点を計算
        const centroid = getCentroid(feature);
        coordinates = [centroid.x, centroid.y];
      }

      // 投影法で座標変換
      const projectedCoords = this.projection ? this.projection(coordinates) : null;
      
      // テキスト内容を取得（textプロパティ → nameプロパティ → 空文字の順で試行）
      let text = '';
      if (feature.properties) {
        text = feature.properties[this.textProperty] || feature.properties['name'] || '';
      }
      
      return {
        feature,
        index,
        text: String(text),
        x: projectedCoords ? projectedCoords[0] : 0,
        y: projectedCoords ? projectedCoords[1] : 0,
        dx: this.dxFunction(feature, index),
        dy: this.dyFunction(feature, index),
        rotate: this.rotateFunction(feature, index),
        fontFamily: this.fontFamilyFunction(feature, index),
        fontSize: this.fontSizeFunction(feature, index),
        fontWeight: this.fontWeightFunction(feature, index)
      };
    }).filter(d => d.x !== null && d.y !== null && d.text !== ''); // 投影できない座標や空テキストを除外

    // テキスト要素を作成
    const texts = this.layerGroup
      .append('g')
      .attr('class', 'thematika-point-text-layer')
      .selectAll('text')
      .data(textData)
      .enter()
      .append('text')
      .attr('x', d => d.x)
      .attr('y', d => d.y)
      .attr('dx', d => d.dx)
      .attr('dy', d => d.dy)
      .attr('transform', d => d.rotate !== 0 ? `rotate(${d.rotate}, ${d.x}, ${d.y})` : null)
      .attr('lengthAdjust', this.lengthAdjust)
      .attr('alignment-baseline', this.alignmentBaseline)
      .attr('text-anchor', this.textAnchor)
      .attr('font-family', d => d.fontFamily)
      .attr('font-size', d => d.fontSize)
      .attr('font-weight', d => d.fontWeight)
      .attr('class', d => {
        const baseClass = 'thematika-point-text';
        const customClass = this.attributes.className || '';
        const featureClass = (d.feature.properties?.class as string) || '';
        return [baseClass, customClass, featureClass].filter(Boolean).join(' ');
      })
      .text(d => d.text);

    // 属性を適用（共通メソッドを使用）
    this.applyAttributesToElements(texts, this.layerGroup);
  }

  /**
   * GeoJSONデータを取得します
   * @returns 現在のGeoJSONデータ
   */
  getData(): GeoJSON.FeatureCollection {
    return this.data;
  }
}