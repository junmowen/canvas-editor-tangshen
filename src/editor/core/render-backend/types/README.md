# Render Backend Types 目录说明

`types/` 存放渲染后端共享类型。

## 位置说明

- 所属层级：渲染后端层 / 类型定义
- 上游调用：render backend、draw render、worker
- 下游依赖：无运行时依赖

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `RenderBackend.ts` | 渲染后端接口。 |
| `RenderLayer.ts` | 渲染层枚举。 |
| `RenderSurface.ts` | 渲染 surface 接口和页面状态。 |
| `RenderTask.ts` | 渲染任务、优先级、原因和执行器类型。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `RenderBackend.ts` | `IRenderBackend.canRender()` / `render()` / `getCapability()` | 约束渲染引擎接口。 | `engines/**`、`RenderBackendManager.ts` |
| `RenderTask.ts` | `RenderTaskExecutor` | 描述实际绘制任务函数签名。 | `DrawRenderPipeline.ts`、`PageRenderer.ts` |
| `RenderLayer.ts` | `RenderLayer` | 标识 base、overlay 等渲染层。 | `PageCanvasHost.ts`、`RenderSurfaceManager.ts` |
