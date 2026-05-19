# 迁移路径、风险和落地顺序

本页只保留迁移方案索引。迁移状态、阶段计划、风险指标和注释约束已经拆到独立专题，避免单页继续膨胀。

## 子专题

1. [迁移当前推进状态：资源、surface、缓存、统计基座](./canvas-pool-render-backend-migration-status-foundation.md)
2. [迁移当前推进状态：输入、chunk 与表格](./canvas-pool-render-backend-migration-status-chunk-table.md)
3. [迁移阶段计划](./canvas-pool-render-backend-migration-stage-plan.md)
4. [迁移风险、指标与落地约束](./canvas-pool-render-backend-migration-risk-metrics.md)

## 当前边界

1. Canvas 池、surface 管理、bitmap cache、RenderBackendManager 和基础统计已经进入主链路。
2. 输入态 chunk、表格父子窗口、大粘贴事务、dirty range planner 和正文 store mirror 已完成当前阶段收口。
3. 多引擎和 worker 的实际收口见 [渲染引擎接入与 OffscreenCanvas Worker 收口](./canvas-pool-render-backend-render-engine.md)。
