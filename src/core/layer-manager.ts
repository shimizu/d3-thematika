import { CartographyLayer, LayerOptions, LayerStyle, ILayer } from '../types';
import { Renderer } from './renderer';
import { GeoProjection } from 'd3-geo';
import { Selection } from 'd3-selection';

/**
 * レイヤーの管理を担当するクラス
 * レイヤーの追加、削除、更新、並び替えを行います
 */
export class LayerManager {
  /** 従来のレイヤーを管理するマップ */
  private layers: Map<string, CartographyLayer> = new Map();
  /** 新しいレイヤーインスタンスを管理するマップ */
  private layerInstances: Map<string, ILayer> = new Map();
  /** レンダラーインスタンス */
  private renderer: Renderer;
  /** SVGコンテナ */
  private svgContainer?: Selection<SVGGElement, unknown, HTMLElement, any>;
  /** 現在の投影法 */
  private projection?: GeoProjection;

  /**
   * レイヤーマネージャーを初期化します
   * @param renderer - レンダラーインスタンス
   */
  constructor(renderer: Renderer) {
    this.renderer = renderer;
  }

  /**
   * SVGコンテナと投影法を設定します
   * @param svgContainer - SVGコンテナ
   * @param projection - 投影法
   */
  setContext(svgContainer: Selection<SVGGElement, unknown, HTMLElement, any>, projection: GeoProjection): void {
    this.svgContainer = svgContainer;
    this.projection = projection;
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
   * レイヤーインスタンスを追加します（新しいAPI）
   * @param id - レイヤーの一意識別子
   * @param layerInstance - レイヤーインスタンス
   */
  addLayerInstance(id: string, layerInstance: ILayer): void {
    if (!this.svgContainer) {
      throw new Error('SVG container not set. Call setContext() first.');
    }

    // 投影法をレイヤーに設定（VectorLayerの場合）
    if (this.projection && 'setProjection' in layerInstance) {
      (layerInstance as any).setProjection(this.projection);
    }

    // zIndexを設定
    layerInstance.zIndex = this.getNextZIndex();

    // レイヤーを描画
    layerInstance.render(this.svgContainer);

    // レイヤーを管理に追加
    this.layerInstances.set(id, layerInstance);
  }

  /**
   * レイヤーを削除します
   * @param id - 削除するレイヤーのID
   */
  removeLayer(id: string): void {
    // 新しいレイヤーインスタンスの場合
    const layerInstance = this.layerInstances.get(id);
    if (layerInstance) {
      layerInstance.destroy();
      this.layerInstances.delete(id);
      return;
    }

    // 従来のレイヤーの場合
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
    // 新しいレイヤーインスタンスの場合
    const layerInstance = this.layerInstances.get(id);
    if (layerInstance) {
      layerInstance.setStyle(style);
      return;
    }

    // 従来のレイヤーの場合
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
    // 新しいレイヤーインスタンスの場合
    const layerInstance = this.layerInstances.get(id);
    if (layerInstance) {
      layerInstance.setVisible(visible);
      return;
    }

    // 従来のレイヤーの場合
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
    // 新しいレイヤーインスタンスの場合
    const layerInstance = this.layerInstances.get(id);
    if (layerInstance) {
      const oldZIndex = layerInstance.zIndex;
      layerInstance.setZIndex(zIndex);
      
      // zIndexが変更された場合のみ再配置
      if (oldZIndex !== zIndex) {
        this.reorderLayersOptimized();
      }
      return;
    }

    // 従来のレイヤーの場合
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
   * 指定されたレイヤーインスタンスを取得します
   * @param id - レイヤーのID
   * @returns レイヤーインスタンス
   */
  getLayerInstance(id: string): ILayer | undefined {
    return this.layerInstances.get(id);
  }

  /**
   * 全レイヤーのIDリストを取得します
   * @returns レイヤーIDの配列
   */
  getLayerIds(): string[] {
    const layerIds = Array.from(this.layers.keys());
    const instanceIds = Array.from(this.layerInstances.keys());
    return [...layerIds, ...instanceIds];
  }

  /**
   * 全レイヤーを削除します
   */
  clearAllLayers(): void {
    // 新しいレイヤーインスタンスを削除
    this.layerInstances.forEach(layer => layer.destroy());
    this.layerInstances.clear();
    
    // 従来のレイヤーを削除
    this.renderer.clearAllLayers();
    this.layers.clear();
  }

  /**
   * 全レイヤーを再描画します
   */
  rerenderAllLayers(): void {
    // 従来のレイヤーを再描画
    this.renderer.clearAllLayers();
    const sortedLayers = Array.from(this.layers.values())
      .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
    sortedLayers.forEach(layer => {
      layer.element = undefined;
      this.renderer.renderLayer(layer);
    });

    // 新しいレイヤーインスタンスを再描画
    if (this.svgContainer) {
      const sortedInstances = Array.from(this.layerInstances.values())
        .sort((a, b) => a.zIndex - b.zIndex);
      
      sortedInstances.forEach(layer => {
        layer.destroy();
        if (this.projection && 'setProjection' in layer) {
          (layer as any).setProjection(this.projection);
        }
        layer.render(this.svgContainer!);
      });
    }
  }

  /**
   * レイヤーの描画順序を最適化された方法で再整理します
   * 再描画せずにDOM要素の順序のみを変更します
   * @private
   */
  private reorderLayersOptimized(): void {
    // 全てのレイヤー要素を収集
    const allElements: { element: SVGElement; zIndex: number }[] = [];
    
    // 従来のレイヤー要素を追加
    Array.from(this.layers.values())
      .filter(layer => layer.element)
      .forEach(layer => {
        allElements.push({ element: layer.element!, zIndex: layer.zIndex || 0 });
      });
    
    // 新しいレイヤーインスタンス要素を追加
    Array.from(this.layerInstances.values())
      .filter(layer => layer.isRendered())
      .forEach(layer => {
        const element = (layer as any).element;
        if (element) {
          allElements.push({ element, zIndex: layer.zIndex });
        }
      });

    if (allElements.length === 0) return;

    // zIndexでソート
    allElements.sort((a, b) => a.zIndex - b.zIndex);

    // 最初の要素の親コンテナを取得
    const container = allElements[0].element.parentNode as SVGElement;
    if (!container) return;

    // zIndex順に要素を再配置
    allElements.forEach(({ element }) => {
      container.appendChild(element);
    });
  }

  /**
   * 投影法を更新します
   * @param projection - 新しい投影法
   */
  updateProjection(projection: GeoProjection): void {
    this.projection = projection;
    
    // 新しいレイヤーインスタンスの投影法を更新
    this.layerInstances.forEach(layer => {
      if ('setProjection' in layer) {
        (layer as any).setProjection(projection);
      }
    });
  }

  /**
   * 次に使用するzIndex値を取得します
   * @private
   * @returns 次のzIndex値
   */
  private getNextZIndex(): number {
    let maxZIndex = -1;
    
    // 従来のレイヤーからzIndexの最大値を取得
    if (this.layers.size > 0) {
      maxZIndex = Math.max(maxZIndex, 
        ...Array.from(this.layers.values()).map(layer => layer.zIndex || 0)
      );
    }
    
    // 新しいレイヤーインスタンスからzIndexの最大値を取得
    if (this.layerInstances.size > 0) {
      maxZIndex = Math.max(maxZIndex,
        ...Array.from(this.layerInstances.values()).map(layer => layer.zIndex)
      );
    }
    
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