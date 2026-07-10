import { Selection } from 'd3-selection';
import { GeoProjection } from 'd3-geo';
import { BaseLayer } from '../core/base-layer';
import { LayerAttr, LayerStyle, IGeojsonLayer } from '../../types';
import { getCentroid } from '../../utils/gis-utils';

/**
 * TextLayerの初期化オプション
 */
export interface TextLayerOptions {
  /** GeoJSONデータ */
  data: GeoJSON.FeatureCollection | GeoJSON.Feature[];
  /** レイヤーの属性設定 */
  attr?: LayerAttr;
  /** レイヤーのCSS style属性設定 */
  style?: LayerStyle;
  /** テキスト内容を取得するプロパティ名または関数（デフォルト: 'name'） */
  textProperty?: string | ((feature: GeoJSON.Feature, index: number) => string);
}

/**
 * GeoJSONデータにテキストラベルを描画するレイヤークラス
 * ポイントならそのまま、ポリゴンやラインなら中心点にテキストを配置
 */
export class TextLayer extends BaseLayer<LayerAttr<GeoJSON.Feature>, LayerStyle<GeoJSON.Feature>> implements IGeojsonLayer {
  /** GeoJSONデータ */
  private data: GeoJSON.FeatureCollection;
  /** 投影法 */
  private projection?: GeoProjection;
  /** レイヤーグループ */
  private layerGroup?: Selection<SVGGElement, unknown, HTMLElement, any>;
  /** テキスト取得関数 */
  private textAccessor: (feature: GeoJSON.Feature, index: number) => string;

  /**
   * TextLayerを初期化します
   * @param options - レイヤーの設定オプション
   */
  constructor(options: TextLayerOptions) {
    super(`text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, options.attr || {}, options.style || {});

    // データの正規化
    this.data = Array.isArray(options.data)
      ? { type: 'FeatureCollection', features: options.data }
      : options.data as GeoJSON.FeatureCollection;

    // テキスト取得関数
    if (typeof options.textProperty === 'function') {
      this.textAccessor = options.textProperty;
    } else {
      const prop = options.textProperty || 'name';
      this.textAccessor = (feature) => (feature.properties?.[prop] as string) || '';
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
   * 投影法を設定します
   * @param projection - 新しい投影法
   */
  setProjection(projection: GeoProjection): void {
    this.projection = projection;
    if (this.layerGroup) {
      this.renderTexts();
    }
  }

  /**
   * テキスト要素を描画します
   * @private
   */
  private renderTexts(): void {
    if (!this.layerGroup || !this.projection) return;

    // 既存のテキストを削除
    this.layerGroup.selectAll('g.thematika-text-layer').remove();

    // 各フィーチャーのデータを準備
    const textData = this.data.features.map((feature, index) => {
      let coordinates: [number, number];

      if (feature.geometry.type === 'Point') {
        coordinates = feature.geometry.coordinates as [number, number];
      } else {
        const centroid = getCentroid(feature);
        coordinates = [centroid.x, centroid.y];
      }

      const projectedCoords = this.projection!(coordinates);

      return {
        feature,
        index,
        projected: projectedCoords,
        text: this.textAccessor(feature, index)
      };
    })
      // 投影範囲外（projectionがnullを返した）のフィーチャーは描画しない
      .filter((d): d is typeof d & { projected: [number, number] } =>
        d.projected !== null && isFinite(d.projected[0]) && isFinite(d.projected[1]) && !!d.text
      )
      .map(d => ({ feature: d.feature, index: d.index, x: d.projected[0], y: d.projected[1], text: d.text }));

    // テキスト要素を作成
    // paint-order: stroke により、attrでstroke/stroke-widthを指定するだけで
    // 文字の背面に縁取り（ハロー）が描画される
    const texts = this.layerGroup
      .append('g')
      .attr('class', 'thematika-text-layer')
      .attr('paint-order', 'stroke')
      .attr('stroke-linejoin', 'round')
      .attr('stroke-linecap', 'round')
      .selectAll('text')
      .data(textData)
      .enter()
      .append('text')
      .attr('x', d => d.x)
      .attr('y', d => d.y)
      .attr('class', d => {
        const baseClass = 'thematika-text';
        const customClass = this.attr.className || '';
        const featureClass = (d.feature.properties?.class as string) || '';
        return [baseClass, customClass, featureClass].filter(Boolean).join(' ');
      })
      .text(d => d.text);

    // 属性とスタイルを適用
    this.applyAllStylesToElements(texts, this.layerGroup);
  }

  /** text要素固有の属性は個々の要素に直接適用する */
  private static readonly TEXT_ELEMENT_ATTRS = new Set([
    'dx', 'dy', 'text-anchor', 'alignment-baseline', 'dominant-baseline',
    'font-family', 'font-size', 'font-weight', 'font-style',
    'text-decoration', 'letter-spacing', 'word-spacing'
  ]);

  protected applyAttributesToElements(
    elements: Selection<any, any, any, any>,
    layerGroup: Selection<SVGGElement, unknown, HTMLElement, any>
  ): void {
    Object.entries(this.attr).forEach(([property, value]) => {
      if (value !== undefined && property !== 'className') {
        const attrName = BaseLayer.normalizePropertyName(property);
        if (typeof value === 'function') {
          elements.attr(attrName, (d: any, i: number) => (value as Function)(d, i));
        } else if (TextLayer.TEXT_ELEMENT_ATTRS.has(attrName)) {
          // text要素固有の属性は個々の要素に適用
          elements.attr(attrName, value);
        } else {
          layerGroup.attr(attrName, value);
        }
      }
    });
  }

  /**
   * GeoJSONデータを取得します
   * @returns 現在のGeoJSONデータ
   */
  getData(): GeoJSON.FeatureCollection {
    return this.data;
  }
}
