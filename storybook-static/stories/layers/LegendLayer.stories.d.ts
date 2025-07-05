import type { Meta, StoryObj } from '@storybook/html';
interface LegendLayerArgs {
    scaleType: 'ordinal' | 'sequential' | 'threshold' | 'size';
    symbolType: 'cell' | 'circle' | 'line' | 'gradient';
    orientation: 'vertical' | 'horizontal';
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    showBackground: boolean;
    enableDrag: boolean;
    title: string;
    fontSize: number;
    itemSpacing: number;
    showMap: boolean;
    overlapping: boolean;
}
declare const meta: Meta<LegendLayerArgs>;
export default meta;
type Story = StoryObj<LegendLayerArgs>;
export declare const OrdinalScale: Story;
export declare const SequentialScale: Story;
export declare const ThresholdScale: Story;
export declare const SizeScale: Story;
export declare const SizeScaleOverlapping: Story;
