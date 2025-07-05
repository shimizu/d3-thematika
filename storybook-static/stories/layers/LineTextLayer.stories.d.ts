import type { Meta, StoryObj } from '@storybook/html';
interface LineTextLayerArgs {
    textProperty: string;
    position: 'start' | 'middle' | 'end' | number;
    placement: 'along' | 'horizontal' | 'perpendicular';
    usePercentage: boolean;
    dx: number;
    dy: number;
    rotate: number;
    lengthAdjust: 'spacing' | 'spacingAndGlyphs';
    alignmentBaseline: string;
    textAnchor: 'start' | 'middle' | 'end';
    fontFamily: string;
    fontSize: number;
    fontWeight: string;
    fill: string;
    stroke: string;
    strokeWidth: number;
    projection: string;
    dataType: 'rivers' | 'roads' | 'borders' | 'railways';
    showLines: boolean;
}
declare const meta: Meta<LineTextLayerArgs>;
export default meta;
type Story = StoryObj<LineTextLayerArgs>;
export declare const Rivers: Story;
export declare const Railways: Story;
export declare const RoadsHorizontal: Story;
export declare const BordersPerpendicular: Story;
