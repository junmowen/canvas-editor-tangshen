# 指南索引

这份索引用于在 `docs/guide/` 的大量文档中快速定位入口。长期稳定文档优先放在前面，阶段性方案和推进记录放在后面。

## 使用与 API

| 主题 | 文档 |
| --- | --- |
| 快速开始 | [start.md](./start.md) |
| 开箱即用模式 | [app-mode.md](./app-mode.md) |
| 编辑器双模式设计 | [editor-package-modes-design.md](./editor-package-modes-design.md) |
| 编辑器配置 | [option.md](./option.md) |
| 数据结构 | [schema.md](./schema.md) |
| 国际化 | [i18n.md](./i18n.md) |
| 实例 API | [api-instance.md](./api-instance.md) |
| 通用 API | [api-common.md](./api-common.md) |

## 扩展能力

| 主题 | 文档 |
| --- | --- |
| 执行动作命令 | [command-execute.md](./command-execute.md) |
| 获取数据命令 | [command-get.md](./command-get.md) |
| Listener 监听 | [listener.md](./listener.md) |
| EventBus 监听 | [eventbus.md](./eventbus.md) |
| 内部快捷键 | [shortcut-internal.md](./shortcut-internal.md) |
| 自定义快捷键 | [shortcut-custom.md](./shortcut-custom.md) |
| 内部右键菜单 | [contextmenu-internal.md](./contextmenu-internal.md) |
| 自定义右键菜单 | [contextmenu-custom.md](./contextmenu-custom.md) |
| 重写方法 | [override.md](./override.md) |
| 自定义插件 | [plugin-custom.md](./plugin-custom.md) |
| 官方插件 | [plugin-internal.md](./plugin-internal.md) |

## 架构与性能

| 主题 | 文档 |
| --- | --- |
| 图表与图形模块设计 | [chart-graphics/index.md](./chart-graphics/) |
| 子目录索引 | [architecture/index.md](./architecture/) |
| 性能优化方案 | [performance-optimization-plan.md](./architecture/performance-optimization-plan.md) |
| Draw 重构架构 | [draw-refactor-architecture.md](./architecture/draw-refactor-architecture.md) |
| Draw 重构计划 | [draw-refactor-plan.md](./architecture/draw-refactor-plan.md) |
| 鼠标事件重构 | [mouse-event-refactor-plan.md](./architecture/mouse-event-refactor-plan.md) |
| 坐标、目标、对象收口 | [coordinate-target-object-convergence.md](./architecture/coordinate-target-object-convergence.md) |

## 表格与 Issue 回归

| 主题 | 文档 |
| --- | --- |
| 子目录索引 | [table/index.md](./table/) |
| 表格重构计划 | [table-refactor-plan.md](./table/table-refactor-plan.md) |
| 表格重构任务 | [table-refactor-tasks.md](./table/table-refactor-tasks.md) |
| 表格 benchmark 路由 | [table-refactor-benchmark-route.md](./table/table-refactor-benchmark-route.md) |
| #41 表格分页失败拆解 | [issue-41-table-pagination-failure-breakdown.md](./table/issue-41-table-pagination-failure-breakdown.md) |
| #41 helper 基线诊断 | [issue-41-helper-baseline-diagnosis.md](./table/issue-41-helper-baseline-diagnosis.md) |
| 上游 issue 索引 | [issues/index.md](./issues/) |
| 上游 issue 使用计划 | [upstream-issues-usage-plan.md](./issues/upstream-issues-usage-plan.md) |
| 上游 issue checklist | [upstream-issues-checklist.md](./issues/upstream-issues-checklist.md) |
| 上游 open issue 可执行清单 | [upstream-open-issues-executable-checklist.md](./issues/upstream-open-issues-executable-checklist.md) |
| 上游 open issue rollout | [upstream-open-issues-rollout-checklist.md](./issues/upstream-open-issues-rollout-checklist.md) |

## Canvas 池与渲染后端

| 主题 | 文档 |
| --- | --- |
| 子目录索引 | [render-backend/index.md](./render-backend/) |
| 总计划 | [canvas-pool-render-backend-plan.md](./render-backend/canvas-pool-render-backend-plan.md) |
| 架构总览 | [canvas-pool-render-backend-architecture.md](./render-backend/canvas-pool-render-backend-architecture.md) |
| 核心接口 | [canvas-pool-render-backend-architecture-core.md](./render-backend/canvas-pool-render-backend-architecture-core.md) |
| 多引擎策略 | [canvas-pool-render-backend-engine-strategy.md](./render-backend/canvas-pool-render-backend-engine-strategy.md) |
| Worker 协议 | [canvas-pool-render-backend-worker-protocol.md](./render-backend/canvas-pool-render-backend-worker-protocol.md) |
| 调试面板 | [canvas-pool-render-backend-debug-panel.md](./render-backend/canvas-pool-render-backend-debug-panel.md) |
| Dirty Range | [canvas-pool-render-backend-dirty-range.md](./render-backend/canvas-pool-render-backend-dirty-range.md) |
| 大粘贴事务 | [canvas-pool-render-backend-async-insert.md](./render-backend/canvas-pool-render-backend-async-insert.md) |
| 真实模板压测 | [canvas-pool-render-backend-clinic-template.md](./render-backend/canvas-pool-render-backend-clinic-template.md) |
| 正文 Store 预研 | [canvas-pool-render-backend-text-store.md](./render-backend/canvas-pool-render-backend-text-store.md) |
| 渲染引擎收口 | [canvas-pool-render-backend-render-engine.md](./render-backend/canvas-pool-render-backend-render-engine.md) |
| Snapshot 模块图 | [canvas-pool-render-backend-render-engine-module-map.md](./render-backend/canvas-pool-render-backend-render-engine-module-map.md) |
| 结束定义 | [canvas-pool-render-backend-rollout-closure.md](./render-backend/canvas-pool-render-backend-rollout-closure.md) |

## 阶段记录

这类文档用于保留推进过程，不建议作为新功能的第一阅读入口。

- `render-backend/canvas-pool-render-backend-progress-*`
- `render-backend/canvas-pool-render-backend-migration-*`
- `render-backend/canvas-pool-render-backend-render-engine-*-progress`
- `issues/upstream-open-issues-solo-*`
