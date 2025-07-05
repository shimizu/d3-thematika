import type { Meta, StoryObj } from '@storybook/html';
interface GraticuleLayerArgs {
    step: [number, number];
    stroke: string;
    strokeWidth: number;
    opacity: number;
    projection: string;
}
declare const meta: Meta<GraticuleLayerArgs>;
export default meta;
type Story = StoryObj<GraticuleLayerArgs>;
export declare const Default: Story;
export declare const DenseGrid: Story;
export declare const SparseGrid: Story;
export declare const OrthographicProjection: Story;
