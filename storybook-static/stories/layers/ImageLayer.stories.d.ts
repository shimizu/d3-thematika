import type { Meta, StoryObj } from '@storybook/html';
interface ImageLayerArgs {
    imageSource: 'static' | 'cog';
    showBboxMarkers: boolean;
    useAdvancedReprojection: boolean;
    useMask: boolean;
    opacity: number;
    projection: 'naturalEarth1' | 'mercator' | 'equirectangular' | 'orthographic';
    cogImageIndex: number;
    cogSizeLimit: number;
    showGraticule: boolean;
}
declare const meta: Meta<ImageLayerArgs>;
export default meta;
type Story = StoryObj<ImageLayerArgs>;
export declare const StaticImage: Story;
export declare const COGImage: Story;
export declare const COGHighResolution: Story;
export declare const COGOverview: Story;
