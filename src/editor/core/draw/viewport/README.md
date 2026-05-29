# Draw Viewport 目录说明

`viewport/` 管理可见页、懒渲染观察器、overlay 刷新和指针坐标换算，是渲染和事件之间的视口适配层。

## 位置说明

- 所属层级：公共绘制层 / 视口层
- 上游调用：`Draw.ts`、event、render
- 下游依赖：`PageCanvasHost`、`DrawViewState`、`PointerCoordinateService`

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `DrawViewportService.ts` | 维护懒渲染 observer、可见页刷新、额外渲染页和指针坐标。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `DrawViewportService.ts` | `refreshVisibleOverlay()` | 刷新可见页 overlay。 | table、selection、render finalize |
| `DrawViewportService.ts` | `setLazyRenderObserver()` / `getLazyRenderObserver()` / `disconnectLazyRender()` | 管理懒渲染 IntersectionObserver。 | `PageRenderer.ts`、`DrawLifecycleService.ts` |
| `DrawViewportService.ts` | `getPointerCoordinates()` / `getPointerDelta()` | 解析指针坐标和拖拽位移。 | `DrawCoordinateService.ts`、event pointer |
| `DrawViewportService.ts` | `resolveVisibleRenderPageNos()` / `enqueueExtraVisibleRenderPages()` | 计算本轮需要渲染的页面。 | `DrawRenderFacadeService.ts`、table 局部刷新 |
| `DrawViewportService.ts` | `refreshVisiblePagesIfNeeded()` | 必要时触发可见页重绘。 | mutation、异步分页 rebalance |
