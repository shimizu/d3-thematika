import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import serve from 'rollup-plugin-serve';
import livereload from 'rollup-plugin-livereload';

const production = !process.env.ROLLUP_WATCH;

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/thematika.cjs.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'named'
    },
    {
      file: 'dist/thematika.esm.js',
      format: 'esm',
      sourcemap: true
    },
    {
      file: 'dist/thematika.umd.js',
      format: 'umd',
      name: 'Thematika',
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
      sourceMap: true,
      inlineSources: !production
    }),
    production && terser(),
    !production && serve({
      open: true,
      contentBase: ['examples', 'dist'],
      host: 'localhost',
      port: 3000,
      headers: {
        'Access-Control-Allow-Origin': '*'
      }
    }),
    !production && livereload('examples')
  ].filter(Boolean)
};