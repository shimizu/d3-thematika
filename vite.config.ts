import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      'd3-geo': 'd3-geo',
      'd3-selection': 'd3-selection',
      'd3-shape': 'd3-shape',
      'd3-scale': 'd3-scale',
      'd3-force': 'd3-force',
      'd3-path': 'd3-path',
      'd3-polygon': 'd3-polygon',
      'd3-delaunay': 'd3-delaunay',
      'd3-drag': 'd3-drag',
      'd3-scale-chromatic': 'd3-scale-chromatic'
    }
  },
  optimizeDeps: {
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
    ]
  },
  build: {
    target: 'es2020',
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'Thematika',
      formats: ['es', 'umd']
    },
    rollupOptions: {
      external: ['d3-geo', 'd3-selection'],
      output: {
        globals: {
          'd3-geo': 'd3',
          'd3-selection': 'd3'
        }
      }
    }
  },
  server: {
    fs: {
      allow: ['..']
    }
  }
});