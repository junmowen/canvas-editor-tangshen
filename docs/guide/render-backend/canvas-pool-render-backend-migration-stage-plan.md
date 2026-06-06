# 迁移阶段计划

### 7.0.1 商业级编辑器架构补充路线

对齐 Google Docs、Word Online、Notion 的可落地能力，当前项目按以下顺序演进：

1. **段落 / chunk 索引层**：以段落为主、超长段落按固定元素数量硬切片，维护 `startIndex`、`endIndex`、页码覆盖、脏标记和统计。当前已完成 `DocumentChunkIndex` 与 `getRenderBackendStats().documentChunk`。
1.1. **当前落地颗粒度**：先以“单页 = 一个 chunk”为主，不在首版输入链路里继续拆段落；这样页内布局、页间搬移和缓存边界都更直观，错误面更小。
1.2. **表格父子 chunk 索引层**：表格不再只依赖“是否有 table 行”的临时扫描，而是通过 `TableChunkRangeIndex` 固化 `页 chunk -> 表格 chunk -> td/cell 子 chunk` 的开始页、结束页、页内行号和子 slice 范围。后续跨页单元格新增几行时，可以按这个索引计算影响窗口和下移范围，而不是触发表格完整重排。
2. **输入乐观更新层**：输入、粘贴、折叠退格立即修改数据和逻辑光标，只刷新可见层；整篇 layout 不进入同步输入路径。当前已通过 1000 页性能用例约束，并修复了批量粘贴逐元素移动数组造成的同步长任务。
3. **chunk 级布局缓存层**：为每个 chunk 缓存 rowList、positionList、测量摘要和内容版本；编辑时只失效命中 chunk 及邻近 chunk。当前已完成输入态 canvas chunk 重绘所需的首版缓存。
4. **视口驱动布局层**：可见页及上下缓冲页优先布局，其余 chunk 使用估算高度占位；滚动方向决定预布局窗口。
5. **异步分页层**：输入时不阻塞分页，后台 worker 根据 chunk 缓存合并分页信息；分页结果只在稳定后提交，不再恢复 idle 整篇回放兜底。
6. **分层渲染层**：base 文本层、装饰层、选区层、光标层保持独立 dirty；当前已完成 base / overlay surface 拆分，后续把 chunk dirty 与 layer dirty 联动。
7. **预测性加载层**：根据滚动方向预取 chunk bitmap 和布局缓存，降低大文档快速滚动时的冷启动重绘。

### 7.1 阶段一：资源入口收口

目标：不改变渲染行为，只把 canvas 生命周期迁出 `PageCanvasHost`。

任务：

1. 新增 `CanvasPool`。
2. 新增 `RenderSurfaceManager`。
3. `PageCanvasHost.mountCanvas()` / `unmountCanvas()` 改为委托给 `RenderSurfaceManager`。
4. 保留 `getCtxList()` / `getOverlayCtxList()` 过渡方法，但内部从 surface 派生。
5. 给 canvas 池增加资源数量、命中率、内存估算的调试统计。

验收：

1. 所有现有 Cypress 用例通过。
2. 大文档滚动时 canvas DOM 数量稳定在可视页数量附近。
3. 页面离开视口后 canvas 进入池而不是被销毁。

### 7.2 阶段二：渲染任务化

目标：上层不再直接操作 canvas 数组，而是提交渲染任务。

任务：

1. 新增 `RenderBackendManager`。
2. 新增默认 `Canvas2DRenderEngine`，用同步 task executor 承接当前 2D 绘制流程。
3. `PageRenderer.drawPage()` 从 `getCtxList()[pageNo]` 改为申请 base surface 并提交 `base-visible` task。
4. `TableOverlayRenderer` 从 `getOverlayCtxList()` 改为申请 overlay surface 并提交 `overlay-visible` task。
5. `DrawExportService` 从 detached host 状态替换改为申请临时 `EXPORT` / `OVERLAY` surface。
6. 高频 overlay 刷新统一提交 `overlay-visible` task。

验收：

1. 仓库内业务渲染代码不再直接依赖 `ctxList` 数组。
2. `PageCanvasHost` 不再保存 `canvasPool`。
3. base / overlay / export surface 生命周期可单独追踪。

### 7.3 阶段三：静态页缓存与后台绘制

目标：减少主线程整页重绘压力。

任务：

1. 为非活跃页增加 `bitmap cache`。当前已完成缓存容器、手动写入 / 读取 / 删除 API、尺寸 / 重绘失效规则、异步过期丢弃统计、缓存内存估算、LRU 数量 / 内存上限、组合内容版本、可视 base 页自动写入缓存、卸载保留 base 缓存、布局重算全量释放旧缓存，以及 base 层安全命中后的自动缓存读取合成。
2. layout 未变化、base 未脏时，滚回页面优先合成缓存。当前 base 层已接入安全命中后的自动合成短路，命中后只刷新当前页 overlay；未命中或校验失败时仍回退到完整 Canvas2D 重绘。
3. OffscreenCanvas 可用时，非当前页绘制可转 worker。当前已完成 OffscreenCanvas 引擎占位、能力探测、默认关闭注册和非当前页 base worker 优先级灰度入口；worker 绘制实现后续再接入。
4. 当前编辑页、光标页、选区边界页和 overlay 仍保留主线程同步绘制，优先保证输入一致性。
5. 新增 `PageRenderSnapshotBuilder`，把页级 base 渲染输入从 `Draw` 运行时对象转换为可序列化命令列表。
6. 新增 `WorkerRenderScheduler`，负责 worker job 排队、取消、并发上限、超时、版本校验和熔断。
7. 新增 `offscreenRender.worker.ts`，在 worker 中复用 `OffscreenCanvas` 执行命令列表并返回 `ImageBitmap`。
8. 新增 `WorkerBitmapCompositor`，在主线程校验 job 结果并合成到当前页 base surface，同时写入 bitmap cache。

验收：

1. 多页大文档快速滚动时主线程长任务减少，worker 命中页的 base 绘制不再执行主线程 `PageContentPainter.drawPageToSurface()`。
2. 同一页反复进出视口时，base 重绘次数下降，bitmap cache 命中和 worker bitmap 合成都能被区分统计。
3. 光标、选区、搜索 overlay 不受 base 缓存和 worker bitmap 合成影响。
4. worker 返回过期 job、错误尺寸、错误 DPR、旧 layoutVersion 或旧 baseVisualVersion 时必须丢弃，不能覆盖当前页面。
5. worker 不支持或命令构建失败时自动回退 Canvas2D，页面像素非空且没有 miss。
6. 100 / 500 页门诊模板在 OffscreenCanvas 开关开启后，当前页输入 P95 延迟不高于关闭开关时，非当前页 base worker 命中率可观察。

### 7.4 阶段四：多引擎扩展

目标：让不同内容使用更合适的渲染引擎。

任务：

1. 为图片预览和缩放引入可选 WebGL engine。当前已完成默认关闭的 WebGL capability 占位；核心实现需要补 `ImageRenderTask`、纹理缓存、context lost 回退 和输出 bitmap 固化。
2. 为复杂 block 保持 DOM / SVG engine 接口。当前已完成默认关闭的 SVG / DOM capability 占位；核心实现需要补 block host 生命周期、页挂载同步、导出 回退 和可见性调度。
3. 给每个 engine 增加 capability 检测与 回退，回退 不能只记录统计，必须有可执行的 Canvas2D 或 DOM 原链路输出。
4. 增加 debug 面板显示每页当前使用的 engine、任务状态、pending worker job、最近 回退 原因、熔断状态和资源内存。

验收：

1. 浏览器不支持某 engine 时能回退到 Canvas2D。
2. 引擎切换不影响导出结果；如果某 engine 不支持导出，导出路径必须显式回退，而不是复用可视 DOM 或 WebGL 状态。
3. 每个 engine 都能被性能指标单独观察，并能通过开关禁用回到原链路。
4. WebGL 图片能力必须有 context lost 回归；DOM / SVG block 必须有页面卸载、滚动回收和导出回归。
