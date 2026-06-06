# 迁移当前推进状态：资源、surface、缓存、统计基座

## 7. 代码生成约束

后续围绕这套方案生成或改造代码时，需要统一满足：

1. 类、函数、属性、关键代码块都要写中文注释。
2. 注释要说明职责，不要只写字面翻译。
3. 新增的渲染后端接口优先保留稳定的层级抽象，不要回退到直接暴露 `ctxList`。
4. 临时导出 surface 只能通过后端管理模块申请和释放，不能再恢复旧的 detached state 交换方式。

## 7. 迁移路径

### 7.0 当前推进状态

当前已完成第一阶段资源入口收口，并推进了第二阶段的低风险部分：

1. 已新增 `CanvasPool`，承接 canvas DOM 和 2D context 复用。
2. 已新增 `RenderSurfaceManager`，承接 base / overlay surface 的挂载、卸载、尺寸同步和状态快照。
3. `PageCanvasHost` 已不再直接保存 `canvasPool`，页面 canvas 生命周期已委托给 `RenderSurfaceManager`。
4. 已新增 `getSurface(pageNo, layer)`，作为后续渲染器访问 surface 的主入口。
5. `PageRenderer`、`TableOverlayRenderer`、`TextParticle` 已迁移到 `getSurface()`，不再直接读取 `ctxList` / `overlayCtxList`。
6. 已新增 `getSurfaceList(layer)`，批量渲染可以按 layer 读取 surface 状态。
7. `Zone`、`GlobalEvent`、`TableHitTestService` 已不再依赖 `Draw.getPageList()`，`Draw.getPageList()` facade 已移除。
8. `Background`、`Margin`、`Previewer`、`TableTool` 已迁移到 `getSurface()`，不再通过 `Draw.getPage()` 或 `PageCanvasHost.getPage()` 直接读取单 canvas。
9. `Draw.getPage()`、`PageCanvasHost.getPage()`、`PageCanvasHost.getOverlayPage()` 以及 `getPageList()` / `getOverlayPageList()` / `getCtxList()` / `getOverlayCtxList()` 低层过渡入口已移除。
10. 已新增 `Canvas2DRenderEngine` 和 `Overlay2DRenderEngine`，并通过 `RenderBackendManager` 接入 base / overlay 的同步渲染任务，当前绘制算法保持不变。
11. `PageRenderer.drawPage()` 和 `TableOverlayRenderer.prepareSelectionContext()` 已开始提交 `base-visible` / `overlay-visible` task，为后续 OffscreenCanvas、WebGL 或 worker engine 预留统一调度边界。
12. `DrawExportService` 已改为按页申请临时 `EXPORT` / `OVERLAY` surface，再进行 dataURL 导出，不再切换 `PageCanvasHost` 的 detached 状态。
13. `TextParticle`、`RowLayoutEngine` 和 `Watermark` 已不再直接创建业务离线 canvas，统一通过后端 surface 管理。
14. `RenderBackendManager.render()` 已返回调度结果，并通过 `getStats()` 统计调度次数、后端命中次数、miss 次数和最近一次结果。
15. `CanvasPool` 已按全局和 layer 控制空闲资源上限，并暴露 `idleLayerCountMap` 便于观察池内分布。
16. 已新增 `BitmapCache`，为阶段三静态页缓存提供容器、生命周期释放、统计入口、手动缓存 API、重绘失效规则、异步写入版本保护、过期丢弃统计、缓存内存估算和带内容版本校验的安全合成入口。
17. 页面卸载时已经改为保留 base bitmap 缓存、清理 overlay 缓存；布局或文档内容重算时通过 `invalidateAllBitmapCache()` 全量释放旧内容版本缓存。
18. `BitmapCache` 已增加 LRU 裁剪，默认最多保留 24 个 bitmap，估算像素内存最多 128MB，并通过 `evictCount`、`maxCount`、`maxBytes` 暴露淘汰和上限状态。
19. base bitmap 的 `contentVersion` 已从单一布局版本升级为“布局版本 + base 视觉版本”组合，`isCompute: false` 的背景、水印等基础视觉刷新也会推进缓存版本。
20. bitmap 合成拒绝统计已增加 `composeRejectReasonMap`，可区分页码、layer、逻辑尺寸、DPR、内容版本和 bitmap 像素尺寸不匹配。
21. 已新增 `OffscreenCanvasRenderEngine`，并以默认关闭方式注册到后端管理器；当前用于 capability 观测和后续 worker 绘制接入点。
22. 已新增 `WebGLRenderEngine` 和 `SvgDomRenderEngine` 占位引擎，并以默认关闭方式注册到后端管理器；当前用于图片滤镜、缩放预览、外部 block 和 SVG / DOM 能力观测。
23. `RenderBackendManager` 已增加 `backendDurationStatsMap`，按 engine 统计命中次数、总耗时、平均耗时和最大耗时；Canvas2D 和 Overlay2D 也已补充 capability。
24. `RenderBackendManager` 已增加 `taskStats`，按 layer、reason 和 priority 分组统计调度次数与成功渲染次数。
25. `RenderSurfaceManager` 已增加已挂载 surface backing store 内存估算，包括总字节、MB、按 layer 分组和测量 surface 占用。
26. `RenderSurfaceManager` 已增加活跃 transient surface 统计，包括数量、总字节、MB 和按 layer 分组内存，用于排查导出、水印等临时 surface 泄漏。
27. 监控闭环已补齐高水位和总览：canvas pool、bitmap cache、active surface 均暴露峰值，`Draw.getRenderBackendStats().memory` 汇总 active / idle / bitmap / total 内存。
28. 已从 POC 表格分页项目中提取 snapshot 驱动命中/导航、visible-only、overlay-only、布局快照索引规模观测等性能思路；当前代码主链已优先整合为 `tableSnapshot` 统计入口，POC 中较旧的 ctxList / overlayCtxList 代码未直接覆盖当前渲染后端实现。
29. `TableLayoutSnapshotBuilder` 已增加快照构建耗时统计，并在构建 cell bounds 时复用同轮 fragment position 索引，减少一次重复布局位置扫描。
30. `RenderBackendManager` 已增加 `recentWindow` 固定窗口统计，记录最近 120 次调度的慢任务数量、近期平均耗时、近期最大耗时、engine 耗时和任务维度分布。
31. `TableLayoutSnapshotAccessor.getStats()` 已按快照版本和构建次数缓存规模统计，避免调试轮询时反复扫描大表格 slice / bounds / row band。
33. `CanvasPool` 已改为增量维护当前空闲内存，并新增复用命中率，避免监控读取反复扫描空闲资源列表。
34. `RenderSurfaceManager.cacheSurfaceBitmap()` 已增加同版本写入序号保护，连续触发异步 `createImageBitmap` 时只允许最后一次快照写入缓存，迟到旧快照会关闭并计入过期丢弃。
35. `RenderBackendManager` 已增加 `pageEngineStatsList`，按页码和 layer 记录最近一次命中的 engine、耗时、reason、priority、累计渲染次数和 miss 次数，满足后续 debug 面板展示每页当前 engine 的验收项。
36. 已新增 `Draw.resetRenderBackendStats()`，用于测试场景前清空渲染调度、canvas 池、bitmap cache、surface 高水位和表格快照构建统计，但不释放当前资源或缓存。
37. 已在 `Editor` 实例上公开 `getRenderBackendStats()` 和 `resetRenderBackendStats()`，浏览器自动化测试和业务调试不再需要读取内部 `Draw` 实例。
