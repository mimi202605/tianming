# Phase 8 Event Feed Reference

Date: 2026-05-10

Scope: preview UI only. Formal game UI is not touched.

## Reference Direction

- EU4 event UI: compact title, short event text, clear choice buttons, restrained decorative frame.
- CK3 event UI: strong title hierarchy, illustrative seal/portrait area, decision buttons separated from body text.
- CK3 notification/message feed direction: compact HUD-edge message stack, weak heading, item-first scanning, visible scroll when accumulated messages exceed the viewport.

## Tianming v4 Event Feed

- Preview implementation: `web/preview/phase8-b-shell-preview.html`
- Current screenshot: `web/docs/assets/event-feed-v4-recent-three-turns.png`
- Inline-expanded screenshot: `web/docs/assets/event-feed-v4-expanded-inline.png`
- Left-edge alignment screenshot: `web/docs/assets/event-feed-v4-left-edge.png`
- Previous v3 screenshots: `web/docs/assets/event-feed-v3-ck3-stack.png`, `web/docs/assets/event-feed-v3-scrolled.png`
- Previous screenshot: `web/docs/assets/event-notice-v1-bottom-left.png`
- Position: fixed bottom-left, just above the four action cards.
- Alignment: the feed is flush to the left viewport edge; the old timeline-style left inset was removed so the message cards themselves start at the edge.
- Behavior: renders a scrollable stack of turn messages; default scope is `最近三回合`, sorted newest first. Click any item to expand its detail inline. There are no `详阅`, `入史`, or manual refresh buttons.
- Design note: do not present this as a heavy titled "近事快报" board in the preview. The old UI function is still news/near-events, but the visible form should feel like a CK3-style message stack attached to the HUD edge.
- Current mock data: `previewNewsEvents`, ten items spanning drought, military pay, canal grain, censorate rumor, frontier tribute, market price, ritual, maritime tax, tea permits, and native chieftain reform.
- Turn filtering: the header button opens scope choices for `最近三回合`, `本回`, `上一回合`, and `前二回合`.
- Automatic intake bridge: call `window.tianmingPreviewNewsFeed.ingest(event)` or dispatch `tianming:preview-news` with an event detail object. New events are appended and re-rendered without a refresh button.
- Future integration: replace or hydrate `previewNewsEvents` from the turn event queue / old quick-news source, then call `renderPreviewEvents()`. Keep DOM text dynamic so script-generated events can change title, severity, affected systems, and actions.

## Validation

- Static script parse: passed with the inline preview script.
- Browser route: `http://127.0.0.1:8789/phase8-b-shell-preview.html`
- Render check: 10 event items rendered; header shows `最近三回合 10`.
- Button removal check: `.tm-event-notice .tm-event-actions button` count is 0.
- Interaction check: clicking an event expands details inline and does not open the modal.
- Turn filter check: selecting `上一回合` shows 3 rows and updates the header to `上一回合 3`.
- Scroll check: list remains scrollable when recent-three-turn content exceeds visible height.
- Auto-intake note: `window.tianmingPreviewNewsFeed.ingest` and `tianming:preview-news` hooks are present. Browser policy blocked executing a `javascript:` URL injection during QA, so the hook was verified by script parse and code inspection rather than runtime injection.
- Console health: no error or warning logs during the checks.
- Left-edge check: Edge headless screenshot verified the message stack is flush against the left side.
