import { Selection } from 'd3-selection';
import { geoPath, GeoPath, GeoProjection } from 'd3-geo';
import { BaseLayer } from './base-layer';
import { LayerStyle, IGeojsonLayer } from '../types';

/**
 * OutlineLayerの初期化オプション
 */
export interface OutlineLayerOptions {
  /** レイヤーのスタイル設定 */
  style?: LayerStyle;
  /** レイヤーの属性設定（styleのエイリアス） */
  attr?: LayerStyle;
}

/**
 * 地球の輪郭（アウトライン）を描画するレイヤークラス
 * D3のSphereジオメトリを使用して投影法の境界を描画します
 */
export class OutlineLayer extends BaseLayer implements IGeojsonLayer {
  /** パス生成器 */
  private path?: GeoPath;
  /** レイヤーグループ */
  private layerGroup?: Selection<SVGGElement, unknown, HTMLElement, any>;

  /**
   * OutlineLayerを初期化します
   * @param options - レイヤーの設定オプション
   */
  constructor(options: OutlineLayerOptions = {}) {
    // 一意のIDを自動生成
    // style または attr のどちらかを使用（attr が優先）
    const defaultStyle: LayerStyle = {
      fill: 'none',
      stroke: '#333333',
      strokeWidth: 1,
      opacity: 1
    };
    
    super(`outline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, 
          { ...defaultStyle, ...(options.attr || options.style) });
  }

  /**
   * 投影法を設定します
   * @param projection - 地図投影法
   */
  setProjection(projection: GeoProjection): void {
    this.path = geoPath(projection);
    if (this.layerGroup) {
      this.update();
    }
  }

  /**
   * レイヤーを描画します
   * @param container - 描画先のSVGコンテナ
   */
  render(container: Selection<SVGGElement, unknown, HTMLElement, any>): void {
    this.layerGroup = this.createLayerGroup(container);
    this.renderOutline();
  }

  /**
   * レイヤーを更新します
   */
  update(): void {
    if (this.layerGroup) {
      this.layerGroup.selectAll('path').remove();
      this.renderOutline();
    }
  }

  /**
   * アウトラインを描画します
   * @private
   */
  private renderOutline(): void {
    if (!this.layerGroup || !this.path) return;

    // Sphereジオメトリを使用してアウトラインパスを生成
    const sphereGeometry = { type: "Sphere" as const };
    
    // スタイル属性を効率的に適用
    const styleProperties = [
      { key: 'fill' as const, method: 'attr' as const, attr: undefined },
      { key: 'stroke' as const, method: 'attr' as const, attr: undefined },
      { key: 'strokeWidth' as const, method: 'attr' as const, attr: 'stroke-width' },
      { key: 'strokeDasharray' as const, method: 'attr' as const, attr: 'stroke-dasharray' },
      { key: 'opacity' as const, method: 'attr' as const, attr: undefined },
      { key: 'filter' as const, method: 'attr' as const, attr: undefined }
    ];

    // アウトラインパス要素を作成
    const outlinePath = this.layerGroup
      .append('path')
      .datum(sphereGeometry)
      .attr('d', this.path)
      .attr('class', () => {
        const baseClass = 'cartography-outline';
        const customClass = this.style.className || '';
        return [baseClass, customClass].filter(Boolean).join(' ');
      });

    // スタイル属性を適用
    styleProperties.forEach(({ key, method, attr }) => {
      const value = this.style[key];
      const attrName = attr || key;
      
      if (value !== undefined) {
        // 関数型の場合は直接値を渡し、非関数型の場合はそのまま渡す
        const finalValue = typeof value === 'function' ? value({} as any, 0) : value;
        outlinePath[method as 'style' | 'attr'](attrName, finalValue);
      }
    });
  }
}