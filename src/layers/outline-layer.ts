import { Selection, select } from 'd3-selection';
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
  /** クリップパスを作成するかどうか */
  createClipPath?: boolean;
  /** クリップパスのID（指定しない場合は自動生成） */
  clipPathId?: string;
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
  /** クリップパスを作成するかどうか */
  private createClipPath: boolean;
  /** クリップパスのID */
  private clipPathId: string;

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
    
    this.createClipPath = options.createClipPath ?? false;
    this.clipPathId = options.clipPathId || `outline-clip-${this.id}`;
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
    const outlinePathData = this.path(sphereGeometry);
    
    // クリップパスを作成（オプションが有効な場合）
    if (this.createClipPath && outlinePathData) {
      // SVG要素を取得
      const svg = this.layerGroup.node()?.closest('svg');
      if (svg) {
        const svgSelection = select(svg);
        
        const defs = svgSelection.insert<SVGDefsElement>('defs', ':first-child');
        
        // 新しいクリップパスを作成
        const clipPath = defs
          .append('clipPath')
          .attr('id', this.clipPathId);
        
        clipPath
          .append('path')
          .attr('d', outlinePathData);
        
        // cartography-main-groupにクリップパスを適用
        const mainGroup = svgSelection.select('.cartography-main-group');
        if (!mainGroup.empty()) {
          mainGroup.attr('clip-path', this.getClipPathUrl());
        }
      }
    }
    
    // アウトラインパス要素を作成
    const outlinePath = this.layerGroup
      .append('g')
      .attr('class', 'cartography-outline-layer')
      .append('path')
      .datum(sphereGeometry)
      .attr('d', this.path)
      .attr('class', () => {
        const baseClass = 'cartography-outline';
        const customClass = this.style.className || '';
        return [baseClass, customClass].filter(Boolean).join(' ');
      });

    // スタイル属性を適用（共通メソッドを使用）
    this.applyStylesToElement(outlinePath, sphereGeometry, 0);
  }

  /**
   * クリップパスIDを取得します
   * @returns クリップパスのID
   */
  getClipPathId(): string {
    return this.clipPathId;
  }
  
  /**
   * クリップパスURLを取得します
   * @returns クリップパスのURL文字列
   */
  getClipPathUrl(): string {
    return `url(#${this.clipPathId})`;
  }
}