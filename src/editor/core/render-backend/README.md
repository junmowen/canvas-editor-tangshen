# Render Backend 目录索引

`render-backend/` 存放 Canvas / WebGL / SVG / worker 渲染后端、surface 和 bitmap cache。

## 位置说明

- 所属层级：渲染后端公共层
- 主要下钻：`engines/`、`worker/`

## 文件说明

| 文件 / 目录 | 职责 |
| --- | --- |
| `RenderBackendManager.ts` | 渲染后端选择、注册和统计 |
| `RenderSurfaceManager.ts` | 页面 surface、bitmap cache 和 transient surface 管理 |
| `CanvasPool.ts` | 空闲 canvas 池 |
| `BitmapCache.ts` | 页面 bitmap 缓存 |
| `RenderBackendDebugPanel.ts` | 后端调试面板 |
| `engines/` | Canvas2D / Overlay2D / SVG DOM / WebGL / OffscreenCanvas 后端实现 |
| `worker/` | worker 页面快照、调度和协议 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `RenderBackendManager.ts` | `register()` / `render()` / `getStats()` / `resetStats()` | 管理渲染后端和输出统计。 | `DrawServiceRegistry`、渲染链路 |
| `RenderSurfaceManager.ts` | `getSurface()` / `mountPage()` / `resizePage()` / `cacheSurfaceBitmap()` / `composeBitmapCacheToSurface()` | 管理页面 surface 和 bitmap cache。 | `PageRenderer.ts`、worker 链路 |
| `CanvasPool.ts` | `acquire()` / `release()` / `resize()` / `dispose()` | 管理空闲 canvas。 | `RenderSurfaceManager.ts` |
| `BitmapCache.ts` | `set()` / `get()` / `delete()` / `clear()` / `getStats()` | 管理 bitmap 缓存。 | `RenderSurfaceManager.ts` |
| `RenderBackendDebugPanel.ts` | `update()` / `destroy()` | 调试面板刷新和销毁。 | `Draw.ts` 调试面板链路 |

