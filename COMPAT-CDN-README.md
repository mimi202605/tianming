# 根级 CDN 兼容件（勿删·2026-07-07）

`styles.css` 与 `data/scenario-supplements/tianqi7-official-runtime-snapshot.js` 是**根级冻结副本**，
只为 2026-07-07 仓布局迁移（快照镜像→真历史·根目录从 web 内容变为项目根）之前发行的老客户端服务——
它们烧死了 `cdn.jsdelivr.net/gh/misfit-user/tianming@main/<根路径>` 兜底 URL。
老客户端主源是热更服务器，此兜底极少触发，故副本**不随 web/ 演进同步**（冻结即语义）。
新代码一律引用 `@main/web/...` 真路径。
