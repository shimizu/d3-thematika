import { LayerStyle, ILayer } from '../types';
import { GeoProjection } from 'd3-geo';
import { Selection } from 'd3-selection';

/**
 * レイヤーの管理を担当するクラス
 * レイヤーの追加、削除、更新、並び替えを行います
 */
export class LayerManager {
  /** レイヤーインスタンスを管理するマップ */
  private layerInstances: Map<string, ILayer> = new Map();
  /** SVGコンテナ */
  private svgContainer?: Selection<SVGGElement, unknown, HTMLElement, any>;
  /** 現在の投影法 */
  private projection?: GeoProjection;

  /**
   * レイヤーマネージャーを初期化します
   */
  constructor() {
    // レイヤーマネージャーの初期化
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
   * レイヤーインスタンスを追加します
   * @param id - レイヤーの一意識別子
   * @param layerInstance - レイヤーインスタンス
   */
  addLayer(id: string, layerInstance: ILayer): void {
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
    const layerInstance = this.layerInstances.get(id);
    if (layerInstance) {
      layerInstance.destroy();
      this.layerInstances.delete(id);
    }
  }

  /**
   * レイヤーのスタイルを更新します
   * @param id - 更新するレイヤーのID
   * @param style - 新しいスタイル
   */
  updateLayerStyle(id: string, style: Partial<LayerStyle>): void {
    const layerInstance = this.layerInstances.get(id);
    if (layerInstance) {
      layerInstance.setStyle(style);
    }
  }

  /**
   * レイヤーの表示/非表示を切り替えます
   * @param id - 切り替えるレイヤーのID
   * @param visible - 表示状態
   */
  setLayerVisibility(id: string, visible: boolean): void {
    const layerInstance = this.layerInstances.get(id);
    if (layerInstance) {
      layerInstance.setVisible(visible);
    }
  }

  /**
   * レイヤーの描画順序を変更します
   * @param id - 並び替えるレイヤーのID
   * @param zIndex - 新しいzIndex値
   */
  setLayerZIndex(id: string, zIndex: number): void {
    const layerInstance = this.layerInstances.get(id);
    if (layerInstance) {
      const oldZIndex = layerInstance.zIndex;
      layerInstance.setZIndex(zIndex);
      
      // zIndexが変更された場合のみ再配置
      if (oldZIndex !== zIndex) {
        this.reorderLayersOptimized();
      }
    }
  }

  /**
   * 指定されたレイヤーを取得します
   * @param id - レイヤーのID
   * @returns レイヤーインスタンス
   */
  getLayer(id: string): ILayer | undefined {
    return this.layerInstances.get(id);
  }

  /**
   * 全レイヤーのIDリストを取得します
   * @returns レイヤーIDの配列
   */
  getLayerIds(): string[] {
    return Array.from(this.layerInstances.keys());
  }

  /**
   * 全レイヤーを削除します
   */
  clearAllLayers(): void {
    this.layerInstances.forEach(layer => layer.destroy());
    this.layerInstances.clear();
  }

  /**
   * 全レイヤーを再描画します
   */
  rerenderAllLayers(): void {
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
    // レイヤー要素を収集
    const allElements: { element: SVGElement; zIndex: number }[] = [];
    
    // レイヤーインスタンス要素を追加
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
    
    // レイヤーインスタンスの投影法を更新
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
    if (this.layerInstances.size === 0) return 0;
    
    const maxZIndex = Math.max(
      ...Array.from(this.layerInstances.values()).map(layer => layer.zIndex)
    );
    
    return maxZIndex + 1;
  }

}