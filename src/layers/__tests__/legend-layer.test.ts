// import { JSDOM } from 'jsdom';
import { select } from 'd3-selection';
import { scaleOrdinal, scaleLinear, scaleThreshold, scaleSequential } from 'd3-scale';
import { interpolateYlOrRd } from 'd3-scale-chromatic';
import { LegendLayer } from '../legend-layer';

describe('LegendLayer', () => {
  let dom: JSDOM;
  let container: any;

  beforeEach(() => {
    // DOM環境をセットアップ
    dom = new JSDOM('<!DOCTYPE html><html><body><svg></svg></body></html>');
    global.window = dom.window as any;
    global.document = dom.window.document;
    
    // SVGコンテナを作成
    const svg = select(dom.window.document.querySelector('svg'));
    container = svg.append('g');

    // window.addEventListenerをモック
    jest.spyOn(dom.window, 'addEventListener').mockImplementation(() => {});
  });

  describe('constructor', () => {
    it('基本的なオプションで正しく初期化される', () => {
      const colorScale = scaleOrdinal<string, string>()
        .domain(['A', 'B', 'C'])
        .range(['#ff0000', '#00ff00', '#0000ff']);

      const legend = new LegendLayer({
        scale: colorScale,
        position: { top: 50, left: 400 }
      });

      expect(legend.id).toMatch(/^legend-/);
      expect(legend.visible).toBe(true);
      expect(legend.zIndex).toBe(0);
    });

    it('カスタムオプションで正しく初期化される', () => {
      const colorScale = scaleOrdinal<string, string>()
        .domain(['Urban', 'Rural'])
        .range(['#ff0000', '#00ff00']);

      const legend = new LegendLayer({
        scale: colorScale,
        position: { top: 100, left: 350 },
        title: 'Land Use',
        orientation: 'horizontal',
        itemSpacing: 30,
        fontSize: 14
      });

      expect(legend.id).toMatch(/^legend-/);
    });
  });

  describe('スケール型の自動判別', () => {
    it('序数スケールを正しく判別する', () => {
      const ordinalScale = scaleOrdinal<string, string>()
        .domain(['A', 'B', 'C'])
        .range(['#ff0000', '#00ff00', '#0000ff']);

      const legend = new LegendLayer({
        scale: ordinalScale,
        position: { top: 50, left: 400 }
      });

      legend.render(container);

      // 序数スケールの凡例アイテムが正しく生成されることを確認
      const items = container.selectAll('.cartography-legend-item');
      expect(items.size()).toBe(3);
    });

    it('連続スケールを正しく判別する', () => {
      const linearScale = scaleLinear()
        .domain([0, 100])
        .range(['#ffffff', '#ff0000']);

      const legend = new LegendLayer({
        scale: linearScale,
        position: { top: 50, left: 400 }
      });

      legend.render(container);

      // 連続スケールの凡例アイテムが生成されることを確認
      const items = container.selectAll('.cartography-legend-item');
      expect(items.size()).toBeGreaterThan(0);
    });

    it('閾値スケールを正しく判別する', () => {
      const thresholdScale = scaleThreshold<number, string>()
        .domain([10, 50, 100])
        .range(['#ffffff', '#ffcccc', '#ff6666', '#ff0000']);

      const legend = new LegendLayer({
        scale: thresholdScale,
        position: { top: 50, left: 400 }
      });

      legend.render(container);

      // 閾値スケールの凡例アイテムが正しく生成されることを確認
      const items = container.selectAll('.cartography-legend-item');
      expect(items.size()).toBe(4);
    });

    it('連続色スケールを正しく判別する', () => {
      const sequentialScale = scaleSequential(interpolateYlOrRd)
        .domain([0, 1000000]);

      const legend = new LegendLayer({
        scale: sequentialScale,
        position: { top: 50, left: 400 }
      });

      legend.render(container);

      // 連続色スケールの凡例アイテムが生成されることを確認
      const items = container.selectAll('.cartography-legend-item');
      expect(items.size()).toBeGreaterThan(0);
    });
  });

  describe('render', () => {
    it('レイヤーグループが正しく作成される', () => {
      const colorScale = scaleOrdinal<string, string>()
        .domain(['A', 'B', 'C'])
        .range(['#ff0000', '#00ff00', '#0000ff']);

      const legend = new LegendLayer({
        scale: colorScale,
        position: { top: 50, left: 400 }
      });

      legend.render(container);

      const layerGroup = container.select('.cartography-layer');
      expect(layerGroup.empty()).toBe(false);
      expect(layerGroup.attr('class')).toContain('cartography-layer--');
    });

    it('タイトル付きの凡例が正しく描画される', () => {
      const colorScale = scaleOrdinal<string, string>()
        .domain(['Urban', 'Rural', 'Industrial'])
        .range(['#ff0000', '#00ff00', '#0000ff']);

      const legend = new LegendLayer({
        scale: colorScale,
        position: { top: 50, left: 400 },
        title: 'Land Use Types'
      });

      legend.render(container);

      const title = container.select('.cartography-legend-title');
      expect(title.empty()).toBe(false);
      expect(title.text()).toBe('Land Use Types');
    });

    it('凡例アイテムが正しく描画される', () => {
      const colorScale = scaleOrdinal<string, string>()
        .domain(['Type A', 'Type B'])
        .range(['#ff0000', '#00ff00']);

      const legend = new LegendLayer({
        scale: colorScale,
        position: { top: 50, left: 400 }
      });

      legend.render(container);

      const items = container.selectAll('.cartography-legend-item');
      expect(items.size()).toBe(2);

      const rects = container.selectAll('.cartography-legend-item rect');
      expect(rects.size()).toBe(2);

      const texts = container.selectAll('.cartography-legend-item text');
      expect(texts.size()).toBe(2);
    });
  });

  describe('update', () => {
    it('スケール更新後に凡例が正しく更新される', () => {
      const initialScale = scaleOrdinal<string, string>()
        .domain(['A', 'B'])
        .range(['#ff0000', '#00ff00']);

      const legend = new LegendLayer({
        scale: initialScale,
        position: { top: 50, left: 400 }
      });

      legend.render(container);

      // 初期状態を確認
      let items = container.selectAll('.cartography-legend-item');
      expect(items.size()).toBe(2);

      // スケールを更新
      const newScale = scaleOrdinal<string, string>()
        .domain(['A', 'B', 'C', 'D'])
        .range(['#ff0000', '#00ff00', '#0000ff', '#ffff00']);

      legend.updateScale(newScale);

      // 更新後の状態を確認
      items = container.selectAll('.cartography-legend-item');
      expect(items.size()).toBe(4);
    });
  });

  describe('updatePosition', () => {
    it('位置が正しく更新される', () => {
      const colorScale = scaleOrdinal<string, string>()
        .domain(['A', 'B'])
        .range(['#ff0000', '#00ff00']);

      const legend = new LegendLayer({
        scale: colorScale,
        position: { top: 50, left: 400 }
      });

      legend.render(container);

      // 初期位置を確認
      const layerGroup = container.select('.cartography-layer');
      const initialTransform = layerGroup.attr('transform');

      // 位置を更新
      legend.updatePosition({ top: 250, left: 100 });

      // 更新後の位置を確認
      const updatedTransform = layerGroup.attr('transform');
      expect(updatedTransform).not.toBe(initialTransform);
    });
  });

  describe('destroy', () => {
    it('レイヤーが正しく削除される', () => {
      const colorScale = scaleOrdinal<string, string>()
        .domain(['A', 'B'])
        .range(['#ff0000', '#00ff00']);

      const legend = new LegendLayer({
        scale: colorScale,
        position: { top: 50, left: 400 }
      });

      legend.render(container);

      // 描画状態を確認
      expect(legend.isRendered()).toBe(true);
      let layerGroup = container.select('.cartography-layer');
      expect(layerGroup.empty()).toBe(false);

      // レイヤーを削除
      legend.destroy();

      // 削除状態を確認
      expect(legend.isRendered()).toBe(false);
    });
  });

  describe('visibility', () => {
    it('表示状態が正しく制御される', () => {
      const colorScale = scaleOrdinal<string, string>()
        .domain(['A', 'B'])
        .range(['#ff0000', '#00ff00']);

      const legend = new LegendLayer({
        scale: colorScale,
        position: { top: 50, left: 400 }
      });

      legend.render(container);

      const layerGroup = container.select('.cartography-layer');

      // 初期状態（表示）
      expect(layerGroup.style('display')).not.toBe('none');

      // 非表示に設定
      legend.setVisible(false);
      expect(layerGroup.style('display')).toBe('none');

      // 表示に戻す
      legend.setVisible(true);
      expect(layerGroup.style('display')).not.toBe('none');
    });
  });
});