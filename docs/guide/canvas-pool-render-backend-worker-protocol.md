# OffscreenCanvas Worker 协议与调度

### 6.4 当前核心缺口

当前已经完成的是资源、调度、fallback 和统计基座，还不能算真正完成多引擎渲染。核心缺口如下：

1. `OffscreenCanvasRenderEngine` 目前仍复用主线程 `task.execute`，没有真实 worker 绘制、没有 `ImageBitmap` 回传，也没有 worker 队列。
2. 现有 `PageContentPainter`、`RowRenderer`、各种 particle 和 frame painter 仍依赖 `Draw`、DOM、运行时对象和不可序列化上下文，不能直接在 worker 中执行。
3. 缺少 worker 可消费的页面渲染快照或绘制命令协议，无法把一页的布局、样式、图片、字体和装饰状态稳定传给 worker。
4. 缺少 worker 结果合成协议，包括 jobId、内容版本、DPR、尺寸、资源版本校验和过期结果丢弃。
5. 缺少真正的任务调度器：当前页提升、非当前页排队、并发上限、取消、超时、降级和滚动方向预取都还没有进入核心实现。
6. WebGL 和 SVG / DOM 仍只是 capability 占位，缺少具体适配对象、输入输出协议和与正文 canvas 的生命周期边界。

因此后续方案必须把“可序列化渲染输入、worker 执行、主线程合成、失效取消和多引擎内容边界”作为核心交付，而不是继续只补统计字段。

### 6.5 Worker 可渲染输入协议

OffscreenCanvas 不能接收 `Draw`、DOM 节点、`CanvasRenderingContext2D` 或带函数闭包的对象。主线程必须先把页面转换成 worker 可消费的稳定输入。第一版建议采用“绘制命令列表”作为过渡层，后续再把命令构建器下沉为纯渲染器。

```ts
interface IWorkerPageRenderSnapshot {
  jobId: number
  pageNo: number
  layer: RenderLayer.BASE
  width: number
  height: number
  dpr: number
  scale: number
  layoutVersion: number
  baseVisualVersion: number
  resourceVersion: number
  pageStyle: ISerializablePageStyle
  commandList: ICanvasPaintCommand[]
  resourceList: IRenderResourceRef[]
}

type ICanvasPaintCommand =
  | { type: 'clear'; rect: ISerializableRect }
  | { type: 'fillRect'; rect: ISerializableRect; fillStyle: string; alpha?: number }
  | { type: 'strokePath'; path: ISerializablePath; strokeStyle: string; lineWidth: number }
  | { type: 'fillText'; text: string; x: number; y: number; font: string; fillStyle: string; baseline: CanvasTextBaseline }
  | { type: 'drawImage'; resourceId: string; rect: ISerializableRect; opacity?: number }
```

命令构建规则：

1. `PageRenderSnapshotBuilder` 只在主线程读取 `Draw`、layout、options、position 和资源缓存，输出纯 JSON / transferable 数据。
2. 第一版命令可以覆盖 base 层正文、背景、水印、页眉页脚、页码、行号、浮动图片和普通表格边框；无法序列化的能力必须显式标记 `fallbackReason`，回退 Canvas2D。
3. 命令里不能出现函数、class 实例、DOMRect 实例、CanvasGradient、CanvasPattern、HTMLElement、ImageElement 或运行时对象引用。
4. 文本绘制先保持 Canvas2D 同字体字符串和同坐标，命令构建器负责固化 `font`、`fillStyle`、`baseline`、`alpha`、`textDecoration` 等状态。
5. 图片资源使用 `resourceId` 引用，主线程资源管理器负责把 `ImageBitmap`、Blob URL 或 ArrayBuffer 传给 worker，并维护资源版本。
6. 字体必须等待 `document.fonts.ready` 或记录字体未就绪状态；字体未就绪时 worker 任务回退主线程，避免字形度量差异导致像素抖动。

### 6.6 OffscreenCanvas Worker 执行链路

真实 worker 绘制链路应按以下顺序落地：

1. 主线程 `PageRenderer` 判断非交互页 base 可进入 worker 后，不再直接调用 `task.execute`，而是请求 `PageRenderSnapshotBuilder` 生成 `IWorkerPageRenderSnapshot`。
2. `WorkerRenderScheduler` 给任务分配递增 `jobId`，按页记录最新 job，提交给固定数量 worker。默认并发从 1 开始，压测稳定后再开放到 2。
3. worker 收到快照后创建或复用 `OffscreenCanvas`，按 `width * dpr`、`height * dpr` 设置 backing store，执行 `commandList`。
4. worker 调用 `transferToImageBitmap()` 返回 `{ jobId, pageNo, layoutVersion, baseVisualVersion, resourceVersion, width, height, dpr, bitmap }`。
5. 主线程合成前必须校验 pageNo、jobId 是否仍是该页最新任务，layout / base visual / resource / DPR / 尺寸是否一致。
6. 校验通过后，主线程只做 `drawImage(bitmap)` 合成到当前页 base surface，并写入 bitmap cache；校验失败则丢弃 bitmap，不触碰当前页面。
7. worker 抛错、超时、资源缺失、命令不支持或浏览器不支持 OffscreenCanvas 时，任务必须回退 Canvas2D，并把失败原因写入 backend fallback。

这个链路落地后，`offscreen-canvas` 的命中才表示真实后台绘制；当前 `worker-probe` 只能证明优先级和调度保护，不代表核心能力完成。

### 6.7 调度、取消和降级策略

核心调度规则：

1. 当前页、光标页、选区边界页、搜索活动页、控件编辑页和 overlay 永远走 `sync` 主线程路径。
2. 视口内非交互页可以进入 worker；视口外预测页只能在 idle 或滚动稳定后进入 worker。
3. 输入开始时取消当前页及相邻交互页 pending worker job；已在 worker 中执行的 job 不强杀，但返回后按版本丢弃。
4. 同一页只保留最新 job，旧 job 返回不能覆盖新内容。
5. worker 队列必须有最大长度，滚动快速变化时优先保留当前视口附近页面，丢弃远端旧任务。
6. worker 超时阈值第一版建议 1500ms，超过后本页本轮回退 Canvas2D，并记录 `timeout`。
7. 如果某浏览器连续 N 次 worker 失败，应自动熔断本会话 OffscreenCanvas engine，避免反复失败拖慢主链路。
