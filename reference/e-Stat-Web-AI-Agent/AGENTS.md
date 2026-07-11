# Repository Guidelines

## Project Structure & Module Organization

This is a browser-only React + Vite app for an e-Stat analysis agent. Core UI lives in `src/components/`, with entry points in `src/main.jsx` and `src/App.jsx` and styles in `src/styles/app.css`. Tool definitions and e-Stat integration live in `src/tools/`; deterministic analysis and isolated JavaScript execution live in `src/analysis/`. Tests are in `test/`, fixtures and scenarios are in `src/test-harness/`, documentation is in `docs/`, and presentation assets are in `slide/`.

## Build, Test, and Development Commands

- `npm install` installs dependencies.
- `npm run dev` starts Vite on port `3000`, or the next free port.
- `npm test` runs all tests with Node's built-in `node --test` runner.
- `node --test test/runtime.test.js` runs a single test file.
- `npm run build` creates the production `dist/` bundle.
- `npm run preview` serves the built bundle locally for verification.

## Coding Style & Naming Conventions

Use modern ES modules and React function components. Keep JSX components in PascalCase files such as `ChatPanel.jsx`; keep utility, tool, and analysis modules in kebab-case or descriptive lowercase names such as `estat-client.js`. Match the surrounding style: two-space indentation, semicolons, named exports where practical, and small pure helpers for testable logic. No lint or formatter is configured, so keep formatting consistent with nearby code.

## Testing Guidelines

Tests use Node's standard test runner and live in `test/*.test.js`. Name new tests after the unit or behavior under test, for example `analysis-store.test.js`. Prefer pure logic tests; existing code uses injected stores and fallbacks for `localStorage`, `IndexedDB`, and `fetch`. Add focused tests when changing tools, e-Stat requests, analysis, persistence, prompts, or runtime behavior.

## Commit & Pull Request Guidelines

Recent history uses short subjects, often Conventional Commit prefixes such as `docs:`, `chore:`, `style:`, and `feat:`; Japanese subjects are also present. Keep commits scoped and descriptive, for example `docs: update development guide`. Pull requests should summarize the change, list verification commands such as `npm test` and `npm run build`, link issues when available, and include screenshots for UI changes.

## Security & Configuration Tips

Do not embed Claude API keys or e-Stat app IDs in source, docs, or build-time env files. Users enter both values in the API settings UI, and they are stored in browser `localStorage`. Avoid committing generated `dist/` output unless explicitly requested for deployment.
