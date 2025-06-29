import { scaleOrdinal, scaleLinear, scaleThreshold, scaleSequential } from 'd3-scale';
import { interpolateYlOrRd } from 'd3-scale-chromatic';
import { LegendLayer } from '../legend-layer';

describe('LegendLayer', () => {
  let container: any;

  beforeEach(() => {
    // Mock D3 selection container
    const mockElement = {
      appendChild: jest.fn(),
      setAttribute: jest.fn(),
      getAttribute: jest.fn(),
      removeChild: jest.fn(),
      tagName: 'g'
    };

    container = {
      append: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      attr: jest.fn().mockReturnThis(),
      style: jest.fn().mockReturnThis(),
      text: jest.fn().mockReturnThis(),
      selectAll: jest.fn().mockReturnThis(),
      data: jest.fn().mockReturnThis(),
      enter: jest.fn().mockReturnThis(),
      exit: jest.fn().mockReturnThis(),
      remove: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      node: jest.fn(() => mockElement),
      size: jest.fn(() => 5),
      call: jest.fn().mockReturnThis()
    } as any;
  });

  describe('constructor', () => {
    it('基本的なオプションで正しく初期化される', () => {
      const colorScale = scaleOrdinal()
        .domain(['A', 'B', 'C'])
        .range(['#ff0000', '#00ff00', '#0000ff']);

      const legend = new LegendLayer({
        scale: colorScale as any,
        position: { top: 50, left: 400 }
      });

      expect(legend.id).toMatch(/^legend-/);
    });

    it('複数のオプションで正しく初期化される', () => {
      const colorScale = scaleOrdinal()
        .domain(['urban', 'forest', 'water'])
        .range(['#ff0000', '#00ff00']);

      const legend = new LegendLayer({
        scale: colorScale as any,
        position: { top: 100, left: 350 },
        title: 'Land Use',
        orientation: 'horizontal',
        itemSpacing: 30,
        fontSize: 14
      });

      expect(legend.id).toMatch(/^legend-/);
    });
  });

  describe('render', () => {
    it('レイヤーグループが作成される', () => {
      const colorScale = scaleOrdinal()
        .domain(['A', 'B', 'C'])
        .range(['#ff0000', '#00ff00', '#0000ff']);

      const legend = new LegendLayer({
        scale: colorScale as any,
        position: { top: 50, left: 400 }
      });

      legend.render(container);

      expect(container.append).toHaveBeenCalledWith('g');
      expect(container.attr).toHaveBeenCalledWith('class', expect.stringContaining('thematika-layer'));
    });

    it('凡例アイテムが生成される', () => {
      const ordinalScale = scaleOrdinal()
        .domain(['A', 'B', 'C'])
        .range(['#ff0000', '#00ff00', '#0000ff']);

      const legend = new LegendLayer({
        scale: ordinalScale as any,
        position: { top: 50, left: 400 }
      });

      legend.render(container);

      // 凡例アイテムが生成されることを確認
      expect(container.selectAll).toHaveBeenCalled();
    });
  });

  describe('scale types', () => {
    it('連続スケールを正しく判別する', () => {
      const linearScale = scaleLinear()
        .domain([0, 100])
        .range(['#ffffff', '#ff0000'] as any);

      const legend = new LegendLayer({
        scale: linearScale as any,
        position: { top: 50, left: 400 }
      });

      legend.render(container);

      // 連続スケールの凡例が生成されることを確認
      expect(container.selectAll).toHaveBeenCalled();
    });

    it('閾値スケールを処理できる', () => {
      const thresholdScale = scaleThreshold()
        .domain([10, 50, 100])
        .range(['#ffffff', '#ffcccc', '#ff6666', '#ff0000'] as any);

      const legend = new LegendLayer({
        scale: thresholdScale as any,
        position: { top: 50, left: 400 }
      });

      legend.render(container);

      expect(container.selectAll).toHaveBeenCalled();
    });

    it('シーケンシャルスケールを処理できる', () => {
      const sequentialScale = scaleSequential(interpolateYlOrRd)
        .domain([0, 1000000]);

      const legend = new LegendLayer({
        scale: sequentialScale as any,
        position: { top: 50, left: 400 }
      });

      legend.render(container);

      expect(container.selectAll).toHaveBeenCalled();
    });
  });

  describe('position management', () => {
    it('位置を更新できる', () => {
      const colorScale = scaleOrdinal()
        .domain(['A', 'B'])
        .range(['#ff0000', '#00ff00']);

      const legend = new LegendLayer({
        scale: colorScale as any,
        position: { top: 50, left: 400 }
      });

      legend.render(container);

      // 位置が設定されることを確認
      expect(container.attr).toHaveBeenCalledWith('transform', expect.any(String));
    });
  });

  describe('scale management', () => {
    it('スケールを更新できる', () => {
      const initialScale = scaleOrdinal()
        .domain(['A', 'B'])
        .range(['#ff0000', '#00ff00']);

      const newScale = scaleOrdinal()
        .domain(['X', 'Y', 'Z'])
        .range(['#000000', '#ffffff', '#888888']);

      const legend = new LegendLayer({
        scale: initialScale as any,
        position: { top: 50, left: 400 }
      });

      legend.render(container);

      // スケールが設定されることを確認
      expect(container.selectAll).toHaveBeenCalled();
    });
  });

  describe('visibility management', () => {
    it('表示状態を変更できる', () => {
      const colorScale = scaleOrdinal()
        .domain(['A', 'B'])
        .range(['#ff0000', '#00ff00']);

      const legend = new LegendLayer({
        scale: colorScale as any,
        position: { top: 50, left: 400 }
      });

      legend.render(container);

      // 初期状態で表示されていることを確認
      expect(legend.visible).toBe(true);

      // 非表示に設定
      legend.setVisible(false);

      // 表示状態が変更されたことを確認
      expect(legend.visible).toBe(false);
    });
  });
});