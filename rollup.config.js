import { copyFileSync, existsSync, mkdirSync } from 'fs';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import serve from 'rollup-plugin-serve';
import livereload from 'rollup-plugin-livereload';

const production = !process.env.ROLLUP_WATCH;
const siteJsDir = 'site/js';

function copyIfExists(source, destination) {
  if (existsSync(source)) {
    copyFileSync(source, destination);
  }
}

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
        'd3-selection': 'd3',
        'd3-force': 'd3',
        'd3-shape': 'd3',
        'd3-contour': 'd3',
      }
    },
  ],
  external: ['d3-geo', 'd3-selection', 'd3-force', 'd3-shape', 'd3-contour'],
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
    {
      name: 'copy-umd-to-site',
      writeBundle() {
        mkdirSync(siteJsDir, { recursive: true });
        copyFileSync('dist/thematika.umd.js', `${siteJsDir}/thematika.umd.js`);
        copyIfExists('dist/thematika.umd.js.map', `${siteJsDir}/thematika.umd.js.map`);
      }
    },
    !production && serve({
      open: true,
      contentBase: ['site'],
      host: 'localhost',
      port: 3000,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control'
      },
      cleanUrls: false,
    }),
    !production && livereload('site')
  ].filter(Boolean)
};
