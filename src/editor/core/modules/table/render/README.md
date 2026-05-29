# Table Render

`render/` 存放表格专属渲染辅助、覆盖层渲染和渲染失效管理。

## 位置说明

- 上游调用：`draw/render/RowRenderer.ts`、`draw/render/TypingPatchCoordinator.ts`、`draw/render/DrawRenderFacadeService.ts`、`render-backend/worker/*`
- 下游依赖：表格布局快照、表格粒子、表格 overlay、表格 chunk 索引
- 迁移目的：公共渲染管线只调度表格 helper，不直接维护表格裁剪、跨行列选区、fragment 顶边补画和 overlay 失效。

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `RowTableRenderHelper.ts` | 表格单元格递归绘制、裁剪、跨行列选区和 fragment 顶边补画 |
| `TableRowElementRenderer.ts` | 表格元素行内绘制、fragment 选择和跨行列 range 目标记录 |
| `TableTypingRenderHelper.ts` | 表格输入时的 td 子 chunk 脏标记和逻辑表页码解析 |
| `TableOverlayRenderer.ts` | 表格 overlay 层渲染 |
| `RenderInvalidationManager.ts` | 表格相关渲染失效、overlay 刷新和帧调度 |

## 函数说明

| 文件 | 函数/方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `TableRowElementRenderer.ts` | `canRender(element)` | 判断行元素是否是表格渲染目标 | `RowRenderer` |
| `TableRowElementRenderer.ts` | `render(payload)` | 渲染表格元素行，处理 fragment 和 range paint 目标 | `RowRenderer` |
| `RowTableRenderHelper.ts` | `applyCellClip(payload)` / `restoreCellClip(ctx)` | 对表格单元格内容绘制应用和恢复裁剪 | `RowRenderer`、`PageRenderSnapshotTable*` |
| `RowTableRenderHelper.ts` | `forEachCellPayload(payload)` | 遍历表格单元格并组装绘制 payload | `RowRenderer`、表格 worker 快照命令 |
| `RowTableRenderHelper.ts` | `renderCrossRowColSelection(payload)` | 绘制跨行列选区 | `RowRenderer` |
| `RowTableRenderHelper.ts` | `drawFragmentCellTopBorder(payload)` | 补画分页 fragment 顶部单元格边框 | `RowRenderer`、worker 快照 |
| `RowTableRenderHelper.ts` | `enqueueRangePaint(payload)` | 缓存表格 range 绘制任务 | `TableRowElementRenderer` |
| `TableTypingRenderHelper.ts` | `markTableCellChunkDirty(editIndex)` | 标记当前表格单元格 chunk 脏区 | `TypingPatchCoordinator` |
| `TableTypingRenderHelper.ts` | `resolveCurrentLogicalTablePageNoList()` | 解析当前逻辑表涉及的页码 | `TypingPatchCoordinator` |
| `TableOverlayRenderer.ts` | `prepareSelectionContext()` | 准备 overlay 渲染所需的表格选区上下文 | `DrawRenderFacadeService` |
| `TableOverlayRenderer.ts` | `clearPage(pageNo)` | 清理指定页 overlay | `DrawRenderFacadeService` |
| `TableOverlayRenderer.ts` | `renderPageOverlay()` / `renderVisibleOverlay()` | 绘制单页或可见页表格 overlay | `DrawRenderFacadeService` |
| `RenderInvalidationManager.ts` | `mark*/clear*/has*Dirty()` | 维护 layout、selection、search、control、overlay 等 dirty 状态 | draw render 服务和输入 patch 流程 |
| `RenderInvalidationManager.ts` | `scheduleFrameRender()` / `flushScheduledFrameRender()` / `cancelScheduledFrameRender()` | 调度、执行或取消帧渲染 | `DrawRenderFacadeService`、输入和渲染管线 |
| `RenderInvalidationManager.ts` | `renderVisibleOverlayIfNeeded()` | dirty 时刷新可见 overlay | `DrawRenderFacadeService` |

## 维护规则

- 表格渲染特例留在本目录，不再放回 `draw/render/`。
- 公共 render 管线只负责调度，通过明确 helper 调用表格渲染能力。
