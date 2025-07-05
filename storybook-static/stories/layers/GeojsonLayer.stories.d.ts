import type { Meta, StoryObj } from '@storybook/html';
interface GeojsonLayerArgs {
    fill: string;
    stroke: string;
    strokeWidth: number;
    opacity: number;
    projection: string;
    dataType: 'world' | 'sample';
    colorScheme: 'single' | 'categorical' | 'sequential';
}
declare const meta: Meta<GeojsonLayerArgs>;
export default meta;
type Story = StoryObj<GeojsonLayerArgs>;
export declare const Default: Story;
export declare const CategoricalColors: Story;
export declare const SequentialColors: Story;
export declare const OrthographicView: Story;
export declare const SampleData: Story;
