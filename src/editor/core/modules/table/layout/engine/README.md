# Table Layout Engine

这个目录存放表格布局引擎、跨页拆分、chunk 索引和表格局部重分页实现。

这些模块仍会注入 `Draw` 读取运行时上下文，但职责归属是表格布局域，而不是通用 `draw/layout`。`draw/layout` 保留行布局、分页切块和文档 chunk 等通用能力。

## 位置说明

- 所属业务：`table`
- 所属层级：表格布局引擎、chunk 索引和局部重分页层
- 注册位置：`draw/runtime/DrawServiceRegistry.ts`、`draw/layout/RowLayoutEngine.ts`
- 主要调用：`draw/layout/*`、`draw/render/DrawRenderFacadeService.ts`

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `TableLayoutEngine.ts` | 表格整体测量、跨页拆分入口和 fragment 行生成 |
| `TableFragmentSplitter.ts` | 表格跨页 fragment 拆分 |
| `TableCellChunkBuilder.ts` / `TableCellChunkIndex.ts` / `TableCellChunkPipeline.ts` / `TableCellChunkStats.ts` | 单元格 chunk 构建、索引、局部 patch 和统计 |
| `TableChunkRangeBuilder.ts` / `TableChunkRangeIndex.ts` / `TableChunkRangeStats.ts` | 表格 chunk 覆盖范围构建、索引和统计 |
| `TableLocalRelayout*.ts` | 当前表格局部重分页目标解析、测量、写回和统计 |
| `TableLocalRelayoutTypes.ts` / `TableLayoutTypes.ts` | 表格布局和局部重分页类型 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `TableLayoutEngine.ts` | `measure(payload)` / `measureIfTable(payload)` | 执行表格测量、单元格内容测量和跨页拆分入口判断。 | `draw/layout/RowLayoutEngine.ts` |
| `TableLayoutEngine.ts` | `createFragmentRows(payload)` | 将表格 fragment 转换为分页排版可消费的行。 | `draw/layout/PagePartitioner.ts` |
| `TableFragmentSplitter.ts` | `split(payload)` | 按页面可用高度拆分表格 fragment。 | `TableLayoutEngine.ts` |
| `TableCellChunkBuilder.ts` | `createCellChunkList()` / `appendSliceChunks()` | 为单元格 slice 构建局部 chunk 列表。 | `TableCellChunkIndex.ts` |
| `TableCellChunkIndex.ts` | `rebuild()` / `markDirtyByCurrentContext()` / `getChunkByCellAndIndex()` / `markDirtyByCellKey()` | 维护单元格 chunk 索引和脏 chunk。 | `draw/runtime/DrawServiceRegistry.ts` 持有，输入态局部布局调用 |
| `TableCellChunkPipeline.ts` | `patchCurrentCell(payload)` | 尝试对当前表格单元格执行局部 patch。 | `draw/render/DrawRenderFacadeService.ts` |
| `TableChunkRangeIndex.ts` | `rebuild()` / `findNearestRangeFromPage()` / `hasRangeInPageWindow()` / `getAffectedPageNoListForWindow()` | 建立并查询表格 chunk 覆盖范围。 | 布局和渲染窗口判断链路 |
| `TableLocalRelayoutPipeline.ts` | `patchCurrentTable()` | 对当前逻辑表执行局部重分页并写回运行时布局。 | 表格输入态局部重分页链路 |
| `TableLocalRelayoutTargetResolver.ts` | `resolveCurrentTarget()` | 解析当前可重分页的逻辑表和运行时范围。 | `TableLocalRelayoutPipeline.ts` |
| `TableLocalRelayoutMeasurer.ts` | `measureTablePageRows(payload)` | 复用表格分页器测量受影响表格页行。 | `TableLocalRelayoutPipeline.ts` |
| `TableLocalRelayoutRuntimePatcher.ts` | `patch(payload)` | 将局部重分页结果写回运行时 row / position。 | `TableLocalRelayoutPipeline.ts` |

## 维护规则

- 表格布局、表格分页拆分、表格局部重分页优先放在这里。
- 通用行布局和非表格分页能力仍保留在 `src/editor/core/draw/layout/`。
- 对外访问表格布局快照应继续通过 `table/layout` 的 snapshot accessor 或 draw service registry。
