# Canvas 池与多引擎渲染后端架构

本文件只保留架构专题导航。详细内容已拆到更小的专题文档。

## 子专题

1. [Canvas 池核心架构与接口草案](./canvas-pool-render-backend-architecture-core.md)
2. [多引擎调度策略与 Worker 协议](./canvas-pool-render-backend-engine-strategy.md)
3. [迁移路径、风险和落地顺序](./canvas-pool-render-backend-migration.md)

## 维护边界

- 核心架构文档只描述基础类型、surface、canvas pool 和任务接口。
- 多引擎策略文档只描述 OffscreenCanvas / WebGL / DOM-SVG 的调度边界。
- 迁移文档只记录落地步骤、风险、指标和代码约束。
- 后续新增执行记录不要追加到本架构总览。
