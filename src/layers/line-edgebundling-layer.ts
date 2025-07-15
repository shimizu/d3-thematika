import { Selection, select as d3Select } from 'd3-selection';
import { geoPath, GeoPath, GeoProjection } from 'd3-geo';
import { line, curveBundle } from 'd3-shape';
import { forceSimulation, forceLink, forceManyBody } from 'd3-force';
import { BaseLayer } from './base-layer';
import { LayerAttr, LayerStyle, ILineConnectionLayer } from '../types';
import * as GeoJSON from 'geojson';

/**
 * バンドリング用のノード構造
 */
interface BundlingNode {
  /** ノードID */
  id: string;
  /** X座標 */
  x: number;
  /** Y座標 */
  y: number;
  /** 固定X座標（端点用） */
  fx?: number;
  /** 固定Y座標（端点用） */
  fy?: number;
  /** ノードタイプ */
  type: 'endpoint' | 'control';
  /** 関連するフィーチャー */
  feature?: GeoJSON.Feature;
  /** フィーチャーインデックス */
  featureIndex?: number;
  /** MultiLineString内のラインインデックス */
  lineIndex?: number;
}

/**
 * バンドリング用のリンク構造
 */
interface BundlingLink {
  /** ソースノード */
  source: BundlingNode | string;
  /** ターゲットノード */
  target: BundlingNode | string;
}

/**
 * バンドリング用のパス構造
 */
interface BundlingPath {
  /** パスを構成するノード配列 */
  nodes: BundlingNode[];
  /** 関連するフィーチャー */
  feature: GeoJSON.Feature;
  /** フィーチャーインデックス */
  featureIndex: number;
  /** MultiLineString内のラインインデックス */
  lineIndex?: number;
}

/**
 * バンドリングデータ構造
 */
interface BundlingData {
  /** ノード配列 */
  nodes: BundlingNode[];
  /** リンク配列 */
  links: BundlingLink[];
  /** パス配列 */
  paths: BundlingPath[];
}

/**
 * LineEdgeBundlingLayerの初期化オプション
 */
export interface LineEdgeBundlingLayerOptions {
  /** GeoJSONデータ（LineString/MultiLineString） */
  data: GeoJSON.Feature | GeoJSON.Feature[] | GeoJSON.FeatureCollection;
  /** レイヤーの属性設定 */
  attr?: LayerAttr;
  /** レイヤーのCSS style属性設定 */
  style?: LayerStyle;
  /** バンドリング強度（0-1、デフォルト: 0.85） */
  bundlingStrength?: number;
  /** Force-directed layoutの強度（デフォルト: 20） */
  forceStrength?: number;
  /** 制御点の数（デフォルト: 'auto'、自動計算） */
  segmentSteps?: number | 'auto';
  /** 制御点を表示するか（デフォルト: false） */
  showControlPoints?: boolean;
  /** 元のラインも表示するか（デフォルト: false） */
  showOriginalLines?: boolean;
  /** Force layoutをアニメーションするか（デフォルト: true） */
  animateForce?: boolean;
  /** 制御点のサイズ（デフォルト: 3） */
  controlPointSize?: number;
  /** 端点のサイズ（デフォルト: 6） */
  endpointSize?: number;
}

/**
 * エッジバンドリング効果を適用したラインレイヤークラス
 * D3のcurveBundleとForce-directed layoutを使用して複数のラインを視覚的に整理します
 */
export class LineEdgeBundlingLayer extends BaseLayer implements ILineConnectionLayer {
  /** GeoJSONデータ */
  private data: GeoJSON.FeatureCollection;
  /** パス生成器 */
  private path?: GeoPath;
  /** レイヤーグループ */
  private layerGroup?: Selection<SVGGElement, unknown, HTMLElement, any>;
  /** 投影法 */
  private projection?: GeoProjection;
  /** バンドリング強度 */
  private bundlingStrength: number;
  /** Force-directed layoutの強度 */
  private forceStrength: number;
  /** 制御点の数設定 */
  private segmentSteps: number | 'auto';
  /** 制御点を表示するか */
  private showControlPoints: boolean;
  /** 元のラインも表示するか */
  private showOriginalLines: boolean;
  /** Force layoutをアニメーションするか */
  private animateForce: boolean;
  /** 制御点のサイズ */
  private controlPointSize: number;
  /** 端点のサイズ */
  private endpointSize: number;
  /** Force simulation */
  private simulation?: any;
  /** バンドリングデータ */
  private bundlingData?: BundlingData;

  /**
   * LineEdgeBundlingLayerを初期化します
   * @param options - レイヤーの設定オプション
   */
  constructor(options: LineEdgeBundlingLayerOptions) {
    // 一意のIDを自動生成
    super(`line-edgebundling-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, options.attr || {}, options.style || {});
    
    // データをFeatureCollectionに正規化
    if (Array.isArray(options.data)) {
      this.data = { type: 'FeatureCollection', features: options.data };
    } else if (options.data.type === 'Feature') {
      this.data = { type: 'FeatureCollection', features: [options.data as GeoJSON.Feature] };
    } else {
      this.data = options.data as GeoJSON.FeatureCollection;
    }
    
    // データ検証
    this.validateData(this.data);
    
    // オプション設定
    this.bundlingStrength = options.bundlingStrength ?? 0.85;
    this.forceStrength = options.forceStrength ?? 20;
    this.segmentSteps = options.segmentSteps ?? 'auto';
    this.showControlPoints = options.showControlPoints ?? false;
    this.showOriginalLines = options.showOriginalLines ?? false;
    this.animateForce = options.animateForce ?? true;
    this.controlPointSize = options.controlPointSize ?? 3;
    this.endpointSize = options.endpointSize ?? 6;
  }

  /**
   * データを検証します
   * @param data - 検証対象のデータ
   * @private
   */
  private validateData(data: GeoJSON.FeatureCollection): void {
    if (!data || data.type !== 'FeatureCollection') {
      throw new Error('LineEdgeBundlingLayer: データはFeatureCollectionである必要があります');
    }

    if (!Array.isArray(data.features)) {
      throw new Error('LineEdgeBundlingLayer: featuresが配列ではありません');
    }

    data.features.forEach((feature, index) => {
      if (!feature.geometry) {
        throw new Error(`LineEdgeBundlingLayer: フィーチャー[${index}]にgeometryが存在しません`);
      }

      const geometry = feature.geometry as GeoJSON.LineString | GeoJSON.MultiLineString;
      const { type, coordinates } = geometry;
      
      if (type !== 'LineString' && type !== 'MultiLineString') {
        throw new Error(`LineEdgeBundlingLayer: フィーチャー[${index}]は'LineString'または'MultiLineString'である必要があります`);
      }

      // 座標の検証
      if (type === 'LineString') {
        this.validateCoordinates(coordinates as GeoJSON.Position[], index);
      } else if (type === 'MultiLineString') {
        (coordinates as GeoJSON.Position[][]).forEach((line, lineIndex) => {
          this.validateCoordinates(line, index, lineIndex);
        });
      }
    });
  }

  /**
   * 座標配列を検証します
   * @private
   */
  private validateCoordinates(coordinates: GeoJSON.Position[], featureIndex: number, lineIndex?: number): void {
    const lineId = lineIndex !== undefined ? `[${featureIndex}]のライン[${lineIndex}]` : `[${featureIndex}]`;
    
    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      throw new Error(`LineEdgeBundlingLayer: フィーチャー${lineId}は少なくとも2点の座標が必要です`);
    }

    coordinates.forEach((coord, coordIndex) => {
      if (!Array.isArray(coord) || coord.length < 2) {
        throw new Error(`LineEdgeBundlingLayer: フィーチャー${lineId}の座標[${coordIndex}]は[経度, 緯度]の配列である必要があります`);
      }

      const [lon, lat] = coord;
      if (lon < -180 || lon > 180) {
        throw new Error(`LineEdgeBundlingLayer: フィーチャー${lineId}の座標[${coordIndex}]の経度は-180から180の範囲である必要があります`);
      }

      if (lat < -90 || lat > 90) {
        throw new Error(`LineEdgeBundlingLayer: フィーチャー${lineId}の座標[${coordIndex}]の緯度は-90から90の範囲である必要があります`);
      }
    });
  }

  /**
   * 投影法を設定します
   * @param projection - 地図投影法
   */
  setProjection(projection: GeoProjection): void {
    this.projection = projection;
    this.path = geoPath(projection);
    if (this.layerGroup) {
      // 既存の要素をクリア
      this.layerGroup.selectAll('*').remove();
      // Force simulationを停止
      if (this.simulation) {
        this.simulation.stop();
      }
      // 再描画
      this.renderBundledLines();
    }
  }

  /**
   * レイヤーを描画します
   * @param container - 描画先のSVGコンテナ
   */
  render(container: Selection<SVGGElement, unknown, HTMLElement, any>): void {
    this.layerGroup = this.createLayerGroup(container);
    this.renderBundledLines();
  }

  /**
   * バンドリングされたラインを描画します
   * @private
   */
  private renderBundledLines(): void {
    if (!this.layerGroup || !this.path || !this.projection) return;

    // バンドリングデータを生成
    this.bundlingData = this.generateBundlingData();

    if (!this.bundlingData || this.bundlingData.paths.length === 0) return;

    // グループを作成
    const bundleGroup = this.layerGroup
      .append('g')
      .attr('class', 'thematika-line-edgebundling-layer');

    // 元のラインを描画（オプション）
    if (this.showOriginalLines) {
      this.renderOriginalLines(bundleGroup);
    }

    // バンドリングされたラインを描画
    this.renderBundledPaths(bundleGroup);

    // 制御点を描画（オプション）
    if (this.showControlPoints) {
      this.renderControlPoints(bundleGroup);
    }

    // Force simulationを開始
    this.startForceSimulation();
  }

  /**
   * GeoJSONからバンドリング用のデータを生成します
   * @returns バンドリングデータ
   * @private
   */
  private generateBundlingData(): BundlingData {
    const bundle: BundlingData = {
      nodes: [],
      links: [],
      paths: []
    };

    const nodeMap = new Map<string, BundlingNode>();
    let nodeId = 0;

    // 各LineStringを処理
    this.data.features.forEach((feature, featureIndex) => {
      const geometry = feature.geometry;
      
      if (geometry.type === 'LineString') {
        const pathData = this.processLineString(
          geometry.coordinates as GeoJSON.Position[],
          feature,
          featureIndex,
          bundle,
          nodeMap,
          nodeId
        );
        if (pathData) {
          nodeId = pathData.nextNodeId;
        }
      } else if (geometry.type === 'MultiLineString') {
        (geometry.coordinates as GeoJSON.Position[][]).forEach((line, lineIndex) => {
          const pathData = this.processLineString(
            line,
            feature,
            featureIndex,
            bundle,
            nodeMap,
            nodeId,
            lineIndex
          );
          if (pathData) {
            nodeId = pathData.nextNodeId;
          }
        });
      }
    });

    return bundle;
  }

  /**
   * 単一のLineStringを処理してバンドリングデータに追加します
   * @private
   */
  private processLineString(
    coordinates: GeoJSON.Position[],
    feature: GeoJSON.Feature,
    featureIndex: number,
    bundle: BundlingData,
    nodeMap: Map<string, BundlingNode>,
    currentNodeId: number,
    lineIndex?: number
  ): { nextNodeId: number } | null {
    if (!this.projection || coordinates.length < 2) return null;

    const pathNodes: BundlingNode[] = [];
    let nodeId = currentNodeId;

    // 始点と終点を投影
    const startProj = this.projection(coordinates[0] as [number, number]);
    const endProj = this.projection(coordinates[coordinates.length - 1] as [number, number]);

    if (!startProj || !endProj) return null;

    // 始点ノード
    const startKey = `${startProj[0]},${startProj[1]}`;
    if (!nodeMap.has(startKey)) {
      const startNode: BundlingNode = {
        id: `node-${nodeId++}`,
        x: startProj[0],
        y: startProj[1],
        fx: startProj[0], // 固定
        fy: startProj[1],
        type: 'endpoint',
        feature,
        featureIndex,
        lineIndex
      };
      nodeMap.set(startKey, startNode);
      bundle.nodes.push(startNode);
    }
    pathNodes.push(nodeMap.get(startKey)!);

    // 中間制御点を生成
    const distance = Math.sqrt(
      Math.pow(endProj[0] - startProj[0], 2) + 
      Math.pow(endProj[1] - startProj[1], 2)
    );

    const numSegments = this.calculateSegmentSteps(distance);
    let prevNode = nodeMap.get(startKey)!;

    for (let i = 1; i < numSegments; i++) {
      const t = i / numSegments;
      const controlNode: BundlingNode = {
        id: `node-${nodeId++}`,
        x: startProj[0] + t * (endProj[0] - startProj[0]),
        y: startProj[1] + t * (endProj[1] - startProj[1]),
        type: 'control',
        feature,
        featureIndex,
        lineIndex
      };
      bundle.nodes.push(controlNode);
      pathNodes.push(controlNode);
      
      // リンクを追加
      bundle.links.push({
        source: prevNode.id,
        target: controlNode.id
      });
      prevNode = controlNode;
    }

    // 終点ノード
    const endKey = `${endProj[0]},${endProj[1]}`;
    if (!nodeMap.has(endKey)) {
      const endNode: BundlingNode = {
        id: `node-${nodeId++}`,
        x: endProj[0],
        y: endProj[1],
        fx: endProj[0], // 固定
        fy: endProj[1],
        type: 'endpoint',
        feature,
        featureIndex,
        lineIndex
      };
      nodeMap.set(endKey, endNode);
      bundle.nodes.push(endNode);
    }
    pathNodes.push(nodeMap.get(endKey)!);

    // 最後のリンク
    bundle.links.push({
      source: prevNode.id,
      target: nodeMap.get(endKey)!.id
    });

    // パスを追加
    bundle.paths.push({
      nodes: pathNodes,
      feature,
      featureIndex,
      lineIndex
    });

    return { nextNodeId: nodeId };
  }

  /**
   * 距離に基づいて制御点の数を計算します
   * @private
   */
  private calculateSegmentSteps(distance: number): number {
    if (this.segmentSteps === 'auto') {
      // 距離に基づいて自動計算（最小3、最大10）
      return Math.max(3, Math.min(10, Math.floor(distance / 50)));
    } else {
      return Math.max(2, this.segmentSteps);
    }
  }

  /**
   * 元のラインを描画します
   * @private
   */
  private renderOriginalLines(container: Selection<SVGGElement, unknown, HTMLElement, any>): void {
    if (!this.path) return;

    const originalGroup = container
      .append('g')
      .attr('class', 'thematika-original-lines');

    originalGroup
      .selectAll('path')
      .data(this.data.features)
      .enter()
      .append('path')
      .attr('d', this.path)
      .attr('class', 'thematika-line-original')
      .style('fill', 'none')
      .style('stroke', '#999')
      .style('stroke-width', 1)
      .style('opacity', 0.3);
  }

  /**
   * バンドリングされたパスを描画します
   * @private
   */
  private renderBundledPaths(container: Selection<SVGGElement, unknown, HTMLElement, any>): void {
    if (!this.bundlingData) return;

    const bundledGroup = container
      .append('g')
      .attr('class', 'thematika-bundled-lines');

    // curveBundle用のライン生成関数
    const lineGenerator = line<BundlingNode>()
      .curve(curveBundle.beta(this.bundlingStrength))
      .x(d => d.x)
      .y(d => d.y);

    // バンドリングされたパスを描画
    const paths = bundledGroup
      .selectAll('path')
      .data(this.bundlingData.paths)
      .enter()
      .append('path')
      .attr('class', (d, i) => {
        const baseClass = 'thematika-line-bundled';
        const customClass = this.attr.className || '';
        const featureClass = d.feature.properties?.class || '';
        const lineClass = d.lineIndex !== undefined ? `line-${d.lineIndex}` : '';
        const globalLineClass = `bundled-line-${i}`;
        return [baseClass, customClass, featureClass, lineClass, globalLineClass].filter(Boolean).join(' ');
      })
      .attr('d', d => lineGenerator(d.nodes) || '')
      .style('fill', 'none');

    // 属性とスタイルを適用
    super.applyAllStylesToElements(paths, bundledGroup);
  }

  /**
   * 制御点を描画します
   * @private
   */
  private renderControlPoints(container: Selection<SVGGElement, unknown, HTMLElement, any>): void {
    if (!this.bundlingData) return;

    const pointsGroup = container
      .append('g')
      .attr('class', 'thematika-control-points');

    const points = pointsGroup
      .selectAll('circle')
      .data(this.bundlingData.nodes)
      .enter()
      .append('circle')
      .attr('r', d => d.type === 'endpoint' ? this.endpointSize : this.controlPointSize)
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('class', d => d.type === 'endpoint' ? 'thematika-endpoint' : 'thematika-control-point')
      .style('fill', d => d.type === 'endpoint' ? '#2d3436' : '#4ecdc4')
      .style('stroke', 'white')
      .style('stroke-width', d => d.type === 'endpoint' ? 2 : 1);
  }

  /**
   * Force simulationを開始します
   * @private
   */
  private startForceSimulation(): void {
    if (!this.bundlingData || !this.animateForce) return;

    // 既存のsimulationを停止
    if (this.simulation) {
      this.simulation.stop();
    }

    // 新しいsimulationを作成
    this.simulation = forceSimulation(this.bundlingData.nodes)
      .force('charge', forceManyBody()
        .strength(this.forceStrength)
        .distanceMax(100)
      )
      .force('link', forceLink(this.bundlingData.links)
        .id((d: any) => d.id)
        .strength(0.5)
        .distance(0)
      )
      .alphaDecay(0.02)
      .on('tick', () => this.updatePositions());

    // アニメーションを開始
    this.simulation.alpha(0.3).restart();
  }

  /**
   * Force simulationのtickイベントで位置を更新します
   * @private
   */
  private updatePositions(): void {
    if (!this.layerGroup || !this.bundlingData) return;

    // バンドリングされたラインを更新
    const lineGenerator = line<BundlingNode>()
      .curve(curveBundle.beta(this.bundlingStrength))
      .x(d => d.x)
      .y(d => d.y);

    this.layerGroup
      .selectAll('.thematika-line-bundled')
      .data(this.bundlingData.paths)
      .attr('d', d => lineGenerator(d.nodes) || '');

    // 制御点の位置を更新
    if (this.showControlPoints) {
      this.layerGroup
        .selectAll('.thematika-control-point, .thematika-endpoint')
        .data(this.bundlingData.nodes)
        .attr('cx', d => d.x)
        .attr('cy', d => d.y);
    }
  }

  /**
   * レイヤーを削除します
   */
  destroy(): void {
    // Force simulationを停止
    if (this.simulation) {
      this.simulation.stop();
      this.simulation = undefined;
    }
    
    // 基底クラスのdestroyを呼び出し
    super.destroy();
  }

  /**
   * ラインにイベントリスナーを追加します
   * @param eventType - イベントタイプ
   * @param handler - イベントハンドラー
   */
  on(eventType: string, handler: (event: Event, data: any) => void): void {
    if (this.layerGroup) {
      this.layerGroup.selectAll('.thematika-line-bundled')
        .on(eventType, function(event, d: any) {
          handler(event, {
            feature: d.feature,
            featureIndex: d.featureIndex,
            lineIndex: d.lineIndex,
            nodes: d.nodes
          });
        });
    }
  }

  /**
   * Force simulationを取得します（デバッグ用）
   * @returns Force simulation
   */
  getSimulation(): any | undefined {
    return this.simulation;
  }

  /**
   * バンドリング強度を動的に変更します
   * @param strength - 新しいバンドリング強度（0-1）
   */
  setBundlingStrength(strength: number): void {
    this.bundlingStrength = Math.max(0, Math.min(1, strength));
    if (this.layerGroup) {
      this.updatePositions();
    }
  }
}