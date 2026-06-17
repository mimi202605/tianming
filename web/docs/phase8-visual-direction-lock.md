# Phase 8 Visual Direction Lock Draft

date: 2026-05-05
status: draft / pending user visual ACK
owners: Codex + Claude

This document records the current Phase 8 visual direction after Claude's 8-alpha prep, Codex's 5Q answers, and Claude's moodboard feedback. It is a draft until the user accepts the revised B moodboard and the #gc sub-board supplement.

## Core Direction

Main direction: Song landscape / scholar desk / xuan-paper ink UI.

The main screen should feel like an operable imperial desk and memorial system, not a decorative landscape painting. Song painting contributes restraint, negative space, ink hierarchy, paper texture, and calm document order.

Supporting directions:

- Seal engraving: 21 rail icons, seasonal seals, status badges, modal seals.
- Court robe colors: office, personnel, appointment, rank, and party/faction panels.
- Stele/calligraphy: ceremonial headers, turn result modal, chaoyi/tinyi headings.

Deferred directions:

- Gongbi color: portraits and scene assets in later final-asset passes.
- Brocade and porcelain: theme skins or local textures, not the baseline language.

## Moodboard References

Preview-only generated boards:

- A: Song landscape / scholar desk main screen foundation.
- C: court robe color office/person panel.
- D: stele/calligraphy turn-modal and ceremonial headings.

Deterministic corrected boards:

- `C:\Users\37814\Desktop\tianming\phase8-moodboards\phase8-moodboard-b-redo-seal-icons.svg`
- `C:\Users\37814\Desktop\tianming\phase8-moodboards\phase8-moodboard-a-gc-subboards.svg`

B was redone as deterministic SVG instead of raster generation because the actual requirement is exact Chinese characters as seal icons. Image generation is not reliable enough for the 21 fixed rail characters.

## Palette

Seven themes stay, but their semantics change:

- `default`: xuan paper, ink black, tea brown, restrained cinnabar.
- `paper/light`: cleaner reading paper with lower texture.
- `scroll/sepia`: stele rubbing and aged paper.
- `blue`: blue-and-white porcelain, used as a cool theme only.
- `celadon/green`: Ru-ware sky-celadon, less green dominance than the current version.
- `vermillion`: cinnabar seal and palace wall red, not red-gold luxury.
- `highcontrast`: accessibility first, not decoration first.

Court robe color is a component palette first. It can become a full theme later only after the office/personnel surfaces prove the mapping.

## Typography

No CDN font dependency in the first round.

Runtime fallback:

```css
font-family: "STKaiti", "KaiTi", "FangSong", "Noto Serif SC", serif;
```

Decorative seal/stele/title glyphs should be images, SVG, or later local WOFF2 subsets. They should not rely on rare network fonts.

## Seal Icon Grammar

The 21 rail icons must be exact characters, one character per seal:

Left rail, 12:

`势 党 阶 军 政 科 物 宫 图 题 声 帮`

Right rail, 9:

`朕 辰 臣 缘 议 志 帑 讯 闻`

Rules:

- Do not replace the characters with abstract shapes.
- Use square seal first; round seal can be a secondary state or special badge.
- Support at least active, hover, idle, and disabled states.
- Prefer SVG or SVG-extractable implementation.
- Theme tinting must work through CSS variables or `currentColor`.
- Runtime implementation should extend `TM_ICONS` / `tmIcon()` rather than introducing a parallel icon path.

## Main Screen `#G`

The center `#gc` is not blank scenic space. It is a six-tab dense information container.

Tabs:

- `gt-edict`: edict drafting, active edict list, seal/action impact.
- `gt-letter`: Hongyan letter editor, recipient, body, seal.
- `gt-wendui`: audience/dialogue bubbles, portrait, options.
- `gt-chaoyi`: opens chaoyi modal, not primary #gc content.
- `gt-memorial`: memorial list, folded paper queue, urgency/status seals.
- `gt-jishi`: chronicle/timeline with twelve categories.

The `phase8-moodboard-a-gc-subboards.svg` supplement currently covers `gt-edict`, `gt-memorial`, and `gt-jishi`.

## Component Rules

- Do not change game logic, numerical rules, end-turn inference, or save schema during Phase 8 visual work.
- Preserve existing DOM ids and public bindings until each replacement has a smoke/baseline.
- Do not turn the game screen into a landing page.
- Do not use generic red-gold luxury, dragon overload, gradient orbs, bokeh, neon, or fantasy palace framing.
- Do not nest cards inside cards.
- Keep text dense but readable; use stable dimensions for rails, tabs, chips, and fixed-format controls.
- Theme changes must affect SVG icons, CSS components, and canvas redraws consistently.

## Codebase Findings To Respect

1. `tm-ui-foundation.js` already has `TM_ICONS` using SVG and `stroke=currentColor`; Phase 8 rail icons should join this system.
2. There are two theme mechanisms (`ThemeSystem` and `_tmApplyTheme`) that must be reconciled in 8-gamma.
3. `#gc` is a tab container, not a modal.
4. `_renderShellExtras*Left/Right` in `tm-shell-extras.js` builds drawer HTML in JS and includes inline style/class mixing.
5. Chaoyi/tinyi modal surfaces still contain inline styles and need class extraction before D-style title/frame tokens can work.
6. SaveManager has a large inline modal and should use the common modal language later.
7. Settings UI should receive skin/token upgrades only; do not rewrite its API/model business logic during Phase 8.
8. `preview-shell.html` v7 can inform token detail, but v8 moodboards are the visual source of truth.
9. Map canvas colors are hard-coded and need redraw/theme-event handling later.

## Asset Locations

Final assets should use:

- `web/assets/ui/phase8/icons/`
- `web/assets/ui/phase8/seals/`
- `web/assets/ui/phase8/textures/`
- `web/assets/ui/phase8/scenes/`
- `web/assets/ui/phase8/portraits/`

Moodboards remain outside runtime assets until the user accepts them.
