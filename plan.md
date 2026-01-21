# Refactoring Plan: Architecture Improvements

This plan outlines the steps to implement the improvements suggested in `criticism.md`. The focus is on safety, incremental changes, and frequent verification to avoid regressions.

## Phase 1: Directory Structure Reorganization (Safe & Low Risk)

**Goal:** Reorganize `src/layers/` into categorized subdirectories to improve maintainability without changing logic.

1.  **Preparation**
    -   [x] Verify current build and tests pass.
    -   [x] List all current layer files.

2.  **Create Directories**
    -   [x] Create `src/layers/core/`
    -   [x] Create `src/layers/geo/`
    -   [x] Create `src/layers/point/`
    -   [x] Create `src/layers/line/`
    -   [x] Create `src/layers/raster/`
    -   [x] Create `src/layers/utils/` (for LegendLayer etc.)

3.  **Move Files & Update Imports (Incremental)**
    *Move files one group at a time, updating `src/index.ts`, internal imports, and tests immediately after each move.*

    -   **Step 3.1: Core Layers**
        -   [x] Move `base-layer.ts` to `src/layers/core/`.
        -   [x] Update references and `index.ts`.
        -   [x] Run `npm run build` and `npm test`.

    -   **Step 3.2: Geo Layers**
        -   [x] Move `geojson-layer.ts`, `graticule-layer.ts`, `outline-layer.ts` to `src/layers/geo/`.
        -   [x] Update references and `index.ts`.
        -   [x] Run `npm run build` and `npm test`.

    -   **Step 3.3: Point Layers**
        -   [x] Move `point-circle-layer.ts`, `point-symbol-layer.ts`, `point-text-layer.ts`, `point-annotation-layer.ts`, `point-spike-layer.ts` to `src/layers/point/`.
        -   [x] Update references and `index.ts`.
        -   [x] Run `npm run build` and `npm test`.

    -   **Step 3.4: Line Layers**
        -   [x] Move `line-connection-layer.ts`, `line-edgebundling-layer.ts`, `line-text-layer.ts` to `src/layers/line/`.
        -   [x] Update references and `index.ts`.
        -   [x] Run `npm run build` and `npm test`.

    -   **Step 3.5: Raster & Utils**
        -   [x] Move `image-layer.ts` to `src/layers/raster/`.
        -   [x] Move `legend-layer.ts` to `src/layers/utils/`.
        -   [x] Update references and `index.ts`.
        -   [x] Run `npm run build` and `npm test`.

4.  **Cleanup**
    -   [x] Remove empty original `src/layers/` if applicable.
    -   [x] Verify `GEMINI.md` reflects new structure.

## Phase 2: Type Safety Enhancements (Logic Improvement)

**Goal:** Improve type safety in `BaseLayer` and subclasses, specifically removing `any` casts in attribute application.

1.  **BaseLayer Improvements**
    -   [x] Refactor `applyAttributesToElements` and `applyStylesToElements` to use generic types instead of `any`.
    -   [x] Run `npm run build` and `npm test` to ensure no compilation errors.

2.  **Subclass Updates**
    -   [x] Verify subclasses (e.g., `GeojsonLayer`) comply with the stricter types.
    -   [x] Run `npm test`.

## Phase 3: Map Class Robustness

**Goal:** Address potential issues in `Map.ts` like `fitBounds` fallback.

1.  **fitBounds Improvement**
    -   [x] Implement a safer check for `projection.invert` in `fitBounds`.
    -   [x] Add a specific test case for a projection without invert (or mock it).
    -   [x] Run `npm test`.

## Phase 4: Final Verification

1.  **Full Suite Run**
    -   [x] Run full test suite `npm test`.
    -   [x] Build library `npm run build`.
    -   [x] Build demo pages `npm run build:demo` to ensure examples still compile/bundle correctly.
