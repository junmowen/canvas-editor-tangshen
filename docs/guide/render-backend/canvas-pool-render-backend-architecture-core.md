# Canvas 池核心架构与接口草案

## 1. 背景

当前项目已经把页面 DOM 与 canvas 生命周期收口到 `PageCanvasHost`，并在分页渲染中引入了可视页挂载与基础 canvas 池：

- `PageCanvasHost` 负责 `container` / `modalHost` / `pageContainer` / page wrapper / base canvas / overlay canvas / ctx 的生命周期。
- `PageRenderer.lazyRender()` 通过 `IntersectionObserver` 只挂载可视页 canvas。
- 页面离开视口后调用 `unmountCanvas()`，把 base / overlay canvas 放回池中。
- `PageRenderer.renderVisiblePages()` 和 overlay 刷新链路已经具备 visible-only 基础。

这说明项目已经有了“页面虚拟化 + canvas 复用”的雏形。下一阶段不应继续在 `PageCanvasHost` 中堆能力，而应该把 canvas 资源、渲染 surface 和渲染引擎调度抽到一个独立的渲染后端管理模块中。

目标是解决单 canvas 或单一渲染链路在大文档、多页、复杂表格、高频交互场景下的性能瓶颈。

## 2. 问题定义

当前瓶颈主要集中在四类：

1. `PageCanvasHost` 同时管理 DOM、canvas 池、ctx 数组和导出临时状态，职责开始变厚。
2. canvas 池只复用 `HTMLCanvasElement + CanvasRenderingContext2D`，还没有统一管理 OffscreenCanvas、bitmap cache、worker surface 等后端资源。
3. 渲染链路仍默认围绕 2D canvas 展开，缺少按任务选择渲染引擎的调度层。
4. `getCtxList()` / `getOverlayCtxList()` 这类数组暴露让上层直接依赖具体 canvas 形态，后续切换多引擎会被阻塞。

因此需要把“页面上有什么 DOM 节点”与“页面内容由哪个引擎绘制”分开。

## 3. 目标

### 3.1 创建统一 canvas 池

canvas 池不再只是 `PageCanvasHost` 的私有数组，而是独立管理以下资源：

1. base layer canvas
2. overlay layer canvas
3. measurement canvas
4. export canvas
5. optional OffscreenCanvas
6. optional ImageBitmap cache
7. optional worker render target

池化目标：

1. 避免高频创建 / 销毁 canvas DOM。
2. 避免频繁触发 canvas backing store 重分配。
3. 控制同时存在的高 DPR 大尺寸 canvas 数量。
4. 为后续 2D / OffscreenCanvas / WebGL / SVG 混合渲染提供统一资源入口。

### 3.2 抽离 canvas 到渲染后端管理模块

新增后端管理模块，建议命名为：

```txt
src/editor/core/render-backend/
```

推荐结构：

```txt
render-backend/
  CanvasPool.ts
  RenderSurfaceManager.ts
  RenderBackendManager.ts
  engines/
    Canvas2DRenderEngine.ts
    Overlay2DRenderEngine.ts
    OffscreenCanvasRenderEngine.ts
    SvgRenderEngine.ts
    WebGLRenderEngine.ts
  types/
    RenderBackend.ts
    RenderSurface.ts
    RenderLayer.ts
    RenderTask.ts
```

其中：

- `CanvasPool`：只负责 canvas / ctx / offscreen / bitmap 等资源复用。
- `RenderSurfaceManager`：负责 pageNo、layer、DOM host、canvas 实例之间的绑定关系。
- `RenderBackendManager`：负责接收渲染任务并选择具体 engine。
- `engines/*`：不同渲染引擎实现同一接口。

### 3.3 支撑多引擎混合渲染

后端模块应该允许按内容类型和刷新类型选择引擎：

| 内容 / 场景 | 默认引擎 | 说明 |
| --- | --- | --- |
| 正文、段落、普通表格 | Canvas2D | 保持现有实现一致 |
| selection、search、control highlight | Overlay2D | 独立 overlay 刷新 |
| 大文档静态页缓存 | OffscreenCanvas / ImageBitmap | 后台绘制后主线程合成 |
| 高频光标、辅助线、拖选反馈 | Overlay2D | 小区域清理与重绘 |
| 复杂图片滤镜、缩放预览 | WebGL | 作为后续可选能力 |
| 可交互外部块、嵌入内容 | DOM / SVG | 保留原有 DOM 宿主能力 |

第一阶段仍以 Canvas2D 为主，不要求一次引入 WebGL。多引擎后端的价值在于先把接口边界留出来，避免未来继续绑死在 `CanvasRenderingContext2D[]`。

## 4. 目标架构

### 4.1 分层

```txt
Draw / service facade
  |
  | render task
  v
RenderBackendManager
  |
  | select engine by layer / dirty type / capability
  v
Canvas2DRenderEngine / Overlay2DRenderEngine / OffscreenCanvasRenderEngine / ...
  |
  | acquire / release surface
  v
RenderSurfaceManager
  |
  | acquire / recycle canvas resource
  v
CanvasPool
```

### 4.2 `PageCanvasHost` 调整后职责

`PageCanvasHost` 后续只保留 DOM 宿主职责：

1. 创建 editor container。
2. 创建 `modalHost`。
3. 创建 `pageContainer`。
4. 创建 page wrapper。
5. 创建 overlay host。
6. 同步 page wrapper 与 overlay host 的尺寸。
7. 提供 page wrapper / overlay host 查询。

以下职责迁出：

1. base / overlay canvas 创建。
2. canvas 池管理。
3. ctx 数组维护。
4. pageNo 到 canvas 的挂载状态维护。
5. detached export surface 状态切换。

迁出后，`PageCanvasHost` 只知道页面容器，不知道页面由 2D canvas、OffscreenCanvas bitmap 还是 WebGL surface 绘制。

## 5. 核心接口草案

### 5.1 渲染层类型

```ts
export enum RenderLayer {
  BASE = 'base',
  OVERLAY = 'overlay',
  EXPORT = 'export',
  MEASURE = 'measure'
}
```

### 5.2 渲染 surface

```ts
export interface IRenderSurface {
  pageNo: number
  layer: RenderLayer
  width: number
  height: number
  dpr: number
  host?: HTMLElement
  canvas?: HTMLCanvasElement
  ctx2d?: CanvasRenderingContext2D
  offscreen?: OffscreenCanvas
  bitmap?: ImageBitmap
  mounted: boolean
}
```

上层不再直接拿 `ctxList[pageNo]`，而是通过 `RenderSurfaceManager.getSurface(pageNo, layer)` 获取 surface。

### 5.3 canvas 池

```ts
export interface ICanvasPoolAcquireOptions {
  layer: RenderLayer
  width: number
  height: number
  dpr: number
  alpha?: boolean
  willReadFrequently?: boolean
}

export interface ICanvasPoolItem {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  dpr: number
  layer: RenderLayer
}
```

`CanvasPool` 建议提供：

```ts
class CanvasPool {
  acquire(options: ICanvasPoolAcquireOptions): ICanvasPoolItem
  release(item: ICanvasPoolItem): void
  resize(item: ICanvasPoolItem, width: number, height: number, dpr: number): void
  clear(item: ICanvasPoolItem): void
  prune(maxIdleCount: number): void
  dispose(): void
}
```

关键规则：

1. `release()` 前必须清理 transform、alpha、clip、字体状态和尺寸相关状态。
2. canvas 尺寸只在变化时更新，避免每次挂载都重置 backing store。
3. 池内资源按 `layer + alpha + dpr bucket + size bucket` 分组，避免 overlay 透明 canvas 与 base 白底 canvas 混用。
4. 大尺寸 canvas 需要上限控制，避免高 DPR 下空闲池占用过多内存。
5. 第一阶段 base canvas 必须保持透明上下文并依赖 CSS 白底，不能直接切 `alpha: false`；如果后续启用不透明上下文，必须在每次 clear 后显式填充页面白底。

### 5.4 渲染任务

```ts
export interface IRenderTask {
  pageNo: number
  layer: RenderLayer
  reason: 'layout' | 'base-visible' | 'overlay-visible' | 'export' | 'measure'
  dirtyRectList?: DOMRect[]
  priority: 'sync' | 'animation-frame' | 'idle' | 'worker'
  isCurrentPage?: boolean
  isInteractive?: boolean
}
```

`RenderBackendManager` 根据 `layer`、`reason`、`priority`、浏览器能力选择引擎。
