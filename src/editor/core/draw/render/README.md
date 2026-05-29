# Draw Render 目录说明

`render/` 是 draw 层的页面渲染区域，负责渲染策略选择、页面绘制、行绘制、输入预览、缓存和渲染完成后的状态同步。

## 位置说明

- 所属层级：公共绘制层 / 渲染层
- 上游调用：`Draw.ts`、`DrawRenderFacadeService`
- 下游依赖：`PageCanvasHost`、`render-backend/**`、layout 和 position

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `DrawRenderFacadeService.ts` | draw 对外渲染门面，处理可见页、布局和渲染入口。 |
| `DrawRenderPipeline.ts` | 根据页面模式和 lazy 参数执行渲染策略。 |
| `PageRenderer.ts` | 页面级渲染、懒渲染、可见页渲染和缓存统计。 |
| `PageContentPainter.ts` | 将页面内容绘制到指定 surface。 |
| `RowRenderer.ts` | 行级文本、选区和对象绘制。 |
| `DrawRenderFinalizeService.ts` | 渲染完成后刷新光标、历史、连续页高度和副作用。 |
| `DrawPostRenderEffects.ts` | 渲染后效果调度。 |
| `DrawRenderSurfaceInvalidator.ts` | 表格页、打字 patch 后的 surface 失效。 |
| `PageBitmapCacheController.ts` | 页面 base surface bitmap 缓存恢复。 |
| `TypingPatchCoordinator.ts` | 输入附近局部 patch 编排。 |
| `TypingPreviewRenderer.ts` | 打字 chunk 预览渲染。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `DrawRenderFacadeService.ts` | `render(payload?)` | 统一处理布局、渲染和 finalize。 | `Draw.render()` |
| `DrawRenderFacadeService.ts` | `getTableLayoutSnapshot()` | 读取当前表格布局快照。 | `Draw.ts`、table 模块 |
| `DrawRenderPipeline.ts` | `render(payload)` | 选择 lazy、立即或可见页渲染策略。 | `DrawRenderFacadeService.ts` |
| `PageRenderer.ts` | `drawPage()` / `drawPageToSurface()` | 执行页面渲染。 | `DrawRenderPipeline.ts`、导出链路 |
| `PageRenderer.ts` | `lazyRender()` / `immediateRender()` / `renderVisiblePages()` | 执行不同页面渲染模式。 | `DrawRenderPipeline.ts` |
| `PageContentPainter.ts` | `drawPageToSurface()` / `drawFloat()` | 绘制页面正文和浮动元素。 | `PageRenderer.ts` |
| `RowRenderer.ts` | `drawRow()` / `renderSelection()` | 绘制单行内容和选区。 | `PageContentPainter.ts`、`Draw.ts` |
| `DrawRenderFinalizeService.ts` | `refreshRuntime()` / `finalizeCursor()` / `submitHistory()` | 渲染后刷新运行时、光标和历史。 | `DrawRenderFacadeService.ts` |
| `DrawRenderSurfaceInvalidator.ts` | `applyTypingPatchInvalidation()` / `invalidateTablePages()` | 根据 patch 或表格影响清理 surface。 | `TypingPatchCoordinator.ts`、table 渲染 |
| `TypingPatchCoordinator.ts` | `patchAroundEdit()` / `logPatchResult()` | 尝试输入附近局部布局和渲染 patch。 | `DrawRenderFacadeService.ts` |
| `TypingPreviewRenderer.ts` | `renderTypingChunkPreview()` / `getStats()` / `resetStats()` | 预览式渲染输入影响区域并记录统计。 | `PageRenderer.ts` |
