# Refactoring Plan: Architecture Improvements

This plan outlines the steps to implement the improvements suggested in `criticism.md`. The focus is on safety, incremental changes, and frequent verification to avoid regressions.

## Phase 1: Directory Structure Reorganization (Safe & Low Risk)

**Goal:** Reorganize `src/layers/` into categorized subdirectories to improve maintainability without changing logic.

1.  **Preparation**
    -   [ ] Verify current build and tests pass.
    -   [ ] List all current layer files.

2.  **Create Directories**
    -   [ ] Create `src/layers/core/`
    -   [ ] Create `src/layers/geo/`
    -   [ ] Create `src/layers/point/`
    -   [ ] Create `src/layers/line/`
    -   [ ] Create `src/layers/raster/`
    -   [ ] Create `src/layers/utils/` (for LegendLayer etc.)

3.  **Move Files & Update Imports (Incremental)**
    *Move files one group at a time, updating `src/index.ts`, internal imports, and tests immediately after each move.*

    -   **Step 3.1: Core Layers**
        -   [ ] Move `base-layer.ts` to `src/layers/core/`.
        -   [ ] Update references and `index.ts`.
        -   [ ] Run `npm run build` and `npm test`.

    -   **Step 3.2: Geo Layers**
        -   [ ] Move `geojson-layer.ts`, `graticule-layer.ts`, `outline-layer.ts` to `src/layers/geo/`.
        -   [ ] Update references and `index.ts`.
        -   [ ] Run `npm run build` and `npm test`.

    -   **Step 3.3: Point Layers**
        -   [ ] Move `point-circle-layer.ts`, `point-symbol-layer.ts`, `point-text-layer.ts`, `point-annotation-layer.ts`, `point-spike-layer.ts` to `src/layers/point/`.
        -   [ ] Update references and `index.ts`.
        -   [ ] Run `npm run build` and `npm test`.

    -   **Step 3.4: Line Layers**
        -   [ ] Move `line-connection-layer.ts`, `line-edgebundling-layer.ts`, `line-text-layer.ts` to `src/layers/line/`.
        -   [ ] Update references and `index.ts`.
        -   [ ] Run `npm run build` and `npm test`.

    -   **Step 3.5: Raster & Utils**
        -   [ ] Move `image-layer.ts` to `src/layers/raster/`.
        -   [ ] Move `legend-layer.ts` to `src/layers/utils/`.
        -   [ ] Update references and `index.ts`.
        -   [ ] Run `npm run build` and `npm test`.

4.  **Cleanup**
    -   [ ] Remove empty original `src/layers/` if applicable.
    -   [ ] Verify `GEMINI.md` reflects new structure.

## Phase 2: Type Safety Enhancements (Logic Improvement)

**Goal:** Improve type safety in `BaseLayer` and subclasses, specifically removing `any` casts in attribute application.

1.  **BaseLayer Improvements**
    -   [ ] Refactor `applyAttributesToElements` and `applyStylesToElements` to use generic types instead of `any`.
    -   [ ] Run `npm run build` and `npm test` to ensure no compilation errors.

2.  **Subclass Updates**
    -   [ ] Verify subclasses (e.g., `GeojsonLayer`) comply with the stricter types.
    -   [ ] Run `npm test`.

## Phase 3: Map Class Robustness

**Goal:** Address potential issues in `Map.ts` like `fitBounds` fallback.

1.  **fitBounds Improvement**
    -   [ ] Implement a safer check for `projection.invert` in `fitBounds`.
    -   [ ] Add a specific test case for a projection without invert (or mock it).
    -   [ ] Run `npm test`.

## Phase 4: Final Verification

1.  **Full Suite Run**
    -   [ ] Run full test suite `npm test`.
    -   [ ] Build library `npm run build`.
    -   [ ] Build demo pages `npm run build:demo` to ensure examples still compile/bundle correctly.
