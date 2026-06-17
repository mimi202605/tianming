# Phase 8 Region Detail Reference: EU4 / CK3 - 2026-05-09

Scope: preview-only research for the region detail popup opened from `web/preview/phase8-b-shell-preview.html`.

## Current Tianming Popup

The current preview popup is already functional:

- Opens on clicked map region.
- Shows region name, hierarchy breadcrumb, a two-column summary grid, and tabs.
- Tabs are tied to map modes: `总览 / 民情 / 财赋 / 军务 / 官守 / 势力`.
- Owner-mode changes can update the popup owner fields.

Main issue:

- It is still a compact data popup, not yet a strategic province/county management panel.
- It lacks a strong identity header, clear owner/governor chain, local actions, event queue, buildings/holdings, and number breakdowns.

## EU4 Province Interface Pattern

EU4 treats the province panel as a dense province ledger plus action hub.

Observed structure:

- Click any province to open the province interface; the selected province is outlined.
- Header contains province identity: capital/trade-capital icons, province/capital name, river/strait info, province history button, close button.
- Top bar exposes terrain image, base tax, production, manpower, total development, and development cost.
- Left/middle areas expose devastation, looting, income, unrest/rebel type, local autonomy, cores/claims, culture, religion, and progress bars for coring/conversion/culture/building.
- Queue/action area handles recruitment, ships, mercenaries, ownership/occupation/diplomacy context.
- Separate military and trade rows expose manpower contribution, supply, sailors, war score cost, fort level, garrison, trade power, trade value, goods produced, trade node, and trade good.
- Attached building/estate view shows built buildings, free slots, next slot requirements, estate assignment, loyalty, influence, and province value.
- Institution view shows spread, progress, and expected completion details.

Design lesson for Tianming:

- Put the most frequently compared province values in the first screen.
- Treat the detail panel as a command surface, not only a report.
- Keep hover/detail drilldowns available for why each number matters.

## CK3 County / Holding Pattern

CK3 treats the county panel as a hierarchy and holding-management surface.

Observed structure:

- A county is a group of baronies/holdings; baronies are physical map locations.
- Buildings are mostly holding-level, while development and control are county-level values.
- Development represents infrastructure/technical advancement and affects tax, levies, supply, and culture innovation pace.
- Control represents the ruler's effective power in the county and can drop from siege, raiding, or forced title actions.
- Popular opinion represents local feeling toward the holder and is affected by culture/religion mismatch and local rule conditions.
- Holdings use recognizable types: Castle, City, Temple, plus empty/tribal variants.
- Each holding has building slots, upgrade chains, and terrain-linked building choices.
- Buildings may affect the holding, the county, or the wider realm.

Design lesson for Tianming:

- Show hierarchy and delegated control clearly: empire/court -> province/circuit -> prefecture/county -> local officer/garrison.
- Separate county-level state from holding/building-level state.
- Show local sentiment and administrative control as first-class values, not hidden rows.
- Let the region panel answer "who controls this, who governs it, what is built here, what can I do next?"

## Translation To Tianming

The Tianming region detail page should not clone either game literally. Best target:

- EU4 density for economy/military/administrative numbers.
- CK3 hierarchy for ownership, local office, people, holdings, and control.
- Ming Chinese frame: `舆图案牍 / 地方档案 / 抚按札记`, not a western province card.

Recommended first-screen structure:

1. Identity header:
   - Region name, administrative level, owner/power, governor/local officer, selected map-mode status.
   - Buttons: close, pin, open in right panel, jump to memorial/issues.

2. Status ribbon:
   - 民心, 财赋, 军防, 官守, 势力/control.
   - Each item should be color-coded and clickable to switch the detail body.

3. Main two-column body:
   - Left: local ledger, population/households, tax/grain, terrain/transport, culture/custom.
   - Right: current issue queue, office/person in charge, military/garrison, owner/control status.

4. Local structures:
   - Ming-flavored replacement for CK3 holdings/buildings:
     `府署 / 仓场 / 驿站 / 城防 / 市舶司 / 书院 / 卫所 / 河工`.

5. Action row:
   - `开仓赈济`, `调粮`, `整饬官守`, `增兵`, `查税`, `召见地方官`.
   - In preview they can be mock buttons, but they establish the future production contract.

6. History/archive strip:
   - Local recent events, owner changes, orders applied, disasters, memorial links.
   - This can later connect to `史官实录`.

## Current Preview Gap

Compared with the reference games, the current popup is missing:

- Owner/governor/person chain in the header.
- Persistent local action buttons.
- Province/county history button or archive strip.
- Building/holding equivalent.
- Clear separation between county-level state and local facilities.
- Number breakdowns and progress bars.
- Strong "selected region remains a management surface" feeling.

## UI Form Correction

After visual comparison, the key is form rather than field content:

- EU4/CK3 use a stable management panel, not a tooltip floating at the click point.
- The selected location stays active while the panel becomes the player's working surface.
- The top area works like an identity plate: name, close button, current context, and compact key numbers.
- Status categories are shown as compact icon/numeric cells, not long text rows.
- Detail areas are framed in small modules with clear borders and dense spacing.
- Tabs feel attached to the panel body; the panel itself remains visually persistent.

Applied to the Phase 8 preview:

- Converted the region detail popup into a fixed left-side dossier panel, matching the province/county management area pattern more closely.
- Added an internal vertical `案` side tag to make it read as an attached game panel.
- Added a compact top banner and five status seals as the main first-screen visual form.
- Kept the body modular and dense, closer to strategy-game province/county panels.
- Removed the accidental horizontal scrollbar and styled the vertical scroll track.

Validation screenshot:

- `C:/Users/37814/AppData/Local/Temp/phase8-region-dossier-form-polished.png`

## Implementation Pass: Deeper EU4 / CK3 Panel Form

Applied to `web/preview/phase8-b-shell-preview.html`:

- Added a CK3-like local crest/identity block in the panel header.
- Moved panel tabs directly under the header and made them sticky/always visible.
- Changed tab detail into a compact EU4-like ledger strip.
- Added an EU4-like three-value development row: 民 / 赋 / 兵.
- Kept the current semantic mode banner, but made tabs and map mode sync so the active tab, active seal, map color, and banner all agree.
- Reworked local facilities into CK3-like holding slots with small icon blocks.

Validation:

- Browser target: `http://127.0.0.1:8765/web/preview/phase8-b-shell-preview.html`.
- Clicking `浙江` opens the fixed dossier panel.
- Dossier has 6 tabs, 3 development chips, 5 status seals, 6 holding-style facility slots.
- Clicking the `财赋` tab sets `#mapwrap[data-map-mode="tax"]`, activates the `财赋` seal, and updates the banner to `财赋压力`.
- Console warnings/errors: 0.

Screenshot:

- `C:/Users/37814/AppData/Local/Temp/phase8-region-dossier-eu4-ck3-style-final.png`

## Implementation Pass: Left-Docked Region Panel Position

Issue:

- The region detail panel was fixed on the right side, which read more like an outliner/details drawer than an EU4/CK3-style selected province/county management surface.

Implemented in `web/preview/phase8-b-shell-preview.html`:

- Docked `#ppop` to the left side at `left:24px; top:74px`.
- Kept the selected region as an active management panel while the map remains visible to the right.
- Hid the top-left map title, map layer controls, map search panel, and bottom-left decree card buttons while the region panel is open so the panel has a clean working area.
- Moved the small `案` side tag to the panel's map-facing right edge.

Validation:

- Browser target: `http://127.0.0.1:8765/web/preview/phase8-b-shell-preview.html`.
- Clicking `广东` opens `#ppop.show` with inline position `inset: 74px auto auto 24px`.
- `body` receives `province-panel-open`.
- Console warnings/errors: 0.

Screenshot:

- `C:/Users/37814/AppData/Local/Temp/phase8-region-panel-left-docked.png`

## Suggested Next Implementation Slice

For the preview page, implement a new district dossier layout while keeping existing data:

- Keep `#ppop`, but widen it slightly and make it visually closer to a Ming dossier panel.
- Replace the top of `#pp-grid` with:
  - mode status banner,
  - five compact status seals,
  - owner/governor/issue row.
- Add a `地方设施` section with 6 mock slots.
- Add an `待办政务` section with 3 action buttons.
- Keep existing tabs, but make tabs control body detail rather than duplicating the whole first-screen summary.

Sources:

- EU4 province interface reference: `https://www.eu4cn.com/wiki/省份界面`
- CK3 holdings reference: `https://www.gamewatcher.com/news/crusader-kings-3-holdings-guide`
- CK3 development/control/buildings dev diary summary: `https://simulationian.com/2019/11/ck3-dd20191119/`
- CK3 county development guide: `https://www.fandomspot.com/ck3-county-development/`
