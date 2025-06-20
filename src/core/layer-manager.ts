import { CartographyLayer, LayerOptions, LayerStyle } from '../types';
import { Renderer } from './renderer';

/**
 * レイヤーの管理を担当するクラス
 * レイヤーの追加、削除、更新、並び替えを行います
 */
export class LayerManager {
  /** レイヤーを管理するマップ */
  private layers: Map<string, CartographyLayer> = new Map();
  /** レンダラーインスタンス */
  private renderer: Renderer;

  /**
   * レイヤーマネージャーを初期化します
   * @param renderer - レンダラーインスタンス
   */
  constructor(renderer: Renderer) {
    this.renderer = renderer;
  }

  /**
   * レイヤーを追加します
   * @param id - レイヤーの一意識別子
   * @param options - レイヤーの設定オプション
   */
  addLayer(id: string, options: LayerOptions): void {
    // データの正規化
    const data: GeoJSON.FeatureCollection = Array.isArray(options.data)
      ? { type: 'FeatureCollection', features: options.data }
      : options.data as GeoJSON.FeatureCollection;

    // デフォルトスタイル
    const defaultStyle: LayerStyle = {
      fill: '#cccccc',
      stroke: '#333333',
      strokeWidth: 0.5,
      opacity: 1
    };

    const style = { ...defaultStyle, ...options.style };

    // レイヤーオブジェクトを作成
    // zIndexは追加順で自動設定（後から追加されたレイヤーが上に描画される）
    const layer: CartographyLayer = {
      id,
      data,
      style,
      visible: true,
      zIndex: this.getNextZIndex()
    };

    this.layers.set(id, layer);
    this.renderer.renderLayer(layer);
  }

  /**
   * レイヤーを削除します
   * @param id - 削除するレイヤーのID
   */
  removeLayer(id: string): void {
    const layer = this.layers.get(id);
    if (layer) {
      this.renderer.removeLayer(id);
      this.layers.delete(id);
    }
  }

  /**
   * レイヤーのスタイルを更新します
   * @param id - 更新するレイヤーのID
   * @param style - 新しいスタイル
   */
  updateLayerStyle(id: string, style: Partial<LayerStyle>): void {
    const layer = this.layers.get(id);
    if (layer) {
      layer.style = { ...layer.style, ...style };
      this.renderer.updateLayerStyle(layer);
    }
  }

  /**
   * レイヤーの表示/非表示を切り替えます
   * @param id - 切り替えるレイヤーのID
   * @param visible - 表示状態
   */
  setLayerVisibility(id: string, visible: boolean): void {
    const layer = this.layers.get(id);
    if (layer) {
      layer.visible = visible;
      this.renderer.toggleLayerVisibility(layer);
    }
  }

  /**
   * レイヤーの描画順序を変更します
   * @param id - 並び替えるレイヤーのID
   * @param zIndex - 新しいzIndex値
   */
  setLayerZIndex(id: string, zIndex: number): void {
    const layer = this.layers.get(id);
    if (layer) {
      const oldZIndex = layer.zIndex || 0;
      layer.zIndex = zIndex;
      
      // zIndexが変更された場合のみ再配置
      if (oldZIndex !== zIndex) {
        this.reorderLayersOptimized();
      }
    }
  }

  /**
   * 指定されたレイヤーを取得します
   * @param id - レイヤーのID
   * @returns レイヤーオブジェクト
   */
  getLayer(id: string): CartographyLayer | undefined {
    return this.layers.get(id);
  }

  /**
   * 全レイヤーのIDリストを取得します
   * @returns レイヤーIDの配列
   */
  getLayerIds(): string[] {
    return Array.from(this.layers.keys());
  }

  /**
   * 全レイヤーを削除します
   */
  clearAllLayers(): void {
    this.renderer.clearAllLayers();
    this.layers.clear();
  }

  /**
   * 全レイヤーを再描画します
   */
  rerenderAllLayers(): void {
    this.renderer.clearAllLayers();
    
    // zIndexでソートしてから再描画
    const sortedLayers = Array.from(this.layers.values())
      .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    
    sortedLayers.forEach(layer => {
      layer.element = undefined;
      this.renderer.renderLayer(layer);
    });
  }

  /**
   * レイヤーの描画順序を最適化された方法で再整理します
   * 再描画せずにDOM要素の順序のみを変更します
   * @private
   */
  private reorderLayersOptimized(): void {
    // 描画済みのレイヤーを取得してzIndexでソート
    const renderedLayers = Array.from(this.layers.values())
      .filter(layer => layer.element)
      .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

    if (renderedLayers.length === 0) return;

    // 最初のレイヤーの親コンテナを取得
    const container = renderedLayers[0].element!.parentNode as SVGElement;
    if (!container) return;

    // zIndex順に要素を再配置
    renderedLayers.forEach(layer => {
      if (layer.element) {
        // 要素を最後に移動（appendChild は要素を末尾に移動）
        container.appendChild(layer.element);
      }
    });
  }

  /**
   * 次に使用するzIndex値を取得します
   * @private
   * @returns 次のzIndex値
   */
  private getNextZIndex(): number {
    if (this.layers.size === 0) return 0;
    
    const maxZIndex = Math.max(
      ...Array.from(this.layers.values()).map(layer => layer.zIndex || 0)
    );
    
    return maxZIndex + 1;
  }

  /**
   * レイヤーの描画順序を再整理します（後方互換性のため）
   * @private
   * @deprecated reorderLayersOptimized() を使用してください
   */
  private reorderLayers(): void {
    this.reorderLayersOptimized();
  }
}