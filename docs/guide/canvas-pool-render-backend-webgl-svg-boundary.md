# WebGL 图片与 DOM / SVG Block 边界

### 6.8 WebGL 图片管线边界

WebGL 不应直接接管正文文字。第一版只接以下任务：

1. 图片预览缩放、旋转、滤镜、裁剪预览和高分辨率图片降采样。
2. 输入是 `ImageBitmap` 或 HTMLImageElement 转换后的资源句柄，输出是 `ImageBitmap` 或写回指定 image preview surface。
3. 正文 base 绘制仍通过 Canvas2D `drawImage` 消费 WebGL 结果，避免 WebGL 与文字排版耦合。
4. WebGL context 必须有 LRU 资源释放、context lost 监听和 fallback 到 Canvas2D 图片路径。
5. 导出默认不走 WebGL，除非图片滤镜结果已经固化为缓存 bitmap，避免导出和可视预览不一致。

### 6.9 DOM / SVG Block 管线边界

DOM / SVG engine 的核心不是把正文 canvas 改成 DOM，而是把外部 block 生命周期独立出来：

1. 只接管外部 block、iframe、video、复杂 SVG 装饰或需要原生 DOM 交互的模块。
2. 输入是 block 的布局框、z-index、页码、滚动可见性和业务数据快照。
3. 输出是 DOM host 挂载 / 更新 / 卸载操作，不参与 base canvas bitmap cache。
4. block DOM 必须跟随 page wrapper 生命周期，在页面卸载或 bitmap 命中时仍保持正确显示。
5. 导出时不能依赖 DOM 原节点，必须提供独立的 rasterize / serialize fallback，否则导出路径回退 Canvas2D 或跳过该 engine。

### 6.10 调试与压测入口

当前实现已经通过 `Draw.getRenderBackendStats()` 暴露运行时统计：

```ts
const stats = draw.getRenderBackendStats()
```

业务实例也可以通过 `Editor` 公开入口读取：

```ts
const stats = editor.getRenderBackendStats()
```

测试单个场景前可以调用：

```ts
draw.resetRenderBackendStats()
editor.resetRenderBackendStats()
```

返回结果包含：

1. `surface`：页面 surface 数量、已挂载 base / overlay 页码、测量 surface 状态、活跃 transient surface 数量、已挂载 surface backing store 估算内存、测量 surface 估算内存、transient surface 估算内存、active surface 总内存和峰值、bitmap 缓存数量、命中次数、合成次数、合成拒绝次数、合成拒绝原因、过期丢弃次数、LRU 淘汰次数、内容版本校验结果、缓存上限和估算内存。
2. `canvasPool`：空闲 canvas 数量、历史最高空闲数量、申请次数、创建次数、释放次数、命中次数、命中率、按 layer 分组的空闲数量、当前空闲内存和峰值内存。
3. `backend`：渲染调度次数、成功渲染次数、未命中次数、各 engine 命中次数、各 engine 总耗时 / 平均耗时 / 最大耗时、最近 120 次调度窗口的慢任务数量 / 平均耗时 / 最大耗时 / 任务分布、每页每层最近一次命中的 engine 状态、按 layer / reason / priority 分组的任务统计、最近一次调度结果，以及已注册 engine 的 capability 列表。
4. `memory`：active surface、空闲 canvas 池、bitmap cache 和总估算内存，以及三类资源的历史峰值。
5. `tableSnapshot`：表格布局快照规模和构建耗时，包括 cell slice、页索引、逻辑 cell、fragment cell、cell bounds、row band、跨页 slice 高水位，以及 build 次数、最近耗时、平均耗时和最大耗时。
6. `baseBitmapContentVersion`：非布局 base 视觉版本，用于排查背景、水印等配置变化后 bitmap 缓存是否正确失效。

该入口用于验证：

1. 大文档滚动后 canvas 池是否稳定在上限内。
2. overlay 任务是否命中 `Overlay2DRenderEngine`。
3. export 任务是否命中 `Canvas2DRenderEngine`。
4. 是否存在未命中的 render task。
5. bitmap 缓存是否因失效过于频繁出现大量过期丢弃。
6. bitmap 合成是否因为页码、layer、逻辑尺寸、DPR、bitmap 像素尺寸、布局版本或 base 视觉版本不匹配被安全校验拒绝。
7. bitmap 缓存是否触发 LRU 淘汰，以及默认数量 / 内存上限是否需要按业务文档规模调整。
8. OffscreenCanvas、WebGL、SVG / DOM 能力是否可用，以及对应引擎是否处于启用状态。
9. 各渲染引擎的平均耗时和最大耗时是否符合预期，是否存在某类任务持续超过单帧预算。
10. 渲染任务是否集中在某个 layer、reason 或 priority 上，便于判断后续优先优化 base、overlay、export 还是 worker 路径。
11. 已挂载 surface、活跃 transient surface、空闲 canvas 池和 bitmap cache 四类 backing store 内存是否都处于可控范围，并通过 `memory.estimatedTotalMB` 观察总量。
12. 表格分页快照的 slice / row band / bounds 规模是否异常增长，以及 `tableSnapshot.build` 的构建耗时是否超过单帧预算，便于判断大表格性能瓶颈来自布局索引、命中测试还是渲染。
13. `backend.recentWindow` 是否在滚动、输入、选区拖拽后出现近期慢任务峰值，避免累计平均值掩盖当前性能问题。
15. `backend.pageEngineStatsList` 是否能正确显示每页 base / overlay / export 最近一次命中的 engine、耗时和 miss 状态，便于测试时定位单页异常。
16. 单场景测试前调用 `draw.resetRenderBackendStats()`，执行滚动、输入、搜索或导出后再读取 `draw.getRenderBackendStats()`，确保命中率、慢任务和高水位来自当前场景。
