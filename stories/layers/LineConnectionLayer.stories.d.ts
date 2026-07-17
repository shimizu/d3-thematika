import type { Meta, StoryObj } from '@storybook/html';
interface LineConnectionLayerArgs {
    lineType: 'straight' | 'arc';
    arcHeight: number;
    arcControlPoint: 'center' | 'weighted';
    arcOffset: 'perpendicular' | 'north' | 'south' | 'east' | 'west';
    startArrow: boolean;
    endArrow: boolean;
    arrowSize: number;
    stroke: string;
    strokeWidth: number;
    opacity: number;
    projection: string;
    dataType: 'simple' | 'complex' | 'multiline';
}
declare const meta: Meta<LineConnectionLayerArgs>;
export default meta;
type Story = StoryObj<LineConnectionLayerArgs>;
export declare const Default: Story;
export declare const WorldTour: Story;
export declare const MultipleRoutes: Story;
export declare const StraightLines: Story;
export declare const OrthographicProjection: Story;
