# Canvas 池与多引擎渲染后端方案

这份文档现在只保留总览和导航。详细方案已按专题拆分，避免继续在单个 10 万字节级文件里追加内容。

## 阅读入口

1. [架构与基础迁移方案](./canvas-pool-render-backend-architecture.md)
2. [2026-05-15 chunk 输入稳定性推进记录](./canvas-pool-render-backend-progress-2026-05-15.md)
3. [2026-05-16 chunk 算法、表格同步与大粘贴推进记录](./canvas-pool-render-backend-progress-2026-05-16.md)
4. [Dirty Range、事务指标与真实模板压测推进方案](./canvas-pool-render-backend-next-stage.md)
5. [渲染引擎接入与 OffscreenCanvas Worker 收口](./canvas-pool-render-backend-render-engine.md)
6. [推荐排期、暂停条件与结束定义](./canvas-pool-render-backend-rollout-closure.md)

## 最终收口状态

- 14.2 dirty page range planner、14.3 大粘贴事务指标、14.4 真实业务模板压测、14.5 正文数据结构预研均已完成当前阶段收口。
- 14.6 渲染引擎专题已完成 OffscreenCanvas worker 静态 base 覆盖、WebGL 图片任务、DOM / SVG block 垂直切片和导出 回退。
- `PageRenderSnapshotBuilder` 已继续细拆为按页面、行、行内元素、文本装饰、列表、表格和校验分域的小模块，最大 snapshot 模块约 7.5KB。
- 文档也已继续细拆：迁移、策略、14.1-14.6、5/15 和 5/16 进展均保留入口页，细节落到专题页。
- 可视化 debug 面板已补默认关闭的 `renderBackend.debugPanel.enabled` 入口，并提供 `getRenderBackendDebugSnapshot()` 聚合快照，覆盖 backend、worker、base 来源、typing preview、图片收益、内存和 documentTextStore mirror 健康度。
- 真实高分辨率图片收益量化已进入 WebGL capability 和 `imagePreview` 统计：可观测源图像素、输出像素、降采样节省像素、纹理复用节省上传像素、预览 bitmap 命中率和节省重绘像素。
- 更大图片集显存预算已接入 `renderBackend.webgl.maxTextureCacheBytes`，WebGL 纹理缓存同时受数量和字节预算约束，并暴露预算淘汰计数。
- piece-table / rope 的低风险前置试点已收口为 `documentTextStore.mirrorMode = shadow-write`：当前仍以数组为真相，mirror 只旁路重放和校验，并暴露 `mirrorHealthy` 作为继续替换底层结构前的准入信号。

## 方案结束

本方案到此结束。后续若继续推进，应另起新专题，不再追加到本总览：

1. 把 `shadow-write` mirror 替换为真实 piece-table / rope mirror 实现。
2. 将 debug snapshot 接入业务可视化面板或线上性能采样系统。
3. 根据真实图片集压测结果调整 WebGL 显存预算默认值。
