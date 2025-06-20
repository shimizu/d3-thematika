import { select, Selection } from 'd3-selection';
import { GeoProjection } from 'd3-geo';
import { CartographyOptions, LayerOptions, LayerStyle } from './types';
import { createProjection } from './core/projection';
import { Renderer } from './core/renderer';
import { LayerManager } from './core/layer-manager';
import { VectorLayer } from './layers/vector-layer';

/**
 * 地図描画を行うメインクラス（リファクタリング版）
 * モジュール化された構造で、拡張性と保守性を向上させています
 */
export class Cartography {
  /** DOM要素を選択するためのD3セレクション */
  private container: Selection<HTMLElement, unknown, HTMLElement, any>;
  /** SVG要素のD3セレクション */
  private svg: Selection<SVGSVGElement, unknown, HTMLElement, any>;
  /** 地図投影法 */
  private projection: GeoProjection;
  /** レンダラーインスタンス */
  private renderer: Renderer;
  /** レイヤーマネージャーインスタンス */
  private layerManager: LayerManager;
  /** 地図の幅 */
  private width: number;
  /** 地図の高さ */
  private height: number;

  /**
   * Cartographyインスタンスを作成します
   * @param options - 地図の設定オプション
   */
  constructor(options: CartographyOptions) {
    this.width = options.width;
    this.height = options.height;

    // コンテナを選択
    this.container = select(options.container);
    if (this.container.empty()) {
      throw new Error(`Container not found: ${options.container}`);
    }

    // SVG要素を作成
    this.svg = this.container
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height)
      .attr('class', 'cartography-map');

    // 投影法を設定
    this.projection = createProjection(options.projection, this.width, this.height);

    // レンダラーを初期化
    this.renderer = new Renderer({
      svg: this.svg,
      projection: this.projection
    });

    // レイヤーマネージャーを初期化
    this.layerManager = new LayerManager(this.renderer);
  }

  /**
   * 地図にレイヤーを追加します（後方互換性のため）
   * @param id - レイヤーの一意識別子
   * @param options - レイヤーの設定オプション（データとスタイル）
   */
  addLayer(id: string, options: LayerOptions): void {
    this.layerManager.addLayer(id, options);
  }

  /**
   * ベクターレイヤーを追加します（新しいAPI）
   * @param id - レイヤーの一意識別子
   * @param data - GeoJSONデータ
   * @param style - レイヤーのスタイル設定
   * @returns 作成されたベクターレイヤー
   */
  addVectorLayer(
    id: string, 
    data: GeoJSON.FeatureCollection | GeoJSON.Feature[], 
    style: LayerStyle = {}
  ): VectorLayer {
    const vectorLayer = new VectorLayer(id, data, this.projection, style);
    const layerGroup = this.svg.append('g');
    vectorLayer.render(layerGroup);
    return vectorLayer;
  }

  /**
   * 指定されたIDのレイヤーを削除します
   * @param id - 削除するレイヤーのID
   */
  removeLayer(id: string): void {
    this.layerManager.removeLayer(id);
  }

  /**
   * レイヤーのスタイルを更新します
   * @param id - 更新するレイヤーのID
   * @param style - 新しいスタイル
   */
  updateLayerStyle(id: string, style: Partial<LayerStyle>): void {
    this.layerManager.updateLayerStyle(id, style);
  }

  /**
   * レイヤーの表示/非表示を切り替えます
   * @param id - 切り替えるレイヤーのID
   * @param visible - 表示状態
   */
  setLayerVisibility(id: string, visible: boolean): void {
    this.layerManager.setLayerVisibility(id, visible);
  }

  /**
   * レイヤーの描画順序を変更します
   * @param id - 並び替えるレイヤーのID
   * @param zIndex - 新しいzIndex値
   */
  setLayerZIndex(id: string, zIndex: number): void {
    this.layerManager.setLayerZIndex(id, zIndex);
  }

  /**
   * 地図の投影法を変更します
   * @param projection - 新しい投影法（文字列または投影法オブジェクト）
   */
  setProjection(projection: string | GeoProjection): void {
    this.projection = createProjection(projection, this.width, this.height);
    
    // レンダラーの投影法を更新
    this.renderer.updateProjection({
      svg: this.svg,
      projection: this.projection
    });
    
    // 全レイヤーを再描画
    this.layerManager.rerenderAllLayers();
  }

  /**
   * 地図のサイズを変更します
   * @param width - 新しい幅
   * @param height - 新しい高さ
   */
  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;

    // SVGのサイズを更新
    this.svg
      .attr('width', width)
      .attr('height', height);

    // 投影法を再設定
    this.projection = createProjection(this.projection, width, height);
    this.renderer.updateProjection({
      svg: this.svg,
      projection: this.projection
    });

    // 全レイヤーを再描画
    this.layerManager.rerenderAllLayers();
  }

  /**
   * 地図を指定された境界にフィットさせます
   * @param bounds - 境界ボックス [minLng, minLat, maxLng, maxLat]
   * @param padding - パディング（ピクセル）
   */
  fitBounds(bounds: [number, number, number, number], padding: number = 20): void {
    const [[x0, y0], [x1, y1]] = this.projection.invert ? [
      this.projection([bounds[0], bounds[3]])!,
      this.projection([bounds[2], bounds[1]])!
    ] : [[0, 0], [this.width, this.height]];

    const scale = Math.min(
      (this.width - padding * 2) / Math.abs(x1 - x0),
      (this.height - padding * 2) / Math.abs(y1 - y0)
    );

    const translate: [number, number] = [
      this.width / 2 - scale * (x0 + x1) / 2,
      this.height / 2 - scale * (y0 + y1) / 2
    ];

    this.projection.scale(scale).translate(translate);
    this.renderer.updateProjection({
      svg: this.svg,
      projection: this.projection
    });
    this.layerManager.rerenderAllLayers();
  }

  /**
   * 全レイヤーを削除します
   */
  clearAllLayers(): void {
    this.layerManager.clearAllLayers();
  }

  /**
   * 地図のSVG要素を取得します
   * @returns 地図が描画されているSVG要素
   */
  getSVG(): SVGSVGElement {
    return this.svg.node()!;
  }

  /**
   * 現在の投影法を取得します
   * @returns 現在使用されている投影法オブジェクト
   */
  getProjection(): GeoProjection {
    return this.projection;
  }

  /**
   * レイヤーマネージャーを取得します
   * @returns レイヤーマネージャーインスタンス
   */
  getLayerManager(): LayerManager {
    return this.layerManager;
  }

  /**
   * 地図のサイズを取得します
   * @returns [width, height]
   */
  getSize(): [number, number] {
    return [this.width, this.height];
  }

  /**
   * 全レイヤーのIDリストを取得します
   * @returns レイヤーIDの配列
   */
  getLayerIds(): string[] {
    return this.layerManager.getLayerIds();
  }
}