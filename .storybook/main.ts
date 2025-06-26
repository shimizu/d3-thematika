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
    // TypeScriptとUMDビルドをサポート
    return {
      ...config,
      build: {
        ...config.build,
        rollupOptions: {
          external: ['d3-geo', 'd3-selection'],
          output: {
            globals: {
              'd3-geo': 'd3',
              'd3-selection': 'd3'
            }
          }
        }
      }
    };
  }
};

export default config;