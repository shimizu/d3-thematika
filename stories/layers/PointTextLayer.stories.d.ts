import type { Meta, StoryObj } from '@storybook/html';
interface PointTextLayerArgs {
    textProperty: string;
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
    dataType: 'cities' | 'countries' | 'mixed';
}
declare const meta: Meta<PointTextLayerArgs>;
export default meta;
type Story = StoryObj<PointTextLayerArgs>;
export declare const Default: Story;
export declare const WorldCapitals: Story;
export declare const CountryLabels: Story;
export declare const RotatedLabels: Story;
export declare const SmallCapsStyle: Story;
