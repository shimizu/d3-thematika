import type { Meta, StoryObj } from '@storybook/html';
interface LineEdgebundlingLayerArgs {
    bundlingStrength: number;
    segmentSteps: number | 'auto';
    forceStrength: number;
    animateForce: boolean;
    showControlPoints: boolean;
    showOriginalLines: boolean;
    fill: string;
    stroke: string;
    strokeWidth: number;
    opacity: number;
    showBackground: boolean;
}
declare const meta: Meta<LineEdgebundlingLayerArgs>;
export default meta;
type Story = StoryObj<LineEdgebundlingLayerArgs>;
export declare const Default: Story;
export declare const HighBundling: Story;
export declare const LowBundling: Story;
export declare const AnimatedFlow: Story;
export declare const MinimalStyle: Story;
