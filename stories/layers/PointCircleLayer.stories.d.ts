import type { Meta, StoryObj } from '@storybook/html';
interface PointCircleLayerArgs {
    radiusType: 'fixed' | 'variable' | 'data-driven';
    baseRadius: number;
    fill: string;
    stroke: string;
    strokeWidth: number;
    opacity: number;
    dataSource: 'points' | 'polygons';
}
declare const meta: Meta<PointCircleLayerArgs>;
export default meta;
type Story = StoryObj<PointCircleLayerArgs>;
export declare const Default: Story;
export declare const VariableRadius: Story;
export declare const DataDrivenRadius: Story;
export declare const MinimalStyle: Story;
