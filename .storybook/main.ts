import type { StorybookConfig } from '@storybook/html-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(js|jsx|ts|tsx|mdx)'],
  addons: [],
  framework: {
    name: '@storybook/html-vite',
    options: {},
  },
  core: {
    builder: '@storybook/builder-vite'
  },
  staticDirs: [
    { from: '../examples/geojson', to: '/geojson' },
    { from: '../dist', to: '/' }
  ],
  viteFinal: async (config) => {
    // TypeScriptとモジュール解決をサポート
    return {
      ...config,
      resolve: {
        ...config.resolve,
        alias: {
          ...config.resolve?.alias,
          // ライブラリ本体へのエイリアス
          '@': '/src'
        }
      },
      optimizeDeps: {
        ...config.optimizeDeps,
        include: [
          'd3-geo',
          'd3-selection',
          'd3-shape',
          'd3-scale',
          'd3-force',
          'd3-path',
          'd3-polygon',
          'd3-delaunay',
          'd3-drag',
          'd3-scale-chromatic',
          '@turf/turf',
          'geotiff'
        ],
        exclude: ['@storybook/blocks']
      },
      server: {
        ...config.server,
        fs: {
          ...config.server?.fs,
          allow: ['..']
        }
      }
    };
  }
};

export default config;