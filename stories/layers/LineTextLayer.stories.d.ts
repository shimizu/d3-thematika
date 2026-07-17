import type { Meta, StoryObj } from '@storybook/html';
interface LineTextLayerArgs {
    textProperty: string;
    fontSize: number;
    fontFamily: string;
    fontWeight: string;
    textAnchor: 'start' | 'middle' | 'end';
    startOffset: string;
    usePathText: boolean;
    arcMode: 'none' | 'arc' | 'auto-flip';
    arcOffset: number;
    dataType: 'linestring' | 'multilinestring';
    showLines: boolean;
}
declare const meta: Meta<LineTextLayerArgs>;
export default meta;
type Story = StoryObj<LineTextLayerArgs>;
export declare const Default: Story;
export declare const ArcText: Story;
export declare const AutoFlipText: Story;
export declare const CenterPointText: Story;
export declare const EdgeLabels: Story;
