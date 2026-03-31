# Repository Guidelines

## Project Structure & Module Organization
`src/` contains the TypeScript library source. Entry exports live in `src/index.ts`, the main `Map` implementation is in `src/thematika.ts`, and feature code is grouped by domain under `src/layers/` (`geo/`, `line/`, `point/`, `raster/`, `utils/`). Shared helpers live in `src/utils/`, and vendored browser assets are in `src/vendor/`.

`site/` holds the demo site and sample GeoJSON assets used during development. `docs/` is generated API documentation and should be treated as build output unless you are intentionally updating published docs. Utility scripts for screenshots and GeoJSON maintenance live in `scripts/`.

## Build, Test, and Development Commands
- `npm install`: install dependencies for the library and local demo workflow.
- `npm run dev`: starts Rollup in watch mode and serves the demo at `http://localhost:3000/index.html`.
- `npm run build`: creates `dist/thematika.{cjs,esm,umd}.js` and copies the UMD bundle into `site/js/`.
- `npm run build:watch`: rebuilds continuously without changing the intended output.
- `npx tsc --noEmit`: useful as the current type-check gate because there is no dedicated test script.
- `npm run deploy`: publishes the `site/` directory via `gh-pages`.

## Coding Style & Naming Conventions
Use TypeScript with strict compiler settings. Follow the existing style: 2-space indentation, semicolons, single quotes, and named exports from `src/index.ts`. Class and layer names use PascalCase (`GeojsonLayer`, `LayerManager`); files use kebab-case (`point-symbol-layer.ts`); variables and methods use camelCase.

Keep modules focused. New layers should extend the existing layer architecture instead of bypassing `LayerManager`.

## Testing Guidelines
There is no automated test suite configured at the moment. Validate changes by:
- running `npm run build`
- running `npx tsc --noEmit`
- checking the relevant demo page in `site/` against the feature you changed

If you add tests, place them near the affected module or under a dedicated `tests/` directory and keep file names descriptive, such as `geojson-layer.test.ts`.

## Commit & Pull Request Guidelines
Recent history follows short, imperative prefixes such as `refactor:`, `docs:`, and `chore:`. Keep that pattern and scope each commit to one logical change.

Pull requests should include a clear summary, linked issues when applicable, and screenshots or demo-page notes for visual changes. Call out API or build-output changes explicitly, especially when `dist/`, `docs/`, or `site/js/thematika.umd.js` are affected.
