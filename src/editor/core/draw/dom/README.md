# Draw DOM 目录说明

`dom/` 管理 draw 层和真实 DOM / canvas surface 的连接，包括页面容器、overlay、渲染 surface、bitmap 缓存和页面尺寸同步。

## 位置说明

- 所属层级：公共绘制层 / DOM 与 surface 宿主层
- 上游调用：`DrawServiceRegistry`、render backend、viewport
- 下游依赖：浏览器 DOM、`render-backend/**`

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `PageCanvasHost.ts` | 维护页面 DOM、canvas surface、overlay host、bitmap 缓存和页面尺寸。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `PageCanvasHost.ts` | `getContainer()` / `getPageContainer()` / `getModalHost()` | 读取编辑器外层、页面和弹层 DOM。 | `Draw.ts`、事件注册、模块 UI |
| `PageCanvasHost.ts` | `getSurface()` / `getSurfaceList()` / `getMeasureSurface()` | 获取页面渲染或测量 surface。 | `draw/render/**`、`render-backend/**` |
| `PageCanvasHost.ts` | `cacheSurfaceBitmap()` / `getBitmapCache()` / `invalidateBitmapCache()` | 管理页面 bitmap 缓存。 | `PageBitmapCacheController.ts`、渲染管线 |
| `PageCanvasHost.ts` | `setPageCount()` / `syncPageMetrics()` / `resizePageHeight()` | 同步分页 DOM 和页面高度。 | `DrawRenderFinalizeService.ts`、分页布局 |
| `PageCanvasHost.ts` | `mountCanvas()` / `unmountCanvas()` / `dispose()` | 挂载、卸载和销毁 canvas 资源。 | 懒渲染、`DrawLifecycleService.ts` |
| `PageCanvasHost.ts` | `prepareLayerTileSurfaces()` | 为分层 / 分块渲染准备 surface。 | render backend 和页面渲染 |
