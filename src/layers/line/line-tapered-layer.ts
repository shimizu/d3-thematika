import { Selection } from 'd3-selection';
import { geoPath, GeoPath, GeoProjection } from 'd3-geo';
import { BaseLayer } from '../core/base-layer';
import { LayerAttr, LayerStyle, ILineTaperedLayer } from '../../types';
import * as GeoJSON from 'geojson';

/**
 * テーパーラインのデータ構造
 */
interface TaperedLineData {
  /** フィーチャー情報 */
  feature: GeoJSON.Feature;
  /** フィーチャーのインデックス */
  featureIndex: number;
  /** 始点の地理座標 */
  start: GeoJSON.Position;
  /** 終点の地理座標 */
  end: GeoJSON.Position;
  /** 生成されたSVGパスデータ */
  pathData: string;
  /** MultiLineString内のラインインデックス */
  lineIndex?: number;
}

/**
 * LineTaperedLayerの初期化オプション
 */
export interface LineTaperedLayerOptions {
  /** GeoJSONデータ（LineString/MultiLineString） */
  data: GeoJSON.Feature | GeoJSON.Feature[] | GeoJSON.FeatureCollection;
  /** レイヤーの属性設定 */
  attr?: LayerAttr;
  /** レイヤーのCSS style属性設定 */
  style?: LayerStyle;
  /** 始点のサイズ（ピクセル、デフォルト: 10） */
  startSize?: number | ((d: GeoJSON.Feature, i: number) => number);
  /** 終点のサイズ（ピクセル、デフォルト: 2） */
  endSize?: number | ((d: GeoJSON.Feature, i: number) => number);
  /** アークの高さ係数（デフォルト: 0.3） */
  arcHeight?: number;
  /** アークの向きを反転するか（デフォルト: false） */
  flipArc?: boolean | ((d: GeoJSON.Feature, i: number) => boolean);
  /** 開始点に矢印を表示（デフォルト: false） */
  startArrow?: boolean;
  /** 終了点に矢印を表示（デフォルト: false） */
  endArrow?: boolean;
  /** 矢印のサイズ（デフォルト: 10） */
  arrowSize?: number;
}

/**
 * テーパー（太さが変化する）アーク型ポリゴンで始点と終点を結ぶレイヤークラス
 * LineString/MultiLineString形式のGeoJSONデータをサポート
 * 中間頂点は無視し、最初と最後の座標のみを使用
 */
export class LineTaperedLayer extends BaseLayer<LayerAttr<GeoJSON.Feature>, LayerStyle<GeoJSON.Feature>> implements ILineTaperedLayer {
  /** GeoJSONデータ */
  private data: GeoJSON.FeatureCollection;
  /** パス生成器 */
  private path?: GeoPath;
  /** レイヤーグループ */
  private layerGroup?: Selection<SVGGElement, unknown, HTMLElement, any>;
  /** 始点のサイズ */
  private startSize: number | ((d: GeoJSON.Feature, i: number) => number);
  /** 終点のサイズ */
  private endSize: number | ((d: GeoJSON.Feature, i: number) => number);
  /** アークの高さ係数 */
  private arcHeight: number;
  /** アークの向きを反転するか */
  private flipArc: boolean | ((d: GeoJSON.Feature, i: number) => boolean);
  /** 開始点に矢印を表示 */
  private startArrow: boolean;
  /** 終了点に矢印を表示 */
  private endArrow: boolean;
  /** 矢印のサイズ */
  private arrowSize: number;
  /** 投影法 */
  private projection?: GeoProjection;

  /**
   * LineTaperedLayerを初期化します
   * @param options - レイヤーの設定オプション
   */
  constructor(options: LineTaperedLayerOptions) {
    super(`line-tapered-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, options.attr || {}, options.style || {});

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

    this.startSize = options.startSize !== undefined ? options.startSize : 10;
    this.endSize = options.endSize !== undefined ? options.endSize : 2;
    this.arcHeight = options.arcHeight !== undefined ? options.arcHeight : 0.3;
    this.flipArc = options.flipArc !== undefined ? options.flipArc : false;
    this.startArrow = options.startArrow || false;
    this.endArrow = options.endArrow || false;
    this.arrowSize = options.arrowSize || 10;
  }

  /**
   * データを検証します
   * @private
   */
  private validateData(data: GeoJSON.FeatureCollection): void {
    if (!data || data.type !== 'FeatureCollection') {
      throw new Error('LineTaperedLayer: データはFeatureCollectionである必要があります');
    }

    if (!Array.isArray(data.features)) {
      throw new Error('LineTaperedLayer: featuresが配列ではありません');
    }

    data.features.forEach((feature, index) => {
      if (!feature.geometry) {
        throw new Error(`LineTaperedLayer: フィーチャー[${index}]にgeometryが存在しません`);
      }

      const geometry = feature.geometry as GeoJSON.LineString | GeoJSON.MultiLineString;
      const { type, coordinates } = geometry;

      if (type !== 'LineString' && type !== 'MultiLineString') {
        throw new Error(`LineTaperedLayer: フィーチャー[${index}]は'LineString'または'MultiLineString'である必要があります`);
      }

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
      throw new Error(`LineTaperedLayer: フィーチャー${lineId}は少なくとも2点の座標が必要です`);
    }

    coordinates.forEach((coord, coordIndex) => {
      if (!Array.isArray(coord) || coord.length < 2) {
        throw new Error(`LineTaperedLayer: フィーチャー${lineId}の座標[${coordIndex}]は[経度, 緯度]の配列である必要があります`);
      }

      const [lon, lat] = coord;
      if (lon < -180 || lon > 180) {
        throw new Error(`LineTaperedLayer: フィーチャー${lineId}の座標[${coordIndex}]の経度は-180から180の範囲である必要があります`);
      }

      if (lat < -90 || lat > 90) {
        throw new Error(`LineTaperedLayer: フィーチャー${lineId}の座標[${coordIndex}]の緯度は-90から90の範囲である必要があります`);
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
      this.layerGroup.selectAll('path').remove();
      this.renderTaperedLines();
    }
  }

  /**
   * レイヤーを描画します
   * @param container - 描画先のSVGコンテナ
   */
  render(container: Selection<SVGGElement, unknown, HTMLElement, any>): void {
    this.layerGroup = this.createLayerGroup(container);
    this.renderTaperedLines();
  }

  /**
   * テーパーライン描画を実行します
   * @private
   */
  private renderTaperedLines(): void {
    if (!this.layerGroup || !this.path || !this.projection) return;

    const lineGroup = this.layerGroup
      .append('g')
      .attr('class', 'thematika-line-tapered-layer');

    // 全ラインデータを準備
    const allLinesData = this.prepareAllLinesData();

    if (allLinesData.length === 0) return;

    // D3データバインディングで一括処理
    const paths = lineGroup
      .selectAll('.thematika-tapered-path')
      .data(allLinesData)
      .enter()
      .append('path')
      .attr('class', (d, i) => {
        const baseClass = 'thematika-tapered-path thematika-tapered-line';
        const customClass = this.attr.className || '';
        const featureClass = d.feature.properties?.class || '';
        const lineClass = d.lineIndex !== undefined ? `line-${d.lineIndex}` : '';
        const globalLineClass = `global-line-${i}`;
        return [baseClass, customClass, featureClass, lineClass, globalLineClass].filter(Boolean).join(' ');
      })
      .attr('d', d => d.pathData)
      .style('stroke', 'none');

    // 属性とスタイルを一括適用
    super.applyAllStylesToElements(paths, this.layerGroup!);
  }

  /**
   * 全フィーチャーから統一されたテーパーラインデータを準備します
   * @returns テーパーラインデータの配列
   * @private
   */
  private prepareAllLinesData(): TaperedLineData[] {
    const allLinesData: TaperedLineData[] = [];

    this.data.features.forEach((feature, featureIndex) => {
      const geometry = feature.geometry;

      if (geometry.type === 'LineString') {
        const coordinates = geometry.coordinates as GeoJSON.Position[];
        const start = coordinates[0];
        const end = coordinates[coordinates.length - 1];
        const pathData = this.generateTaperedPolygon(start, end, feature, featureIndex);

        if (pathData) {
          allLinesData.push({
            feature,
            featureIndex,
            start,
            end,
            pathData
          });
        }
      } else if (geometry.type === 'MultiLineString') {
        (geometry.coordinates as GeoJSON.Position[][]).forEach((line, lineIndex) => {
          const start = line[0];
          const end = line[line.length - 1];
          const pathData = this.generateTaperedPolygon(start, end, feature, featureIndex);

          if (pathData) {
            allLinesData.push({
              feature,
              featureIndex,
              start,
              end,
              pathData,
              lineIndex
            });
          }
        });
      }
    });

    return allLinesData;
  }

  /**
   * テーパーアークポリゴンのSVGパスを生成します
   * @param start - 始点の地理座標
   * @param end - 終点の地理座標
   * @param feature - フィーチャー情報
   * @param featureIndex - フィーチャーインデックス
   * @returns SVGパス文字列
   * @private
   */
  private generateTaperedPolygon(
    start: GeoJSON.Position,
    end: GeoJSON.Position,
    feature: GeoJSON.Feature,
    featureIndex: number
  ): string {
    if (!this.projection) return '';

    const startPoint = this.projection([start[0], start[1]]);
    const endPoint = this.projection([end[0], end[1]]);

    if (!startPoint || !endPoint) return '';

    // startSize/endSizeの値を解決
    const sSize = typeof this.startSize === 'function'
      ? this.startSize(feature, featureIndex)
      : this.startSize;
    const eSize = typeof this.endSize === 'function'
      ? this.endSize(feature, featureIndex)
      : this.endSize;

    // flipArcの値を解決
    const flipped = typeof this.flipArc === 'function'
      ? this.flipArc(feature, featureIndex)
      : this.flipArc;

    // ラインの方向ベクトルと法線ベクトルを計算
    const dx = endPoint[0] - startPoint[0];
    const dy = endPoint[1] - startPoint[1];
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) return '';

    // 始点-終点間の直線の法線（垂直方向）単位ベクトル
    const nx = -dy / distance;
    const ny = dx / distance;

    // アークの制御点を先に計算（端点キャップの方向決定に必要）
    const arcOffset = distance * this.arcHeight * (flipped ? -1 : 1);

    // 中心線の制御点（始点-終点の中点を法線方向にオフセット）
    const controlCenterX = (startPoint[0] + endPoint[0]) / 2 + nx * arcOffset;
    const controlCenterY = (startPoint[1] + endPoint[1]) / 2 + ny * arcOffset;

    // 二次ベジェ曲線の接線方向から各端点の法線を計算
    // 始点での接線: 始点→制御点の方向
    const startTanX = controlCenterX - startPoint[0];
    const startTanY = controlCenterY - startPoint[1];
    const startTanLen = Math.sqrt(startTanX * startTanX + startTanY * startTanY);
    const startNx = startTanLen > 0 ? -startTanY / startTanLen : nx;
    const startNy = startTanLen > 0 ? startTanX / startTanLen : ny;

    // 終点での接線: 制御点→終点の方向
    const endTanX = endPoint[0] - controlCenterX;
    const endTanY = endPoint[1] - controlCenterY;
    const endTanLen = Math.sqrt(endTanX * endTanX + endTanY * endTanY);
    const endNx = endTanLen > 0 ? -endTanY / endTanLen : nx;
    const endNy = endTanLen > 0 ? endTanX / endTanLen : ny;

    // 始点側の上下2点（始点でのアーク接線に垂直）
    const startTop: [number, number] = [
      startPoint[0] + startNx * sSize / 2,
      startPoint[1] + startNy * sSize / 2
    ];
    const startBottom: [number, number] = [
      startPoint[0] - startNx * sSize / 2,
      startPoint[1] - startNy * sSize / 2
    ];

    // 終点側の上下2点（終点でのアーク接線に垂直）
    const endTop: [number, number] = [
      endPoint[0] + endNx * eSize / 2,
      endPoint[1] + endNy * eSize / 2
    ];
    const endBottom: [number, number] = [
      endPoint[0] - endNx * eSize / 2,
      endPoint[1] - endNy * eSize / 2
    ];

    // 上辺の制御点（始点Top・終点Topの中点を法線方向にオフセット）
    const controlTopX = (startTop[0] + endTop[0]) / 2 + nx * arcOffset;
    const controlTopY = (startTop[1] + endTop[1]) / 2 + ny * arcOffset;

    // 下辺の制御点（始点Bottom・終点Bottomの中点を法線方向にオフセット）
    const controlBottomX = (startBottom[0] + endBottom[0]) / 2 + nx * arcOffset;
    const controlBottomY = (startBottom[1] + endBottom[1]) / 2 + ny * arcOffset;

    // 矢印の頂点を計算
    // 終点矢印: 終点キャップの先に、接線方向にarrowSize分延長した三角形の頂点
    const endArrowTip: [number, number] | null = this.endArrow ? [
      endPoint[0] + (endTanX / endTanLen) * this.arrowSize,
      endPoint[1] + (endTanY / endTanLen) * this.arrowSize
    ] : null;

    // 始点矢印: 始点キャップの先に、接線逆方向にarrowSize分延長した三角形の頂点
    const startArrowTip: [number, number] | null = this.startArrow ? [
      startPoint[0] - (startTanX / startTanLen) * this.arrowSize,
      startPoint[1] - (startTanY / startTanLen) * this.arrowSize
    ] : null;

    // ポリゴンパスを生成
    const pathParts: string[] = [];

    // 始点側: 矢印ありの場合は三角形、なしの場合は通常キャップ
    if (startArrowTip) {
      // startBottom → startArrowTip → startTop から開始
      pathParts.push(`M${startBottom[0]},${startBottom[1]}`);
      pathParts.push(`L${startArrowTip[0]},${startArrowTip[1]}`);
      pathParts.push(`L${startTop[0]},${startTop[1]}`);
    } else {
      pathParts.push(`M${startTop[0]},${startTop[1]}`);
    }

    // 上辺アーク: startTop → endTop
    pathParts.push(`Q${controlTopX},${controlTopY} ${endTop[0]},${endTop[1]}`);

    // 終点側: 矢印ありの場合は三角形、なしの場合は直線キャップ
    if (endArrowTip) {
      pathParts.push(`L${endArrowTip[0]},${endArrowTip[1]}`);
      pathParts.push(`L${endBottom[0]},${endBottom[1]}`);
    } else {
      pathParts.push(`L${endBottom[0]},${endBottom[1]}`);
    }

    // 下辺アーク: endBottom → startBottom
    pathParts.push(`Q${controlBottomX},${controlBottomY} ${startBottom[0]},${startBottom[1]}`);

    pathParts.push('Z');

    return pathParts.join('');
  }

  /**
   * GeoJSONデータを取得します
   * @returns GeoJSONデータ
   */
  getData(): GeoJSON.FeatureCollection {
    return this.data;
  }

}
