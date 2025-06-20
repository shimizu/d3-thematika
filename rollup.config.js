import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import serve from 'rollup-plugin-serve';
import livereload from 'rollup-plugin-livereload';

const production = !process.env.ROLLUP_WATCH;

export default {
  input: 'src/index_export.ts',
  output: [
    {
      file: 'dist/cartography.cjs.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'named'
    },
    {
      file: 'dist/cartography.esm.js',
      format: 'esm',
      sourcemap: true
    },
    {
      file: 'dist/cartography.umd.js',
      format: 'umd',
      name: 'Cartography',
      sourcemap: true,
      globals: {
        'd3-geo': 'd3',
        'd3-selection': 'd3'
      }
    }
  ],
  external: ['d3-geo', 'd3-selection'],
  plugins: [
    resolve({
      browser: true
    }),
    typescript({
      tsconfig: './tsconfig.json',
      sourceMap: !production,
      inlineSources: !production
    }),
    production && terser(),
    !production && serve({
      open: true,
      contentBase: ['examples', 'dist'],
      host: 'localhost',
      port: 3000
    }),
    !production && livereload('examples')
  ].filter(Boolean)
};