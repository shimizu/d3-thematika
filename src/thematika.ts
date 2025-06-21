import { select, Selection } from 'd3-selection';
import { GeoProjection } from 'd3-geo';
import { ThematikaOptions, LayerStyle, ILayer } from './types';
import { LayerManager } from './core/layer-manager';
import { GeojsonLayer } from './layers/geojson-layer';

/**
 * 主題図描画を行うメインクラス（リファクタリング版）
 * モジュール化された構造で、拡張性と保守性を向上させています
 */
export class Thematika {
  /** DOM要素を選択するためのD3セレクション */
  private container: Selection<HTMLElement, unknown, HTMLElement, any>;
  /** SVG要素のD3セレクション */
  private svg: Selection<SVGSVGElement, unknown, HTMLElement, any>;
  /** メインのSVGグループ要素 */
  private svgGroup: Selection<SVGGElement, unknown, HTMLElement, any>;
  /** 地図投影法 */
  private projection: GeoProjection;
  /** レイヤーマネージャーインスタンス */
  private layerManager: LayerManager;
  /** 地図の幅 */
  private width: number;
  /** 地図の高さ */
  private height: number;

  /**
   * Thematikaインスタンスを作成します
   * @param options - 主題図の設定オプション
   */
  constructor(options: ThematikaOptions) {
    this.width = options.width;
    this.height = options.height;

    // コンテナを選択
    this.container = select(options.container);
    if (this.container.empty()) {
      throw new Error(`Container not found: ${options.container}`);
    }


    // すでにSVGが存在する場合は削除
    this.container.selectAll('svg.thematika-map').remove();

    // SVG要素を作成
    this.svg = this.container
      .append('svg')
      .attr('width', "100%")
      .attr('height', "100%")
      .attr('class', 'thematika-map')
      .attr("viewBox", `0 0 ${this.width} ${this.height}`)
      .attr("preserveAspectRatio", "xMidYMid meet");

    // defsオプションが指定されている場合、テクスチャを初期化
    this.initializeDefs(options.defs);

    // メインのSVGグループを作成
    this.svgGroup = this.svg.append('g')
      .attr('class', 'thematika-main-group');

    // 投影法を設定
    this.projection = options.projection;

    // レイヤーマネージャーを初期化
    this.layerManager = new LayerManager();
    this.layerManager.setContext(this.svgGroup, this.projection);
  }

  /**
   * 主題図にレイヤーを追加します
   * @param id - レイヤーの一意識別子
   * @param layer - レイヤーインスタンス
   */
  addLayer(id: string, layer: ILayer): void {
    this.layerManager.addLayer(id, layer);
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
   * @param projection - 新しい投影法オブジェクト
   */
  setProjection(projection: GeoProjection): void {
    this.projection = projection;
    
    // レイヤーマネージャーの投影法を更新
    this.layerManager.updateProjection(this.projection);
    
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

    // 投影法のサイズを更新（必要に応じて）
    // 注意: 多くのD3投影法はsize/scaleの再設定が必要な場合があります
    
    // レイヤーマネージャーの投影法を更新
    this.layerManager.updateProjection(this.projection);

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
    this.layerManager.updateProjection(this.projection);
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


  /**
   * defs要素を初期化します（初期化時の内部メソッド）
   * @private
   */
  private initializeDefs(defs?: any[]): void {
    if (!defs) return;

    // 配列の各要素を順番に適用
    defs.forEach(def => {
      this.svg.call(def);
    });
  }
}