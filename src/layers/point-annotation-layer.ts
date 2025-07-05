import { Selection } from 'd3-selection';
import { GeoProjection } from 'd3-geo';
import { BaseLayer } from './base-layer';
import { LayerAttr, LayerStyle, IGeojsonLayer } from '../types';
import { getCentroid } from '../utils/gis-utils';

/**
 * アノテーションタイプの定義
 */
export type AnnotationType = 'callout' | 'label' | 'badge' | 'calloutElbow' | 'calloutCurve' | 'calloutCircle' | 'calloutRect';

/**
 * テキストアクセサーの型定義
 */
export type TextAccessor = string | ((feature: GeoJSON.Feature, index: number) => string);

/**
 * オフセットアクセサーの型定義
 */
export type OffsetAccessor = ((feature: GeoJSON.Feature, index: number) => [number, number]);

/**
 * サブジェクトタイプの定義
 */
export type SubjectType = 'point' | 'circle' | 'rect';

/**
 * スタイル値の型定義（固定値またはコールバック関数）
 */
export type StyleValue<T> = T | ((feature: GeoJSON.Feature, index: number) => T);

/**
 * サブジェクトオプションの型定義
 */
export interface SubjectOptions {
  /** サブジェクトタイプ */
  type?: SubjectType;
  /** 半径（circle用） */
  r?: StyleValue<number>;
  /** 幅（rect用） */
  width?: StyleValue<number>;
  /** 高さ（rect用） */
  height?: StyleValue<number>;
  /** 塗りつぶし色 */
  fill?: StyleValue<string>;
  /** 境界線色 */
  stroke?: StyleValue<string>;
  /** 境界線の太さ */
  strokeWidth?: StyleValue<number>;
  /** その他の基本設定（後方互換性のため） */
  radius?: number;
}

/**
 * コネクターオプションの型定義
 */
export interface ConnectorOptions {
  /** 線の色 */
  stroke?: StyleValue<string>;
  /** 線の太さ */
  strokeWidth?: StyleValue<number>;
  /** 線のダッシュ配列 */
  strokeDasharray?: StyleValue<string>;
}

/**
 * ノートオプションの型定義
 */
export interface NoteOptions {
  /** 背景色 */
  backgroundColor?: string;
  /** 境界線色 */
  borderColor?: string;
  /** 境界線の太さ */
  borderWidth?: number;
  /** 境界線の角丸 */
  borderRadius?: number;
  /** パディング */
  padding?: number;
  /** フォントサイズ */
  fontSize?: string;
  /** フォントファミリー */
  fontFamily?: string;
  /** テキスト色 */
  textColor?: string;
  /** テキストの折り返し */
  wrap?: number;
  /** テキストの配置 */
  align?: string;
}

/**
 * PointAnnotationLayerの初期化オプション
 */
export interface PointAnnotationLayerOptions {
  /** GeoJSONデータ */
  data: GeoJSON.FeatureCollection | GeoJSON.Feature[];
  /** アノテーションタイプ */
  annotationType?: AnnotationType;
  /** テキスト内容のアクセサー */
  textAccessor?: TextAccessor;
  /** タイトル内容のアクセサー */
  titleAccessor?: TextAccessor;
  /** オフセット位置のアクセサー */
  offsetAccessor?: OffsetAccessor;
  /** サブジェクト（対象）の設定 */
  subjectOptions?: SubjectOptions;
  /** コネクター（引き出し線）の設定 */
  connectorOptions?: ConnectorOptions;
  /** ノート（テキスト部分）の設定 */
  noteOptions?: NoteOptions;
  /** レイヤーの属性設定 */
  attr?: LayerAttr;
  /** レイヤーのCSS style属性設定 */
  style?: LayerStyle;
}

/**
 * アノテーション要素のデータ構造
 */
interface AnnotationData {
  feature: GeoJSON.Feature;
  index: number;
  x: number;
  y: number;
  text: string;
  title: string | undefined;
  dx: number;
  dy: number;
}

/**
 * GeoJSONデータをアノテーション要素として描画するレイヤークラス
 * ポイントならそのまま、ポリゴンやラインなら中心点にアノテーションを配置
 */
export class PointAnnotationLayer extends BaseLayer implements IGeojsonLayer {
  /** GeoJSONデータ */
  private data: GeoJSON.FeatureCollection;
  /** 投影法 */
  private projection?: GeoProjection;
  /** レイヤーグループ */
  private layerGroup?: Selection<SVGGElement, unknown, HTMLElement, any>;
  /** アノテーションタイプ */
  private annotationType: AnnotationType;
  /** テキストアクセサー */
  private textAccessor: TextAccessor;
  /** タイトルアクセサー */
  private titleAccessor?: TextAccessor;
  /** オフセットアクセサー */
  private offsetAccessor?: OffsetAccessor;
  /** サブジェクト設定 */
  private subjectOptions: SubjectOptions;
  /** コネクター設定 */
  private connectorOptions: ConnectorOptions;
  /** ノート設定 */
  private noteOptions: NoteOptions;

  /**
   * PointAnnotationLayerを初期化します
   * @param options - レイヤーの設定オプション
   */
  constructor(options: PointAnnotationLayerOptions) {
    // 一意のIDを自動生成
    super(`point-annotation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, options.attr || {}, options.style || {});
    
    // データの正規化
    this.data = Array.isArray(options.data)
      ? { type: 'FeatureCollection', features: options.data }
      : options.data as GeoJSON.FeatureCollection;
    
    // オプションの設定
    this.annotationType = options.annotationType || 'callout';
    this.textAccessor = options.textAccessor || this.getDefaultTextAccessor();
    this.titleAccessor = options.titleAccessor;
    this.offsetAccessor = options.offsetAccessor;
    this.subjectOptions = options.subjectOptions || {};
    this.connectorOptions = options.connectorOptions || {};
    this.noteOptions = options.noteOptions || { wrap: 100, align: 'dynamic' };
  }

  /**
   * レイヤーを描画します
   * @param container - 描画先のSVGコンテナ
   */
  render(container: Selection<SVGGElement, unknown, HTMLElement, any>): void {
    this.layerGroup = this.createLayerGroup(container);
    this.renderAnnotations();
  }

  /**
   * フィーチャーにイベントリスナーを追加します
   * @param eventType - イベントタイプ
   * @param handler - イベントハンドラー
   */
  on(eventType: string, handler: (event: Event, data: GeoJSON.Feature) => void): void {
    if (this.layerGroup) {
      this.layerGroup.selectAll('.annotation')
        .on(eventType, function(event, d: any) {
          handler(event, d.feature);
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
      this.renderAnnotations();
    }
  }

  /**
   * GeoJSONデータを取得します
   * @returns 現在のGeoJSONデータ
   */
  getData(): GeoJSON.FeatureCollection {
    return this.data;
  }

  /**
   * デフォルトのテキストアクセサーを取得します
   * フィーチャーのpropertiesから最初の文字列値を使用
   * @private
   */
  private getDefaultTextAccessor(): TextAccessor {
    return (feature: GeoJSON.Feature, index: number) => {
      if (feature.properties) {
        // propertiesから最初の文字列値を探す
        for (const [key, value] of Object.entries(feature.properties)) {
          if (typeof value === 'string' && value.trim()) {
            return value;
          }
        }
      }
      // フォールバック
      return `Point ${index + 1}`;
    };
  }

  /**
   * テキスト値を取得します
   * @param feature - GeoJSONフィーチャー
   * @param index - インデックス
   * @private
   */
  private getTextValue(feature: GeoJSON.Feature, index: number): string {
    if (typeof this.textAccessor === 'string') {
      return feature.properties?.[this.textAccessor] as string || `Point ${index + 1}`;
    } else {
      return this.textAccessor(feature, index);
    }
  }

  /**
   * タイトル値を取得します
   * @param feature - GeoJSONフィーチャー
   * @param index - インデックス
   * @private
   */
  private getTitleValue(feature: GeoJSON.Feature, index: number): string | undefined {
    if (!this.titleAccessor) return undefined;
    
    if (typeof this.titleAccessor === 'string') {
      return feature.properties?.[this.titleAccessor] as string;
    } else {
      return this.titleAccessor(feature, index);
    }
  }

  /**
   * オフセット値を取得します
   * @param feature - GeoJSONフィーチャー
   * @param index - インデックス
   * @private
   */
  private getOffsetValue(feature: GeoJSON.Feature, index: number): [number, number] {
    if (this.offsetAccessor) {
      return this.offsetAccessor(feature, index);
    }
    // デフォルトオフセット
    return [30, -20];
  }

  /**
   * スタイル値を解決します（固定値またはコールバック関数）
   * @param styleValue - スタイル値
   * @param feature - GeoJSONフィーチャー
   * @param index - インデックス
   * @param defaultValue - デフォルト値
   * @private
   */
  private resolveStyleValue<T>(
    styleValue: StyleValue<T> | undefined,
    feature: GeoJSON.Feature,
    index: number,
    defaultValue: T
  ): T {
    if (styleValue === undefined) return defaultValue;
    if (typeof styleValue === 'function') {
      return (styleValue as (feature: GeoJSON.Feature, index: number) => T)(feature, index);
    }
    return styleValue as T;
  }

  /**
   * サブジェクトタイプを取得します
   * @private
   */
  private getSubjectType(): SubjectType {
    // subjectOptionsで明示的に指定されている場合はそれを使用
    if (this.subjectOptions.type) {
      return this.subjectOptions.type;
    }

    // アノテーションタイプに基づいてデフォルトを決定
    switch (this.annotationType) {
      case 'calloutCircle':
        return 'circle';
      case 'calloutRect':
        return 'rect';
      case 'badge':
        return 'circle';
      default:
        return 'point';
    }
  }

  /**
   * アノテーションデータを準備します
   * @private
   */
  private prepareAnnotationData(): AnnotationData[] {
    if (!this.projection) return [];

    const annotationData = this.data.features.map((feature, index) => {
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
      const projectedCoords = this.projection!(coordinates);
      
      if (!projectedCoords) {
        return null;
      }

      const [dx, dy] = this.getOffsetValue(feature, index);
      const text = this.getTextValue(feature, index);
      const title = this.getTitleValue(feature, index);

      return {
        feature,
        index,
        x: projectedCoords[0],
        y: projectedCoords[1],
        text,
        title,
        dx,
        dy
      };
    });

    return annotationData.filter((d): d is AnnotationData => d !== null);
  }

  /**
   * アノテーションを描画します
   * @private
   */
  private renderAnnotations(): void {
    if (!this.layerGroup || !this.projection) return;

    // 既存のアノテーションを削除
    this.layerGroup.selectAll('*').remove();

    // アノテーションデータを準備
    const annotationData = this.prepareAnnotationData();

    // アノテーションタイプに応じて描画
    annotationData.forEach((data, index) => {
      this.drawSingleAnnotation(data, index);
    });

    // 属性とスタイルを適用
    const allAnnotations = this.layerGroup.selectAll('.annotation');
    this.applyAllStylesToElement(allAnnotations, this.layerGroup);
  }

  /**
   * 単一のアノテーションを描画します
   * @param data - アノテーションデータ
   * @param index - インデックス
   * @private
   */
  private drawSingleAnnotation(data: AnnotationData, index: number): void {
    const annotationGroup = this.layerGroup!
      .append('g')
      .attr('class', 'annotation thematika-point-annotation')
      .attr('transform', `translate(${data.x}, ${data.y})`);

    // サブジェクトを描画
    this.drawSubject(annotationGroup, data);

    // アノテーションタイプに応じてコネクターとノートを描画
    switch (this.annotationType) {
      case 'callout':
        this.drawConnector(annotationGroup, data, 'line');
        this.drawNote(annotationGroup, data);
        break;
      case 'calloutElbow':
        this.drawConnector(annotationGroup, data, 'elbow');
        this.drawNote(annotationGroup, data);
        break;
      case 'calloutCurve':
        this.drawConnector(annotationGroup, data, 'curve');
        this.drawNote(annotationGroup, data);
        break;
      case 'label':
        this.drawLabel(annotationGroup, data);
        break;
      case 'badge':
        this.drawBadgeText(annotationGroup, data);
        break;
      case 'calloutCircle':
      case 'calloutRect':
        this.drawConnector(annotationGroup, data, 'line');
        this.drawNote(annotationGroup, data);
        break;
      default:
        this.drawConnector(annotationGroup, data, 'line');
        this.drawNote(annotationGroup, data);
    }
  }

  /**
   * サブジェクト（対象ポイント）を描画します
   * @private
   */
  private drawSubject(group: Selection<SVGGElement, unknown, HTMLElement, any>, data: AnnotationData): void {
    const subjectType = this.getSubjectType();
    const feature = data.feature;
    const index = data.index;

    // スタイル値を解決
    const fill = this.resolveStyleValue(this.subjectOptions.fill, feature, index, '#e74c3c');
    const stroke = this.resolveStyleValue(this.subjectOptions.stroke, feature, index, 'white');
    const strokeWidth = this.resolveStyleValue(this.subjectOptions.strokeWidth, feature, index, 1);

    switch (subjectType) {
      case 'point':
        this.drawPointSubject(group, data, { fill, stroke, strokeWidth });
        break;
      case 'circle':
        this.drawCircleSubject(group, data, { fill, stroke, strokeWidth });
        break;
      case 'rect':
        this.drawRectSubject(group, data, { fill, stroke, strokeWidth });
        break;
    }
  }

  /**
   * ポイント型サブジェクトを描画
   * @private
   */
  private drawPointSubject(
    group: Selection<SVGGElement, unknown, HTMLElement, any>,
    data: AnnotationData,
    styles: { fill: string; stroke: string; strokeWidth: number }
  ): void {
    const radius = this.resolveStyleValue(this.subjectOptions.r, data.feature, data.index, 3);
    
    group.append('circle')
      .attr('class', 'annotation-subject')
      .attr('r', radius)
      .attr('fill', styles.fill)
      .attr('stroke', styles.stroke)
      .attr('stroke-width', styles.strokeWidth);
  }

  /**
   * 円形サブジェクトを描画
   * @private
   */
  private drawCircleSubject(
    group: Selection<SVGGElement, unknown, HTMLElement, any>,
    data: AnnotationData,
    styles: { fill: string; stroke: string; strokeWidth: number }
  ): void {
    const radius = this.resolveStyleValue(
      this.subjectOptions.r,
      data.feature,
      data.index,
      this.subjectOptions.radius || 8  // 後方互換性
    );

    group.append('circle')
      .attr('class', 'annotation-subject')
      .attr('r', radius)
      .attr('fill', styles.fill)
      .attr('stroke', styles.stroke)
      .attr('stroke-width', styles.strokeWidth);
  }

  /**
   * 矩形サブジェクトを描画
   * @private
   */
  private drawRectSubject(
    group: Selection<SVGGElement, unknown, HTMLElement, any>,
    data: AnnotationData,
    styles: { fill: string; stroke: string; strokeWidth: number }
  ): void {
    const width = this.resolveStyleValue(this.subjectOptions.width, data.feature, data.index, 16);
    const height = this.resolveStyleValue(this.subjectOptions.height, data.feature, data.index, 16);

    group.append('rect')
      .attr('class', 'annotation-subject')
      .attr('x', -width / 2)
      .attr('y', -height / 2)
      .attr('width', width)
      .attr('height', height)
      .attr('fill', styles.fill)
      .attr('stroke', styles.stroke)
      .attr('stroke-width', styles.strokeWidth);
  }

  /**
   * コネクター（引き出し線）を描画します
   * @private
   */
  private drawConnector(
    group: Selection<SVGGElement, unknown, HTMLElement, any>,
    data: AnnotationData,
    type: 'line' | 'elbow' | 'curve'
  ): void {
    const stroke = this.resolveStyleValue(this.connectorOptions.stroke, data.feature, data.index, '#666');
    const strokeWidth = this.resolveStyleValue(this.connectorOptions.strokeWidth, data.feature, data.index, 1);
    const strokeDasharray = this.resolveStyleValue(this.connectorOptions.strokeDasharray, data.feature, data.index, 'none');

    switch (type) {
      case 'line':
        group.append('line')
          .attr('class', 'annotation-connector')
          .attr('x1', 0)
          .attr('y1', 0)
          .attr('x2', data.dx)
          .attr('y2', data.dy)
          .attr('stroke', stroke)
          .attr('stroke-width', strokeWidth)
          .attr('stroke-dasharray', strokeDasharray);
        break;
      case 'elbow':
        const elbowPath = `M 0,0 L ${data.dx > 0 ? data.dx : data.dx},${data.dy > 0 ? 0 : data.dy} L ${data.dx},${data.dy}`;
        group.append('path')
          .attr('class', 'annotation-connector')
          .attr('d', elbowPath)
          .attr('fill', 'none')
          .attr('stroke', stroke)
          .attr('stroke-width', strokeWidth)
          .attr('stroke-dasharray', strokeDasharray);
        break;
      case 'curve':
        const cpX = data.dx * 0.5;
        const cpY = 0;
        const curvePath = `M 0,0 Q ${cpX},${cpY} ${data.dx},${data.dy}`;
        group.append('path')
          .attr('class', 'annotation-connector')
          .attr('d', curvePath)
          .attr('fill', 'none')
          .attr('stroke', stroke)
          .attr('stroke-width', strokeWidth)
          .attr('stroke-dasharray', strokeDasharray);
        break;
    }
  }


  /**
   * ラベル形式を描画（引き出し線なし、テキストのみ）
   * @private
   */
  private drawLabel(group: Selection<SVGGElement, unknown, HTMLElement, any>, data: AnnotationData): void {
    // ノート（テキスト）- 中央揃え
    const textElement = group.append('text')
      .attr('class', 'annotation-note-text')
      .attr('x', 0)
      .attr('y', data.dy)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .style('font-size', this.noteOptions.fontSize || '12px')
      .style('font-family', this.noteOptions.fontFamily || 'Arial, sans-serif')
      .style('fill', this.noteOptions.textColor || 'black')
      .text(data.text);
  }


  /**
   * バッジテキストを描画（サブジェクト上に短いテキストを表示）
   * @private
   */
  private drawBadgeText(group: Selection<SVGGElement, unknown, HTMLElement, any>, data: AnnotationData): void {
    // バッジテキスト（サブジェクト上に表示）
    group.append('text')
      .attr('class', 'annotation-badge-text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .style('font-size', this.noteOptions.fontSize || '10px')
      .style('font-family', this.noteOptions.fontFamily || 'Arial, sans-serif')
      .style('font-weight', 'bold')
      .style('fill', this.noteOptions.textColor || 'white')
      .text(data.text.substring(0, 3)); // バッジは短いテキストのみ
  }





  /**
   * ノート（テキスト部分）を描画
   * @private
   */
  private drawNote(group: Selection<SVGGElement, unknown, HTMLElement, any>, data: AnnotationData): void {
    const textPadding = this.noteOptions.padding || 4;
    
    // テキスト背景
    const textBackground = group.append('rect')
      .attr('class', 'annotation-note-bg')
      .attr('fill', this.noteOptions.backgroundColor || 'white')
      .attr('stroke', this.noteOptions.borderColor || '#ccc')
      .attr('stroke-width', this.noteOptions.borderWidth || 1)
      .attr('rx', this.noteOptions.borderRadius || 2);

    // テキスト
    const textElement = group.append('text')
      .attr('class', 'annotation-note-text')
      .attr('x', data.dx)
      .attr('y', data.dy)
      .attr('text-anchor', this.getTextAnchor(data.dx))
      .attr('dominant-baseline', this.getBaseline(data.dy))
      .style('font-size', this.noteOptions.fontSize || '12px')
      .style('font-family', this.noteOptions.fontFamily || 'Arial, sans-serif')
      .style('fill', this.noteOptions.textColor || 'black');

    // タイトルとテキストの処理
    if (data.title) {
      textElement.append('tspan')
        .attr('x', data.dx)
        .attr('dy', 0)
        .style('font-weight', 'bold')
        .text(data.title);

      textElement.append('tspan')
        .attr('x', data.dx)
        .attr('dy', '1.2em')
        .text(data.text);
    } else {
      textElement.text(data.text);
    }

    // 背景サイズ調整
    setTimeout(() => {
      const bbox = textElement.node()?.getBBox();
      if (bbox) {
        textBackground
          .attr('x', bbox.x - textPadding)
          .attr('y', bbox.y - textPadding)
          .attr('width', bbox.width + textPadding * 2)
          .attr('height', bbox.height + textPadding * 2);
      }
    }, 0);
  }

  /**
   * テキストアンカーを取得
   * @private
   */
  private getTextAnchor(dx: number): string {
    if (dx > 0) return 'start';
    if (dx < 0) return 'end';
    return 'middle';
  }

  /**
   * ベースラインを取得
   * @private
   */
  private getBaseline(dy: number): string {
    if (dy > 0) return 'hanging';
    if (dy < 0) return 'alphabetic';
    return 'central';
  }
}