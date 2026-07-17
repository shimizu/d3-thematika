import type { Meta, StoryObj } from '@storybook/html';
interface OutlineLayerArgs {
    projection: 'naturalEarth1' | 'mercator' | 'equirectangular' | 'orthographic' | 'azimuthalEqualArea';
    fill: string;
    stroke: string;
    strokeWidth: number;
    strokeDasharray: string;
    opacity: number;
    createClipPath: boolean;
    showGraticule: boolean;
    showSampleData: boolean;
    rotation: [number, number, number];
    scale: number;
}
declare const meta: Meta<OutlineLayerArgs>;
export default meta;
type Story = StoryObj<OutlineLayerArgs>;
export declare const NaturalEarth: Story;
export declare const Orthographic: Story;
export declare const OrthographicRotated: Story;
export declare const AzimuthalEqualArea: Story;
export declare const Mercator: Story;
export declare const EquirectangularClipped: Story;
