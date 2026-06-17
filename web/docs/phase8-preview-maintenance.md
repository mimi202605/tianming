# Phase 8 预览页维护说明

更新日期：2026-05-12

## 活动入口

- `web/preview/phase8-b-shell-preview.html`
  - 只作为预览 shell、基础布局、地图与旧残留的承载页。
  - 新 UI 职能不要继续写入这个文件的内联脚本。
- `web/preview/phase8-rich-ui-restore.js`
  - 负责共享数据、顶部栏、问天、全部变量、奏疏、鸿雁、史官实录、右侧栏等恢复层。
  - 不再向 `window` 暴露撰写诏书、人物图志相关函数。
- `web/preview/phase8-edict-ui.js`
  - 负责左下角“撰写诏书”全部交互：议事清册、纳入菜单、五类草拟、主角行止、诏书润色。
- `web/preview/phase8-person-atlas-upgrade.js`
  - 负责“人物图志”覆盖实现。
- `web/preview/phase8-shizheng-legacy-ui.js`
  - 负责“御案时政”旧 UI 复刻覆盖实现。

## 加载顺序

`phase8-b-shell-preview.html` 底部脚本顺序必须保持：

1. `phase8-rich-ui-restore.js`
2. `phase8-edict-ui.js`
3. `phase8-person-atlas-upgrade.js`
4. `phase8-shizheng-legacy-ui.js`

后加载模块可以覆盖早期 HTML 内联残留函数。新增功能优先新建独立模块，并在这里登记归属。

## 维护规则

- 不在 `phase8-b-shell-preview.html` 中新增大段业务 UI 逻辑。
- 同一入口只允许一个活动模块向 `window` 暴露函数。
- 如需保留旧实现作为参考，必须在模块说明中标注“legacy fallback”，不要同时导出同名函数。
- 每次改动后至少验证：`openZhao`、`openRenwuTuzhi`、`openShizhengTasks`、`tmPreviewOpenRightPanel('issue')`。
