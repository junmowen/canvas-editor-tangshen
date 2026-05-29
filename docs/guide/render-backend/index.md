# Canvas 池与渲染后端索引

这里归档 `canvas-pool-render-backend-*` 系列文档。建议先读总览，再按主题进入架构、迁移、Dirty Range、Worker 和阶段记录。

## 总览

- [Canvas 池与多引擎渲染后端](./canvas-pool-render-backend-plan.md)
- [Canvas 后端架构](./canvas-pool-render-backend-architecture.md)
- [Canvas 核心接口](./canvas-pool-render-backend-architecture-core.md)
- [多引擎调度策略](./canvas-pool-render-backend-engine-strategy.md)
- [Worker 协议与调度](./canvas-pool-render-backend-worker-protocol.md)

## 迁移与策略

- [Canvas 迁移路径](./canvas-pool-render-backend-migration.md)
- [迁移阶段计划](./canvas-pool-render-backend-migration-stage-plan.md)
- [迁移风险、指标与落地约束](./canvas-pool-render-backend-migration-risk-metrics.md)
- [WebGL 与 Block 边界](./canvas-pool-render-backend-webgl-svg-boundary.md)
- [渲染后端调试面板](./canvas-pool-render-backend-debug-panel.md)

## Dirty Range 与大文档

- [Dirty Range 推进](./canvas-pool-render-backend-next-stage.md)
- [Dirty Range Planner](./canvas-pool-render-backend-dirty-range.md)
- [大粘贴事务](./canvas-pool-render-backend-async-insert.md)
- [真实模板压测](./canvas-pool-render-backend-clinic-template.md)
- [正文 Store 预研](./canvas-pool-render-backend-text-store.md)

## 渲染引擎收口

- [渲染引擎收口](./canvas-pool-render-backend-render-engine.md)
- [渲染引擎实施](./canvas-pool-render-backend-render-engine-implementation.md)
- [Worker 覆盖验收](./canvas-pool-render-backend-render-engine-acceptance.md)
- [Snapshot 模块图](./canvas-pool-render-backend-render-engine-module-map.md)
- [排期与结束定义](./canvas-pool-render-backend-rollout-closure.md)

## 阶段记录

- `canvas-pool-render-backend-progress-2026-05-15*`
- `canvas-pool-render-backend-progress-2026-05-16*`
- `canvas-pool-render-backend-migration-status-*`
- `canvas-pool-render-backend-render-engine-*-progress`
- `canvas-pool-render-backend-render-engine-*-roadmap`

