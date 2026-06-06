# 14.6 渲染引擎实施细节

本页只保留 14.6 实施索引。OffscreenCanvas worker、WebGL 图片任务、DOM / SVG block、roadmap 和 snapshot builder 模块图已经拆到独立页面。

## 子专题

1. [14.6 Worker 与调度进展](./canvas-pool-render-backend-render-engine-worker-progress.md)
2. [14.6 WebGL 图片与 DOM / SVG block 进展](./canvas-pool-render-backend-render-engine-media-progress.md)
3. [14.6 当前核心边界](./canvas-pool-render-backend-render-engine-scope.md)
4. [14.6 Worker 基础 roadmap](./canvas-pool-render-backend-render-engine-worker-roadmap.md)
5. [14.6 图片、block 与收口 roadmap](./canvas-pool-render-backend-render-engine-media-roadmap.md)
6. [14.6 Snapshot Builder 模块图](./canvas-pool-render-backend-render-engine-module-map.md)

## 维护要求

1. 14.6 的新增状态只写入对应专题页，不再把进展、缺口、roadmap 和模块清单混在同一页。
2. `PageRenderSnapshotBuilder.ts` 当前只作为 facade；新增 worker snapshot 能力必须落到对应的 `PageRenderSnapshot*` 分域模块。
3. WebGL 图片任务和 DOM / SVG block 任务继续保持独立 reason 和独立 回退，不进入正文文字 worker snapshot。
