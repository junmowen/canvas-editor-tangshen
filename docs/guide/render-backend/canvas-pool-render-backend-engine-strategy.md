# 多引擎调度策略与 Worker 协议

本页只保留调度策略索引。阶段策略、worker 协议、WebGL / DOM / SVG 边界和调试入口已拆到独立专题。

## 子专题

1. [多引擎阶段策略](./canvas-pool-render-backend-engine-strategy-stages.md)
2. [OffscreenCanvas Worker 协议与调度](./canvas-pool-render-backend-worker-protocol.md)
3. [WebGL 图片与 DOM / SVG Block 边界](./canvas-pool-render-backend-webgl-svg-boundary.md)

## 当前边界

1. 正文 base 的实验 worker 路径只允许非交互页进入。
2. WebGL 只接图片任务，DOM / SVG 只接 block host 任务。
3. 导出路径不复用运行时 WebGL 或可视 DOM host，必须走 Canvas2D 固化或稳定 回退。
