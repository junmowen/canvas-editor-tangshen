# Table Selection 目录索引

`selection/` 存放表格选择相关的类型、起点解析和投影服务。

## 位置说明

- 所属业务：`table`
- 所属层级：表格选区策略和公开投影层
- 上游调度：`range/`、`range/selection/`、`event/handlers/`、`search/range/`
- 下游依赖：表格 target resolver、表格布局 slice 和跨行列选区状态

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `TableSelectionTypes.ts` | 表格选区渲染、公开 range 和内容范围类型 |
| `TableSelectionProjectionService.ts` | 表格选区到公开 range / cursor / 渲染范围的投影 |
| `resolveTableSelectionStartState.ts` | 指针按下时的表格选区起点解析 |
| `resolveTableDragSelectionRange.ts` | 表格拖选单元格范围解析 |
| `resolveTablePointerSelection.ts` | Shift 表格选区和跨行列 range 判断 |
| `resolveTablePointerIndex.ts` | 表格上下文中的 pointer index 归一化 |
| `resolveActiveTableSelectionOffset.ts` | active table 前导 offset 和 fragment offset 解析 |
| `resolveTableKeywordSearchRange.ts` | 搜索命中 range 映射到表格上下文 |
| `clearCrossRowColSelection.ts` | 清理跨行列选区 |
| `isTableDragSourceDeletable.ts` | 判断表格拖拽源是否允许删除 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `TableSelectionProjectionService.ts` | `getSelectionContentRange()` | 将当前表格选区投影为内容范围。 | `range/RangeManagerBase.ts` |
| `TableSelectionProjectionService.ts` | `getPublicCursorPosition()` / `getPublicRange()` | 将表格内部光标和 range 转换为对外公开状态。 | `range/RangeManagerBase.ts`、`RangeManagerState.ts` |
| `TableSelectionProjectionService.ts` | `getRenderSelectionRange(payload)` | 解析当前表格选区的渲染范围。 | `range/RangeManagerState.ts`、表格 overlay 渲染链路 |
| `resolveTableSelectionStartState.ts` | `resolveTableSelectionStartState(payload)` | 根据表格指针命中结果生成选区起点状态。 | `range/selection/resolveSelectionStartState.ts` |
| `resolveTableDragSelectionRange.ts` | `createTableDragSelectionHit(payload)` / `resolveTableCellDragSelection(payload)` | 创建表格拖选命中信息并解析拖选单元格范围。 | `range/selection/resolveSelectionDragRange.ts` |
| `resolveTableDragSelectionRange.ts` | `isSameTableDragSelectionCell()` / `isSameTableDragSelectionFragment()` / `shouldSelectSingleTableCell()` | 判断拖选是否仍在同一单元格 / fragment 或是否选择单格。 | `resolveTableCellDragSelection()` |
| `resolveTableDragSelectionRange.ts` | `createTableDragPositionContext(payload)` | 生成拖选后的表格 positionContext。 | `resolveTableCellDragSelection()` |
| `resolveTablePointerSelection.ts` | `resolveTableShiftSelectionBoundary(payload)` | 解析 Shift 扩展表格选区边界。 | 指针选择链路 |
| `resolveTablePointerSelection.ts` | `isTableCrossRowColSelectionRange(range)` | 判断 range 是否是跨行列表格选区。 | range 状态和渲染链路 |
| `resolveTablePointerIndex.ts` | `resolveTableAwarePointerIndex()` / `resolveTableAwarePointerTargetIndex()` | 将表格上下文中的 pointer index 转为合理编辑索引。 | `event/handlers/dblclick.ts`、指针选择链路 |
| `resolveActiveTableSelectionOffset.ts` | `resolveActiveTableLeadingOffset()` / `resolveActiveTableFragmentOffset()` | 解析 active table 选区前导和分页 fragment 偏移。 | `range/RangeManagerState.ts` |
| `resolveTableKeywordSearchRange.ts` | `resolveTableKeywordSearchRange(payload)` | 将搜索命中结果映射为表格单元格内 range。 | `search/range/SearchRangeQuery.ts` |
| `clearCrossRowColSelection.ts` | `clearCrossRowColSelection(draw)` | 清理当前跨行列选区状态。 | 键盘删除和表格导航链路 |
| `isTableDragSourceDeletable.ts` | `isTableDragSourceDeletable(payload)` | 判断表格拖拽源单元格内容是否允许删除。 | 拖拽提交链路 |

## 维护规则

- 表格选择起点解析和拖选单元格 range 解析放在这里，避免散落到 event utils 或 range 通用编排里。
- 表格渲染选区、公开 range 和公开 cursor 的投影规则放在这里，`range/` 只保留通用状态入口。
- 表格指针命中索引、Shift 扩展选区、搜索命中 range 的表格上下文映射放在这里。
- 表格单元格前导占位和分页片段偏移解析放在这里，RangeManager 不直接读取表格切片细节。
- 跨行列选区清理放在这里，keyboard intent 不直接维护表格选区内容。
- 拖拽源单元格是否允许删除等表格选择/拖拽规则放在这里。
- 不在这里直接维护普通文本选区编辑状态。
