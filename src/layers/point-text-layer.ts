import { Selection } from 'd3-selection';
import { GeoProjection } from 'd3-geo';
import { Delaunay } from 'd3-delaunay';
import { polygonCentroid } from 'd3-polygon';
import { BaseLayer } from './base-layer';
import { LayerAttr, LayerStyle, IGeojsonLayer } from '../types';
import { getCentroid } from '../utils/gis-utils';

/**
 * テキストデータの内部型
 */
interface TextDataItem {
  feature: GeoJSON.Feature;
  index: number;
  text: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
  rotate: number;
  fontFamily: string;
  fontSize: string | number;
  fontWeight: string;
  // Voronoi計算後に追加されるプロパティ
  voronoiX?: number;
  voronoiY?: number;
  originalX?: number;
  originalY?: number;
  hasVoronoi?: boolean;
}

/**
 * PointTextLayerの初期化オプション
 */
export interface PointTextLayerOptions {
  /** GeoJSONデータ */
  data: GeoJSON.FeatureCollection | GeoJSON.Feature[];
  /** レイヤーの属性設定 */
  attr?: LayerAttr;
  /** レイヤーのCSS style属性設定 */
  style?: LayerStyle;
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
  /** ラベルの重なり回避を有効にする（デフォルト: false） */
  avoidOverlap?: boolean;
  /** 接続線を表示する（avoidOverlap有効時のみ、デフォルト: false） */
  showConnectors?: boolean;
  /** 接続線のスタイル設定 - 固定値または関数 */
  connectorStyle?: LayerStyle | ((feature: GeoJSON.Feature, index: number) => LayerStyle);
  /** Voronoi図の計算範囲のマージン（デフォルト: 20） */
  voronoiMargin?: number;
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
  /** ラベル重なり回避の有効化 */
  private avoidOverlap: boolean;
  /** 接続線の表示 */
  private showConnectors: boolean;
  /** 接続線のスタイル設定 */
  private connectorStyle?: LayerStyle | ((feature: GeoJSON.Feature, index: number) => LayerStyle);
  /** Voronoi図の計算範囲のマージン */
  private voronoiMargin: number;

  /**
   * PointTextLayerを初期化します
   * @param options - レイヤーの設定オプション
   */
  constructor(options: PointTextLayerOptions) {
    // 一意のIDを自動生成
    super(`point-text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, options.attr || {}, options.style || {});
    
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
    
    // ラベル重なり回避の設定
    this.avoidOverlap = options.avoidOverlap || false;
    this.showConnectors = options.showConnectors || false;
    this.connectorStyle = options.connectorStyle;
    this.voronoiMargin = options.voronoiMargin || 20;
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

    // 既存のテキストと接続線を削除
    this.layerGroup.selectAll('g.thematika-point-text-layer').remove();
    this.layerGroup.selectAll('g.thematika-point-text-connectors').remove();

    // 各フィーチャーの座標とテキストデータを取得
    let textData: TextDataItem[] = this.data.features.map((feature, index) => {
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

    // Voronoi計算を適用（avoidOverlapが有効な場合）
    if (this.avoidOverlap) {
      textData = this.calculateVoronoiPositions(textData);
    }

    // 接続線を描画（avoidOverlapとshowConnectorsが有効な場合）
    if (this.avoidOverlap && this.showConnectors) {
      const connectorGroup = this.layerGroup
        .append('g')
        .attr('class', 'thematika-point-text-connectors');

      const connectors = connectorGroup
        .selectAll('path')
        .data(textData.filter(d => d.hasVoronoi !== false))
        .enter()
        .append('path')
        .attr('d', d => this.createCurvedPath(
          d.originalX || d.x,
          d.originalY || d.y,
          d.voronoiX || d.x,
          d.voronoiY || d.y
        ))
        .attr('class', 'thematika-point-text-connector')
        .attr('fill', 'none');

      // connectorStyleを適用
      if (this.connectorStyle) {
        const isFunction = typeof this.connectorStyle === 'function';
        
        connectors.each((d, i, nodes) => {
          const element = nodes[i] as SVGPathElement;
          const selection = this.layerGroup!.select(() => element);
          
          // スタイルを取得（関数の場合は評価）
          const style = isFunction 
            ? (this.connectorStyle as Function)(d.feature, d.index)
            : this.connectorStyle;
          
          // スタイルを適用
          if (style && typeof style === 'object') {
            Object.entries(style).forEach(([key, value]) => {
              selection.style(key, value as any);
            });
          }
        });
      }
    }

    // テキスト要素を作成
    const textGroup = this.layerGroup
      .append('g')
      .attr('class', 'thematika-point-text-layer');

    const texts = textGroup
      .selectAll('text')
      .data(textData)
      .enter()
      .append('text')
      .attr('x', d => this.avoidOverlap && d.voronoiX !== undefined ? d.voronoiX : d.x)
      .attr('y', d => this.avoidOverlap && d.voronoiY !== undefined ? d.voronoiY : d.y)
      .attr('dx', d => d.dx)
      .attr('dy', d => d.dy)
      .attr('transform', d => {
        const x = this.avoidOverlap && d.voronoiX !== undefined ? d.voronoiX : d.x;
        const y = this.avoidOverlap && d.voronoiY !== undefined ? d.voronoiY : d.y;
        return d.rotate !== 0 ? `rotate(${d.rotate}, ${x}, ${y})` : null;
      })
      .attr('lengthAdjust', this.lengthAdjust)
      .attr('alignment-baseline', this.alignmentBaseline)
      .attr('text-anchor', this.textAnchor)
      .attr('font-family', d => d.fontFamily)
      .attr('font-size', d => d.fontSize)
      .attr('font-weight', d => d.fontWeight)
      .attr('class', d => {
        const baseClass = 'thematika-point-text';
        const customClass = this.attr.className || '';
        const featureClass = (d.feature.properties?.class as string) || '';
        return [baseClass, customClass, featureClass].filter(Boolean).join(' ');
      })
      .text(d => d.text);

    // 属性とスタイルを適用（共通メソッドを使用）
    this.applyAllStylesToElements(texts, this.layerGroup);
  }

  /**
   * Voronoi図を計算してラベル配置位置を決定します
   * @private
   * @param textData - テキストデータの配列
   * @returns Voronoi計算結果を含む拡張データ
   */
  private calculateVoronoiPositions(textData: TextDataItem[]): TextDataItem[] {
    if (!this.avoidOverlap || textData.length === 0) {
      return textData;
    }

    // SVGのサイズを取得
    const svg = this.layerGroup?.node()?.closest('svg');
    if (!svg) return textData;
    
    const svgRect = svg.getBoundingClientRect();
    const width = svgRect.width;
    const height = svgRect.height;

    // Delaunay三角分割を作成
    const delaunay = Delaunay.from(
      textData,
      d => d.x,
      d => d.y
    );

    // Voronoi図を作成（マージンを考慮）
    const voronoi = delaunay.voronoi([
      -this.voronoiMargin,
      -this.voronoiMargin,
      width + this.voronoiMargin,
      height + this.voronoiMargin
    ]);

    // 各データポイントにVoronoiセル情報を追加
    return textData.map((d, i) => {
      const cell = voronoi.cellPolygon(i);
      if (cell && cell.length > 0) {
        // セルの重心を計算
        const centroid = polygonCentroid(cell);
        return {
          ...d,
          voronoiX: centroid[0],
          voronoiY: centroid[1],
          originalX: d.x,
          originalY: d.y,
          hasVoronoi: true
        };
      } else {
        // Voronoiセルが計算できない場合は元の位置を使用
        return {
          ...d,
          voronoiX: d.x,
          voronoiY: d.y,
          originalX: d.x,
          originalY: d.y,
          hasVoronoi: false
        };
      }
    });
  }

  /**
   * 曲線パスを生成します（接続線用）
   * @private
   * @param x1 - 開始点のX座標
   * @param y1 - 開始点のY座標
   * @param x2 - 終了点のX座標
   * @param y2 - 終了点のY座標
   * @returns SVGパス文字列
   */
  private createCurvedPath(x1: number, y1: number, x2: number, y2: number): string {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dr = Math.sqrt(dx * dx + dy * dy) * 0.3;
    
    // 二次ベジェ曲線を使用
    const cx = (x1 + x2) / 2 + dy * 0.1;
    const cy = (y1 + y2) / 2 - dx * 0.1;
    
    return `M${x1},${y1} Q${cx},${cy} ${x2},${y2}`;
  }

  /**
   * GeoJSONデータを取得します
   * @returns 現在のGeoJSONデータ
   */
  getData(): GeoJSON.FeatureCollection {
    return this.data;
  }
}