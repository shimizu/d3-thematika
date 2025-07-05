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
  subjectOptions?: any;
  /** コネクター（引き出し線）の設定 */
  connectorOptions?: any;
  /** ノート（テキスト部分）の設定 */
  noteOptions?: any;
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
  private subjectOptions: any;
  /** コネクター設定 */
  private connectorOptions: any;
  /** ノート設定 */
  private noteOptions: any;

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

    switch (this.annotationType) {
      case 'callout':
        this.drawCallout(annotationGroup, data);
        break;
      case 'calloutElbow':
        this.drawCalloutElbow(annotationGroup, data);
        break;
      case 'calloutCurve':
        this.drawCalloutCurve(annotationGroup, data);
        break;
      case 'label':
        this.drawLabel(annotationGroup, data);
        break;
      case 'badge':
        this.drawBadge(annotationGroup, data);
        break;
      case 'calloutCircle':
        this.drawCalloutCircle(annotationGroup, data);
        break;
      case 'calloutRect':
        this.drawCalloutRect(annotationGroup, data);
        break;
      default:
        this.drawCallout(annotationGroup, data);
    }
  }

  /**
   * シンプルなコールアウトを描画
   * @private
   */
  private drawCallout(group: Selection<SVGGElement, unknown, HTMLElement, any>, data: AnnotationData): void {
    // サブジェクト（対象ポイント）
    group.append('circle')
      .attr('class', 'annotation-subject')
      .attr('r', this.subjectOptions.radius || 3)
      .attr('fill', this.subjectOptions.fill || 'red')
      .attr('stroke', this.subjectOptions.stroke || 'white')
      .attr('stroke-width', this.subjectOptions.strokeWidth || 1);

    // コネクター（引き出し線）
    group.append('line')
      .attr('class', 'annotation-connector')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', data.dx)
      .attr('y2', data.dy)
      .attr('stroke', this.connectorOptions.stroke || '#666')
      .attr('stroke-width', this.connectorOptions.strokeWidth || 1)
      .attr('stroke-dasharray', this.connectorOptions.strokeDasharray || 'none');

    // ノート（テキスト背景）
    const textPadding = this.noteOptions.padding || 4;
    const textBackground = group.append('rect')
      .attr('class', 'annotation-note-bg')
      .attr('fill', this.noteOptions.backgroundColor || 'white')
      .attr('stroke', this.noteOptions.borderColor || '#ccc')
      .attr('stroke-width', this.noteOptions.borderWidth || 1)
      .attr('rx', this.noteOptions.borderRadius || 2);

    // ノート（テキスト）
    const textElement = group.append('text')
      .attr('class', 'annotation-note-text')
      .attr('x', data.dx)
      .attr('y', data.dy)
      .attr('text-anchor', this.getTextAnchor(data.dx))
      .attr('dominant-baseline', this.getBaseline(data.dy))
      .style('font-size', this.noteOptions.fontSize || '12px')
      .style('font-family', this.noteOptions.fontFamily || 'Arial, sans-serif')
      .style('fill', this.noteOptions.textColor || 'black');

    // タイトルがある場合
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

    // テキストのバウンディングボックスを取得して背景を調整
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
   * ラベル形式を描画（引き出し線なし）
   * @private
   */
  private drawLabel(group: Selection<SVGGElement, unknown, HTMLElement, any>, data: AnnotationData): void {
    // サブジェクト（対象ポイント）
    group.append('circle')
      .attr('class', 'annotation-subject')
      .attr('r', this.subjectOptions.radius || 2)
      .attr('fill', this.subjectOptions.fill || 'red')
      .attr('stroke', this.subjectOptions.stroke || 'white')
      .attr('stroke-width', this.subjectOptions.strokeWidth || 1);

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
   * バッジ形式を描画
   * @private
   */
  private drawBadge(group: Selection<SVGGElement, unknown, HTMLElement, any>, data: AnnotationData): void {
    const radius = this.subjectOptions.radius || 10;

    // バッジ背景
    group.append('circle')
      .attr('class', 'annotation-badge-bg')
      .attr('r', radius)
      .attr('fill', this.subjectOptions.fill || '#ff6b6b')
      .attr('stroke', this.subjectOptions.stroke || 'white')
      .attr('stroke-width', this.subjectOptions.strokeWidth || 2);

    // バッジテキスト
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
   * エルボー（肘型）コネクターのコールアウトを描画
   * @private
   */
  private drawCalloutElbow(group: Selection<SVGGElement, unknown, HTMLElement, any>, data: AnnotationData): void {
    // サブジェクト
    group.append('circle')
      .attr('class', 'annotation-subject')
      .attr('r', this.subjectOptions.radius || 3)
      .attr('fill', this.subjectOptions.fill || 'red')
      .attr('stroke', this.subjectOptions.stroke || 'white')
      .attr('stroke-width', this.subjectOptions.strokeWidth || 1);

    // エルボー型コネクター
    const path = `M 0,0 L ${data.dx > 0 ? data.dx : data.dx},${data.dy > 0 ? 0 : data.dy} L ${data.dx},${data.dy}`;
    group.append('path')
      .attr('class', 'annotation-connector')
      .attr('d', path)
      .attr('fill', 'none')
      .attr('stroke', this.connectorOptions.stroke || '#666')
      .attr('stroke-width', this.connectorOptions.strokeWidth || 1);

    // ノート
    this.drawNote(group, data);
  }

  /**
   * カーブコネクターのコールアウトを描画
   * @private
   */
  private drawCalloutCurve(group: Selection<SVGGElement, unknown, HTMLElement, any>, data: AnnotationData): void {
    // サブジェクト
    group.append('circle')
      .attr('class', 'annotation-subject')
      .attr('r', this.subjectOptions.radius || 3)
      .attr('fill', this.subjectOptions.fill || 'red')
      .attr('stroke', this.subjectOptions.stroke || 'white')
      .attr('stroke-width', this.subjectOptions.strokeWidth || 1);

    // カーブコネクター（二次ベジェ曲線）
    const cpX = data.dx * 0.5;
    const cpY = 0;
    const path = `M 0,0 Q ${cpX},${cpY} ${data.dx},${data.dy}`;
    group.append('path')
      .attr('class', 'annotation-connector')
      .attr('d', path)
      .attr('fill', 'none')
      .attr('stroke', this.connectorOptions.stroke || '#666')
      .attr('stroke-width', this.connectorOptions.strokeWidth || 1);

    // ノート
    this.drawNote(group, data);
  }

  /**
   * 円形サブジェクトのコールアウトを描画
   * @private
   */
  private drawCalloutCircle(group: Selection<SVGGElement, unknown, HTMLElement, any>, data: AnnotationData): void {
    // 円形サブジェクト
    group.append('circle')
      .attr('class', 'annotation-subject')
      .attr('r', this.subjectOptions.radius || 8)
      .attr('fill', this.subjectOptions.fill || 'none')
      .attr('stroke', this.subjectOptions.stroke || 'red')
      .attr('stroke-width', this.subjectOptions.strokeWidth || 2);

    // コネクター
    group.append('line')
      .attr('class', 'annotation-connector')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', data.dx)
      .attr('y2', data.dy)
      .attr('stroke', this.connectorOptions.stroke || '#666')
      .attr('stroke-width', this.connectorOptions.strokeWidth || 1);

    // ノート
    this.drawNote(group, data);
  }

  /**
   * 矩形サブジェクトのコールアウトを描画
   * @private
   */
  private drawCalloutRect(group: Selection<SVGGElement, unknown, HTMLElement, any>, data: AnnotationData): void {
    const width = this.subjectOptions.width || 16;
    const height = this.subjectOptions.height || 16;

    // 矩形サブジェクト
    group.append('rect')
      .attr('class', 'annotation-subject')
      .attr('x', -width / 2)
      .attr('y', -height / 2)
      .attr('width', width)
      .attr('height', height)
      .attr('fill', this.subjectOptions.fill || 'none')
      .attr('stroke', this.subjectOptions.stroke || 'red')
      .attr('stroke-width', this.subjectOptions.strokeWidth || 2);

    // コネクター
    group.append('line')
      .attr('class', 'annotation-connector')
      .attr('x1', 0)
      .attr('y1', 0)
      .attr('x2', data.dx)
      .attr('y2', data.dy)
      .attr('stroke', this.connectorOptions.stroke || '#666')
      .attr('stroke-width', this.connectorOptions.strokeWidth || 1);

    // ノート
    this.drawNote(group, data);
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