import type { Meta, StoryObj } from '@storybook/html';
interface PointSpikeLayerArgs {
    lengthType: 'fixed' | 'variable' | 'data-driven';
    baseLength: number;
    direction: 'up' | 'down' | 'left' | 'right';
    fill: string;
    stroke: string;
    strokeWidth: number;
    opacity: number;
    dataSource: 'points' | 'polygons';
}
declare const meta: Meta<PointSpikeLayerArgs>;
export default meta;
type Story = StoryObj<PointSpikeLayerArgs>;
export declare const Default: Story;
export declare const VariableLength: Story;
export declare const DataDrivenLength: Story;
export declare const DownwardSpikes: Story;
export declare const LeftwardSpikes: Story;
export declare const RightwardSpikes: Story;
export declare const MinimalStyle: Story;
