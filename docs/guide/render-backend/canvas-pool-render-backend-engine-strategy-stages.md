# 多引擎阶段策略

## 6. 多引擎调度策略

### 6.1 第一阶段策略

第一阶段不改变实际绘制算法，只改变资源入口：

1. base page 继续走 `Canvas2DRenderEngine`。
2. overlay 继续走 `Overlay2DRenderEngine`。
3. export 使用独立 `EXPORT` surface，替代旧的 `PageCanvasHost` detached state 方案。
4. measurement 使用 `MEASURE` surface，替代散落的临时 canvas。

当前实现已经落到代码里：

1. `RenderSurfaceManager` 负责 surface 绑定、挂载、卸载和临时 surface 创建。
2. `CanvasPool` 负责 canvas / ctx 的复用。
3. `RenderBackendManager` 已接入 `Canvas2DRenderEngine` 和 `Overlay2DRenderEngine`。
4. 导出链路已切到 transient surface，不再依赖 host 快照替换。
5. 文本测量、行布局测量、重复水印 pattern 已收口到 `MEASURE` / transient surface。
6. 黑屏问题已通过透明上下文与 surface 复用边界修正。
7. `Draw.getRenderBackendStats()` 已提供 canvas 池和后端调度统计，便于压测和线上排查。
8. `Draw.destroy()` 已触发 surface manager dispose，释放已挂载 surface、测量 surface 和 canvas 池空闲资源。
9. 已新增 `BitmapCache` 容器和统计，并接入 `RenderSurfaceManager` 生命周期；当前已提供手动缓存 API、失效规则、异步写入版本保护、过期快照丢弃统计、缓存内存估算、LRU 数量 / 内存上限、可视 base 页自动写入缓存和带内容版本校验的安全合成 API。内容版本由布局版本和 base 视觉版本组合而成，能覆盖背景、水印等不触发布局重算的基础视觉变化。页面卸载时会保留 base 缓存、清理 overlay 缓存，布局重算时会全量失效旧 bitmap 缓存；base 页已经在安全命中时自动合成 ImageBitmap 并跳过完整 base 重绘，命中后只刷新当前页 overlay，避免选区、搜索和控件高亮丢失，同时避免无关可视页重复刷新。
10. 已新增 `OffscreenCanvasRenderEngine`、`WebGLRenderEngine` 和 `SvgDomRenderEngine` 占位引擎并注册到 `RenderBackendManager`；当前只暴露能力探测和 enabled 状态，默认关闭，不抢占 Canvas2D 主渲染链路。`renderBackend` 选项已提供灰度开关，OffscreenCanvas 只允许非当前交互页 base 任务进入 worker 优先级。

### 6.2 第二阶段策略

引入静态页缓存：

1. layout 完成后，非活跃可视页可以绘制到 OffscreenCanvas。
2. 主线程 page canvas 只合成 ImageBitmap。
3. 当前编辑页、选区页、搜索命中页保持主线程 Canvas2D，以降低一致性风险。

### 6.3 第三阶段策略

按内容类型引入可选引擎：

1. 图片预览、滤镜、缩放可以走 WebGL。
2. 高复杂度装饰层继续走 overlay 2D。
3. 外部 block 保持 DOM / iframe / video module，不强行 canvas 化。
