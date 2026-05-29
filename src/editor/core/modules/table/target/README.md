# Table Target Resolvers

这个目录存放表格目标解析器，用于把当前位置、选区、事件命中和表格快照转换为表格上下文。

这些 resolver 仍由 `DrawTargetResolverService` 装配，对外调用入口保持 `draw.getTargetResolver()`，但表格相关解析逻辑归属表格域。

## 位置说明

- 所属业务：`table`
- 所属层级：表格目标解析层
- 注册位置：`draw/data/DrawTargetResolverService.ts`
- 主要调用：表格导航、表格渲染、表格工具条、表格选区、worker 快照

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `DrawTableTargetContextResolver.ts` | 基于当前文档、range、positionContext 解析表格目标和单元格上下文 |
| `DrawTableTargetSnapshotResolver.ts` | 基于表格布局快照解析 slice、fragment、cell bounds 和局部 range |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `DrawTableTargetContextResolver.ts` | `resolveRangeBoundaryElements()` / `resolveRangeAnchorElement()` / `resolveRangeElement()` | 在表格上下文中解析 range 边界、锚点和当前元素。 | `draw/data/DrawTargetResolverService.ts` |
| `DrawTableTargetContextResolver.ts` | `resolveControlBoundaryElements()` | 解析表格内控件边界元素。 | `control/runtime/*` |
| `DrawTableTargetContextResolver.ts` | `resolveTableIndexById()` / `resolveOriginalTableById()` / `resolveLogicalTableById()` / `resolveOriginalTableByIndex()` | 通过 id 或索引解析原始表格和逻辑表格。 | 表格导航、控件和值读取链路 |
| `DrawTableTargetContextResolver.ts` | `resolveContextTable()` / `resolveTableTarget()` | 根据 range 或 positionContext 解析当前表格目标。 | `runtime/contextmenu/ContextMenu.ts`、表格命令链路 |
| `DrawTableTargetContextResolver.ts` | `resolveElementByPositionContext()` | 通过 positionContext 解析目标元素。 | 指针、选区和表格工具条链路 |
| `DrawTableTargetContextResolver.ts` | `resolveActiveLogicalTableCell()` / `resolveLogicalTableCellByPositionContext()` / `resolveActiveLogicalTableTd()` | 解析当前 active 逻辑单元格和 td。 | 表格导航、选区和控件链路 |
| `DrawTableTargetContextResolver.ts` | `getLogicalCellSliceList()` / `resolveOriginalTableTdByIndex()` / `resolveTableTdByIndex()` / `resolvePreviousPagingTable()` | 查询逻辑单元格 slice、原始 td、当前 td 和上一个分页表格。 | 表格导航、布局和工具条链路 |
| `DrawTableTargetSnapshotResolver.ts` | `getStats()` | 读取表格布局快照统计。 | 调试统计链路 |
| `DrawTableTargetSnapshotResolver.ts` | `resolveLogicalTableIndex()` / `isSameLogicalTable()` | 解析逻辑表格索引并比较逻辑归属。 | 表格导航和拖拽链路 |
| `DrawTableTargetSnapshotResolver.ts` | `resolveTableSliceByPositionContext()` / `resolveTableSliceByFragmentContext()` | 通过 positionContext 或 fragment 上下文解析表格 slice。 | 表格渲染、导航、工具条、worker 快照 |
| `DrawTableTargetSnapshotResolver.ts` | `getPageFragmentPositions()` / `getFragmentCellBounds()` | 读取页内 fragment position 和 fragment 单元格边界。 | 表格渲染和命中链路 |
| `DrawTableTargetSnapshotResolver.ts` | `getCellSlicesByLogicalCell()` / `getCellSlicesByCellKey()` / `resolveCellSliceByAbsoluteIndex()` / `resolveCellSliceByPageNo()` | 按逻辑单元格、cellKey、文档索引或页码读取 cell slice。 | 表格选区、双击、导航链路 |
| `DrawTableTargetSnapshotResolver.ts` | `resolveCellLocalRange()` / `getSelectionRangeForElementList()` | 将文档级 range 映射为表格单元格局部 range。 | 表格选区和复制链路 |

## 维护规则

- 表格上下文、表格目标、表格快照切片解析优先放在这里。
- 非表格的数据访问和通用目标解析继续保留在 `src/editor/core/draw/data/`。
- 类型复用可继续引用 `DrawTargetResolverTypes`，避免一次性扩大类型迁移范围。
