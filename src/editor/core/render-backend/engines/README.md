# Render Backend Engines 目录说明

`engines/` 存放不同渲染后端的实现。

## 位置说明

- 所属层级：渲染后端层 / 引擎实现
- 上游调用：`RenderBackendManager.ts`
- 下游依赖：`IRenderSurface`、`IRenderTask`

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `Canvas2DRenderEngine.ts` | Canvas 2D 默认渲染后端。 |
| `Overlay2DRenderEngine.ts` | overlay 层 Canvas 2D 渲染后端。 |
| `OffscreenCanvasRenderEngine.ts` | OffscreenCanvas 渲染后端。 |
| `SvgDomRenderEngine.ts` | SVG DOM 渲染后端占位 / 能力实现。 |
| `WebGLRenderEngine.ts` | WebGL 渲染后端占位 / 能力实现。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `*RenderEngine.ts` | `canRender(task)` | 判断当前引擎是否能处理渲染任务。 | `RenderBackendManager.render()` |
| `*RenderEngine.ts` | `render(surface, task)` | 在目标 surface 执行渲染任务。 | `RenderBackendManager.render()` |
| `*RenderEngine.ts` | `getCapability()` | 返回引擎能力信息。 | 后端注册和调试面板 |
