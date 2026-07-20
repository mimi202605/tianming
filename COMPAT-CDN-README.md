# 根级 CDN 兼容件（勿删·2026-07-07）

`styles.css` 是为 2026-07-07 仓布局迁移之前老客户端保留的**根级冻结副本**；它不随 `web/` 演进同步。

旧的根级与 `web/` 天启 runtime snapshot 已于 2026-07-18 一并退役：完整官方剧本现由
`web/bundled-scenarios/manifest.js` 登记，并在玩家选中后加载 `web/scenarios/*.js`。新代码一律引用
`@main/web/...` 真路径；旧客户端仍以热更服务器为主源，不再承诺已退役 snapshot 的根级 CDN 兜底。
