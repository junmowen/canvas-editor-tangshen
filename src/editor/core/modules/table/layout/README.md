# Table Layout

`layout/` 存放表格参与行布局、position 快照和表格布局引擎的业务规则。

## 位置说明

- 所属业务：`table`
- 所属层级：行布局 / 表格分页 / 表格快照层
- 上游调度：`draw/layout/`、`draw/render/`、`draw/runtime/DrawServiceRegistry.ts`、`render-backend/worker/*`
- 下游依赖：表格遍历、表格 fragment、chunk 局部布局和目标解析

## 文件说明

| 文件 / 目录 | 职责 |
| --- | --- |
| `TableRowLayoutPolicy.ts` | 表格元素参与行级断行、递归扫描、行内表格判断和分页 fragment 触发策略 |
| `engine/` | 表格布局、跨页拆分、chunk 索引和局部重分页实现 |
| `TableLayoutSnapshot*.ts` | 表格布局快照、访问器和存储 |
| `TableCellContentInset.ts` | 表格单元格内容内边距计算 |

## 函数说明

| 文件 / 目录 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `TableRowLayoutPolicy.ts` | `isTableElement(element)` | 判断元素是否为表格，供行布局、worker 快照和表格策略复用。 | `draw/layout/RowLayoutEngine.ts`、`render-backend/worker/*` |
| `TableRowLayoutPolicy.ts` | `isInlineTableElement(element)` | 判断元素是否为行内表格。 | `draw/layout/RowLayoutEngine.ts`、`TableRowLayoutPolicy` 内部策略 |
| `TableRowLayoutPolicy.ts` | `shouldBreakAtTableBoundary(payload)` | 判断块级表格边界是否需要强制断行。 | `draw/layout/DrawLayoutPipeline.ts` |
| `TableRowLayoutPolicy.ts` | `isSingleTableElementRow(row)` | 判断当前行是否只包含一个表格元素。 | `draw/layout/PagePartitioner.ts`、`shouldFragmentTableRow()` |
| `TableRowLayoutPolicy.ts` | `hasTableElementInRow(row)` | 判断行内是否存在表格元素。 | `draw/layout/chunk/PageChunkRuntimePatcher.ts` |
| `TableRowLayoutPolicy.ts` | `visitTableCellValueList(payload)` | 当前元素为表格时遍历单元格内容并返回命中状态。 | `draw/render/DrawRenderFinalizeService.ts` |
| `TableRowLayoutPolicy.ts` | `hasInlineTableElementInRow(row)` | 判断当前行是否包含行内表格。 | `shouldFragmentTableRow()` |
| `TableRowLayoutPolicy.ts` | `shouldFragmentTableRow(payload)` | 判断当前行是否需要进入表格跨页 fragment 拆分逻辑。 | `draw/layout/PagePartitioner.ts` |
| `TableCellContentInset.ts` | `getTableCellContentInset(table, td)` | 按表格边框类型和单元格边框配置计算单元格内容内边距。 | `draw/layout/DrawMetricsService.ts`、`modules/table/render/RowTableRenderHelper.ts`、`modules/table/position/computeTableCellPositions.ts`、`layout/engine/*` |
| `TableLayoutSnapshotTypes.ts` | `getTableLayoutLogicalCellKey(tableId, trId, tdId)` | 生成逻辑表格单元格 key。 | `TableLayoutSnapshotBuilder.ts`、`TableLayoutSnapshotAccessor.ts`、`engine/TableCellChunk*.ts` |
| `TableLayoutSnapshotTypes.ts` | `getTableLayoutFragmentCellKey(tableId, trId, tdId)` | 生成分页 fragment 单元格 key。 | `TableLayoutSnapshotBuilder.ts`、`TableLayoutSnapshotAccessor.ts` |
| `TableLayoutSnapshotTypes.ts` | `getTableLayoutCellFragmentAliasKey(cellKey, trId, tdId)` | 生成逻辑单元格到 fragment 单元格的别名 key。 | `TableLayoutSnapshotBuilder.ts`、`TableLayoutSnapshotAccessor.ts` |
| `TableLayoutSnapshotTypes.ts` | `getTableLayoutCellPageKey(cellKey, pageNo)` | 生成逻辑单元格与页码组合 key。 | `TableLayoutSnapshotBuilder.ts`、`TableLayoutSnapshotAccessor.ts` |
| `TableLayoutSnapshotBuilder.ts` | `build(request)` | 从当前布局结果构建表格分页 slice、cell bounds 和逻辑表映射快照。 | `TableLayoutSnapshotStore.ts`、`draw/runtime/DrawServiceRegistry.ts` 持有后调用 |
| `TableLayoutSnapshotBuilder.ts` | `getStats()` / `resetStats()` | 读取或重置表格快照构建耗时和规模统计。 | `Draw.resetRenderBackendStats()`、调试统计读取链路 |
| `TableLayoutSnapshotStore.ts` | `invalidate()` | 递增快照版本并清空缓存快照。 | 布局状态变更链路 |
| `TableLayoutSnapshotStore.ts` | `syncLogicalTableState()` | 立即重建并同步逻辑表格快照。 | 表格布局状态同步链路 |
| `TableLayoutSnapshotStore.ts` | `getSnapshot()` | 懒构建并返回当前表格布局快照。 | `TableLayoutSnapshotAccessor.ts` |
| `TableLayoutSnapshotAccessor.ts` | `resolveSliceByFragmentContext(payload)` | 通过 fragment 表格 / 行 / 单元格上下文解析表格 slice。 | `draw/data/DrawTargetResolverService.ts`、表格双击解析 |
| `TableLayoutSnapshotAccessor.ts` | `resolveSliceByPositionContext(payload)` | 通过 positionContext 解析对应的表格 slice。 | 目标解析、命中测试和表格导航链路 |
| `TableLayoutSnapshotAccessor.ts` | `getCellSlicesByCellKey(cellKey)` / `getCellSlicesByLogicalCell(payload)` | 按逻辑单元格读取跨页 slice 列表。 | 表格双击、目标解析和导航链路 |
| `TableLayoutSnapshotAccessor.ts` | `resolveCellSliceByAbsoluteIndex(payload)` / `resolveCellSliceByPageNo(payload)` | 按文档级索引或页码定位单元格 slice。 | 表格目标解析、定位和渲染辅助链路 |
| `TableLayoutSnapshotAccessor.ts` | `getPageFragmentPositions(pageNo)` / `getFragmentCellBounds(fragmentTableId)` | 读取页内 fragment position 或 fragment 单元格边界。 | 表格目标解析和渲染辅助链路 |
| `TableLayoutSnapshotAccessor.ts` | `resolveCellLocalRange(payload)` / `getSelectionRangeForElementList(payload)` | 将文档级范围换算为单元格局部范围或选区范围。 | 表格选区、复制和导航链路 |
| `TableLayoutSnapshotAccessor.ts` | `resolveLogicalTableId(tableId)` / `resolveLogicalTableIndex(tableId)` / `isSameLogicalTable(payload)` | 将 fragment 表格映射回逻辑表格并比较逻辑归属。 | 表格目标解析、拖拽和导航链路 |
| `engine/TableLayoutEngine.ts` | `measure(payload)` / `measureIfTable(payload)` | 执行表格整体测量、行列尺寸计算和跨页拆分入口判断。 | `draw/layout/RowLayoutEngine.ts` |
| `engine/TableLayoutEngine.ts` | `createFragmentRows(payload)` | 根据表格 fragment 生成参与页面排版的行结构。 | `draw/layout/PagePartitioner.ts` |
| `engine/TableFragmentSplitter.ts` | `split(payload)` | 按可用高度把逻辑表格拆为分页 fragment。 | `engine/TableLayoutEngine.ts` |
| `engine/TableChunkRangeIndex.ts` | `rebuild()` / `findNearestRangeFromPage()` / `hasRangeInPageWindow()` / `getAffectedPageNoListForWindow()` | 维护表格 chunk 覆盖范围并支持可见页窗口查询。 | `draw/runtime/DrawServiceRegistry.ts` 持有，渲染和布局管线按需调用 |
| `engine/TableCellChunkIndex.ts` | `rebuild()` / `markDirtyByCurrentContext()` / `getChunkByCellAndIndex()` / `markDirtyByCellKey()` | 维护单元格局部 chunk 索引和脏标记。 | `draw/runtime/DrawServiceRegistry.ts` 持有，输入态表格局部布局调用 |
| `engine/TableCellChunkPipeline.ts` | `patchCurrentCell(payload)` | 输入态尝试对当前表格单元格执行局部 patch。 | `draw/render/DrawRenderFacadeService.ts` |
| `engine/TableLocalRelayoutPipeline.ts` | `patchCurrentTable()` | 复用表格分页器重算受影响逻辑表并写回运行时布局。 | `draw/runtime/DrawServiceRegistry.ts` 持有，表格输入态局部重分页调用 |

## 维护规则

- 表格参与行布局的判断留在本目录，不内联回 `draw/layout/RowLayoutEngine.ts`。
- 表格布局引擎和跨页拆分继续放在 `layout/engine/`。
