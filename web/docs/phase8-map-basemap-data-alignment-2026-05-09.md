# Phase 8 Preview Map Basemap Data Alignment - 2026-05-09

Scope: preview-only work for `web/preview/phase8-b-shell-preview.html`.

## Problem

The previous raster basemap did not satisfy two requirements:

- It did not read as a reliable East Asia geographic outline.
- It did not match the clickable Ming 1582 region layer, so the map looked like one image placed over another.

## Decision

Do not use a freehand AI-generated geography layer for the authoritative map footprint.

The preview basemap should be generated from data already used by the preview:

- `web/preview/img/ming-1582-map-data.js` is the source of truth for the clickable Ming land/region footprint.
- `web/preview/img/east-asia-basemap-data.js` provides surrounding East/Southeast Asia physical context without modern administrative borders.

## Changes

- Added `web/preview/_generate-aligned-geo-basemap.html` as a reproducible helper page.
- Overwrote `web/preview/img/ming-territory-basemap.png` with a 3200x1920 data-aligned raster export.
- Left `phase8-b-shell-preview.html` pointed at the same final asset path, with a cache-busting query string: `img/ming-territory-basemap.png?v=20260509-clearer`.
- Did not touch formal-game production UI files.

## Verification

Browser validation against `http://127.0.0.1:8765/web/preview/phase8-b-shell-preview.html`:

- Page loaded with title `B 方案 shell v2·天命 Phase 8`.
- `.ming-region` count: 26.
- `image.generated-basemap` count: 1.
- Old rejected basemap refs: 0 for `ancient-eastasia`, `ming-handpainted`, and `ming-aligned`.
- Console warnings/errors: none relevant.
- Clicking a Ming region opens `#ppop.show`, leaves one `.ming-region.selected`, and keeps the region archive panel usable.
- Clicking the zoom-in control changes `#ming-map-svg` from `scale(1)` to `scale(1.22)`.

Screenshots:

- `web/preview/_phase8-map-geo-basemap-overview.png`
- `web/preview/_phase8-map-geo-basemap-click.png`

## Follow-up: Sharpness And Interaction Performance

User feedback after the first aligned export: the map was still blurry, and zoom/pan felt laggy.

Follow-up changes:

- Re-exported `web/preview/img/ming-territory-basemap.png` through Playwright CLI with the system Chrome channel, avoiding the in-app browser clipping issue that caused repeated/stitched image areas.
- Final raster size is `3200x1920`, balancing clarity against decode/compositing cost.
- Reduced maximum preview zoom from `3.2` to `2.65`, matching the available raster pixel budget instead of overscaling the image.
- Removed expensive map-layer filters, SVG basemap feather blur, fog blur animation, hover/selected drop-shadows, and repeated per-pointermove synchronous transform writes.
- Added requestAnimationFrame batching for map transform updates during zoom/pan.
- Added a cheap non-blurred edge overlay to soften the hard rectangle without reintroducing heavy masks.

Verification:

- `web/preview/img/ming-territory-basemap.png` dimensions: `3200x1920`.
- Preview reload: 26 `.ming-region` paths, 1 generated basemap image, 0 old rejected basemap refs, no relevant console warnings/errors.
- Zoom button changes the map transform from `scale(1)` to `scale(1.4884)` after two clicks.
- Drag changes transform from `translate(-261.035px, -131.987px)` to `translate(-501.035px, -203.987px)` at the same zoom.
- Clicking a region still opens `#ppop.show` and leaves one `.ming-region.selected`.
- Updated screenshot: `web/preview/_phase8-map-sharp-fast-reset.png`.

## Follow-up: Clearer Basemap Export

User feedback after the sharpness/performance pass: the basemap still looked slightly blurry.

Follow-up changes:

- Removed the internal basemap mist ellipses from `web/preview/_generate-aligned-geo-basemap.html`.
- Replaced large radial glow gradients with steadier parchment/sea/land linear gradients, avoiding soft oval light patches that read as blur.
- Reduced paper noise opacity and increased line contrast for outer geography, Ming borders, mountains, rivers, trees, and sea waves.
- Corrected the export target to `web/preview/img/ming-territory-basemap.png`; a mistaken root-level `preview/img` export folder was removed.
- Added the `?v=20260509-clearer` query string in `phase8-b-shell-preview.html` so browser cache does not keep the old blurred asset.

Verification:

- `web/preview/img/ming-territory-basemap.png` dimensions remain `3200x1920`.
- Preview reload: 26 `.ming-region` paths, 1 generated basemap image, basemap href includes `v=20260509-clearer`, no relevant console warnings/errors.
- Clicking a Ming region opens `#ppop.show` and leaves one selected region.
- Zoom-in controls change `#ming-map-svg` from `scale(1)` to `scale(1.4884)` after two clicks.
- Visual screenshot: `C:/Users/37814/AppData/Local/Temp/phase8-map-clearer-final.png`.
