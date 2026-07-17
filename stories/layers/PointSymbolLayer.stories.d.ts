import type { Meta, StoryObj } from '@storybook/html';
interface PointSymbolLayerArgs {
    symbolType: 'circle' | 'cross' | 'diamond' | 'square' | 'star' | 'triangle' | 'wye' | 'data-driven';
    sizeMode: 'fixed' | 'variable' | 'data-driven';
    baseSize: number;
    fill: string;
    stroke: string;
    strokeWidth: number;
    opacity: number;
    dataSource: 'points' | 'polygons';
}
declare const meta: Meta<PointSymbolLayerArgs>;
export default meta;
type Story = StoryObj<PointSymbolLayerArgs>;
export declare const Default: Story;
export declare const StarSymbols: Story;
export declare const DataDrivenSymbols: Story;
export declare const CrossMarkers: Story;
export declare const DiamondPattern: Story;
