import { Selection } from 'd3-selection';
import { geoPath, geoArea, GeoPath, GeoProjection } from 'd3-geo';
import { BaseLayer } from '../core/base-layer';
import { LayerAttr, LayerStyle, IGeojsonLayer } from '../../types';

/**
 * GeojsonLayerの初期化オプション
 */
export interface GeojsonLayerOptions {
  /** GeoJSONデータ */
  data: GeoJSON.FeatureCollection | GeoJSON.Feature[];
  /** レイヤーのSVG属性設定 */
  attr?: LayerAttr;
  /** レイヤーのCSS style属性設定 */
  style?: LayerStyle;
}

/**
 * GeoJSONデータを描画するレイヤークラス
 */
export class GeojsonLayer extends BaseLayer<LayerAttr<GeoJSON.Feature>, LayerStyle<GeoJSON.Feature>> implements IGeojsonLayer {
  /** GeoJSONデータ */
  private data: GeoJSON.FeatureCollection;
  /** パス生成器 */
  private path?: GeoPath;
  /** レイヤーグループ */
  private layerGroup?: Selection<SVGGElement, unknown, HTMLElement, any>;

  /**
   * GeoJSONレイヤーを初期化します
   * @param options - レイヤーの設定オプション
   */
  constructor(options: GeojsonLayerOptions) {
    // 一意のIDを自動生成
    super(`geojson-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, options.attr || {}, options.style || {});
    
    // データの正規化
    this.data = Array.isArray(options.data)
      ? { type: 'FeatureCollection', features: options.data }
      : options.data as GeoJSON.FeatureCollection;

    this.warnIfInvalidWinding();
  }

  /**
   * ワインディング順序が逆（CCW外側リング）の疑いがあるポリゴンを検出して警告します。
   * D3はGeoJSON仕様(RFC7946)と逆に外側リングが時計回り(CW)であることを期待するため、
   * CCWのポリゴンは球面上で「そのポリゴンの外側全体」と解釈され、
   * geoAreaが半球(2πステラジアン)を超える巨大な面積になる。
   * @private
   */
  private warnIfInvalidWinding(): void {
    const HALF_SPHERE = 2 * Math.PI;
    const suspicious: (string | number)[] = [];

    this.data.features.forEach((feature, i) => {
      const type = feature.geometry?.type;
      if (type !== 'Polygon' && type !== 'MultiPolygon') return;
      if (geoArea(feature) > HALF_SPHERE) {
        suspicious.push(feature.properties?.name ?? feature.id ?? i);
      }
    });

    if (suspicious.length > 0) {
      const shown = suspicious.slice(0, 5).join(', ');
      const more = suspicious.length > 5 ? ` ほか${suspicious.length - 5}件` : '';
      console.warn(
        `[thematika] GeojsonLayer: ${suspicious.length}個のポリゴン(${shown}${more})の面積が半球を超えています。` +
        `ワインディング順序がD3の期待(外側リング: 時計回り)と逆である可能性が高く、描画が壊れる原因になります。` +
        `node scripts/fix-geojson-winding.js <file> --d3 などで修正してください。`
      );
    }
  }

  /**
   * 投影法を設定します
   * @param projection - 地図投影法
   */
  setProjection(projection: GeoProjection): void {
    this.path = geoPath(projection);
    if (this.layerGroup) {
      this.layerGroup.selectAll('path').remove();
      this.renderFeatures();
    }
  }

  /**
   * レイヤーを描画します
   * @param container - 描画先のSVGコンテナ
   */
  render(container: Selection<SVGGElement, unknown, HTMLElement, any>): void {
    this.layerGroup = this.createLayerGroup(container);
    this.renderFeatures();
  }




  /**
   * フィーチャーを描画します
   * @private
   */
  private renderFeatures(): void {
    if (!this.layerGroup || !this.path) return;

    // パス要素を作成
    const paths = this.layerGroup
      .append('g')
      .attr('class', 'thematika-geojson-layer')
      .selectAll('path')
      .data(this.data.features)
      .enter()
      .append('path')
      .attr('d', this.path)
      .attr('class', d => {
        const baseClass = 'thematika-feature';
        const customClass = this.attr.className || '';
        const featureClass = (d.properties?.class as string) || '';
        return [baseClass, customClass, featureClass].filter(Boolean).join(' ');
      })

    // SVG属性とスタイルを適用（共通メソッドを使用）
    this.applyAllStylesToElements(paths, this.layerGroup);
  }



  /**
   * GeoJSONデータを取得します
   * @returns 現在のGeoJSONデータ
   */
  getData(): GeoJSON.FeatureCollection {
    return this.data;
  }

}