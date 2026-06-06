# 14.6 Worker 与调度进展

当前进度：

1. `RenderBackendManager` 已支持按注册顺序尝试多个 engine，实验 engine 执行失败时会记录失败并继续回退到后续后端。
2. 已新增 engine 失败和回退统计：`failureCount`、`fallbackCount`、`backendFailureCountMap`、`backendFallbackCountMap`，并同步进入 `recentWindow` 和 `pageEngineStatsList`。
3. 如果所有候选后端都失败，调度器会保留失败统计并重新抛出最后一个异常，避免静默吞掉 Canvas2D 主链路错误。
4. `RenderBackendManager.register()` 已支持 `priority: 'first'`，可把 OffscreenCanvas / WebGL / SVG 实验 engine 插到 Canvas2D 前面做灰度验证。
5. `canvas-render-backend.cy.ts` 已增加实验 engine 故障注入用例，验证失败后能回退到 Canvas2D、页面像素仍非空、miss 为 0，并记录失败 engine 与 回退 目标。
6. `IEditorOption.renderBackend` 已提供 `offscreenCanvas`、`webgl` 和 `svgDom` 灰度开关；默认全部关闭，`offscreenCanvas.nonCurrentPageBase` 默认允许非当前页 base 任务降为 worker 优先级。
7. `PageRenderer.drawPage()` 已按当前页、光标页、选区边界页、搜索活动态和激活控件页判断交互页；交互页 base 仍提交 `sync`，只有非交互页 base 在 OffscreenCanvas 开启后提交 `worker`。
8. `IRenderTask` 已补充 `isCurrentPage` 和 `isInteractive` 元数据，`OffscreenCanvasRenderEngine` 会拒绝当前交互任务，避免实验后端抢占输入帧。
9. WebGL 和 SVG / DOM 引擎已接入 option capability，且只接独立 `image-webgl` / `svg-dom-block` 任务，不接管正文文字和 overlay。
10. 已新增 `PageRenderSnapshotBuilder`、`WorkerRenderScheduler`、`WorkerBitmapCompositor` 和 `offscreenRender.worker.ts`，普通文本页和基础 frame 页可以生成 worker 快照、在 OffscreenCanvas 中绘制、返回 `ImageBitmap` 并合成回 base surface。
11. worker 结果已校验 pageNo、layer、尺寸、DPR、layoutVersion 和 baseVisualVersion；过期或不匹配结果会丢弃并回退 Canvas2D。
12. `Draw.getRenderBackendStats().workerRender` 已暴露 worker submit、success、回退、stale discard、compose reject、timeout 和 pending job 统计。
13. worker 命令协议已扩展 `fillText` 透明度 / transform、`strokePath`、`strokeRect`、`strokeSvgPath`、圆形、clip、`drawImage`、重复文字水印 pattern 和重复图片水印 pattern 命令，用于承载页码、文字 / 图片水印、行号、页边框、页边距标记、分隔线、控件、图片、签章、LaTeX、表格和基础正文样式装饰。
14. `canvas-render-backend.cy.ts` 已覆盖默认示例装饰页、页面背景图片、重复文字水印、图片水印、空文档占位符、文档签章、正文高亮 / 下划线 / 删除线、上标 / 下标、超链接、日期、自定义字宽 / 字间距、静态 area / group 装饰、活动 group 装饰、group / area / control 包裹的非文本元素、隐藏 area 跳过、列表、基础控件、普通图片、浮动图片、LaTeX、基础表格和复杂表格装饰命中真实 `offscreen-canvas`。
15. `WorkerRenderScheduler` 已从直接 postMessage 推进到单并发队列：同页新任务会取消旧排队 / active job，队列超限会回退 Canvas2D，连续 worker 失败会打开本会话熔断，并按当前可视页与滚动方向重排排队 job。
16. `workerRender` stats 已补充 `cancelCount`、`queueDropCount`、`priorityReorderCount`、`circuitOpenCount`、`activeCount`、`queuedCount`、`maxConcurrent`、`maxQueueLength`、`consecutiveFailureCount` 和 `circuitOpen`。
