# Table Interaction 目录索引

`interaction/` 存放表格交互副作用。

## 位置说明

- 所属业务：`table`
- 所属层级：事件交互副作用层
- 上游调度：`event/handlers/`、`event/keyboard/`、`event/pointer/`、`modules/table/navigation/`
- 下游依赖：表格工具条、表格选区、拖拽命中上下文和表格布局快照

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `TableToolEffect.ts` | 表格工具条销毁和按条件渲染 |
| `applyTableToolState.ts` | 键盘导航后按状态渲染或销毁表格工具条 |
| `isDragDropWithinSameTableCell.ts` | 判断拖拽提交是否仍在原单元格内 |
| `adjustTableDragDropPositionContext.ts` | 拖拽跨入 / 跨出表格时修正命中上下文索引 |
| `resolveTableCopyElementList.ts` | 跨行列表格选区复制结构拼装 |
| `resolveTableCellDblclickIntent.ts` | 表格单元格连续双击状态和整格选区解析 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `TableToolEffect.ts` | `disposeTableTool(draw)` | 销毁表格工具条并释放相关事件监听。 | `event/pointer/intents/selection/SelectionStartIntent.ts`、`SelectionDragIntent.ts` |
| `TableToolEffect.ts` | `renderTableToolIfNeeded(payload)` | 命中表格且非只读、非表单模式时渲染表格工具条。 | `event/pointer/intents/selection/SelectionStartIntent.ts` |
| `applyTableToolState.ts` | `applyTableToolState(draw, disposeTableTool)` | 根据导航结果统一渲染或销毁表格工具条。 | `event/keyboard/intents/BackspaceIntent.ts`、`modules/table/navigation/resolveTable*KeyboardMove.ts` |
| `isDragDropWithinSameTableCell.ts` | `isDragDropWithinSameTableCell(payload)` | 比较拖拽快照和当前命中上下文的 `tdId`，判断是否仍在同一单元格。 | `event/pointer/intents/drag-drop/DragCommitIntent.ts` |
| `adjustTableDragDropPositionContext.ts` | `adjustTableDragDropPositionContext(payload)` | 拖拽内容跨入或跨出表格后，修正 positionContext 的文档级索引。 | `event/pointer/intents/drag-drop/DragCommitMutationIntent.ts` |
| `resolveTableCopyElementList.ts` | `resolveTableCopyElementList(draw)` | 将当前跨行列选区拼成可写入剪贴板的单个表格元素列表。 | `event/handlers/copy.ts` |
| `resolveTableCellDblclickIntent.ts` | `resolveTableCellDblclickIntent(payload)` | 解析双击命中的逻辑单元格 slice，维护连续双击计数。 | `event/handlers/dblclick.ts` |
| `resolveTableCellDblclickIntent.ts` | `resolveTableCellDblclickSelectionRange(payload)` | 连续双击同一单元格后，解析整格内容的局部选区范围。 | `event/handlers/dblclick.ts` |

## 维护规则

- 表格工具条渲染、销毁等 UI 副作用放在这里。
- 表格单元格多击/双击的连续命中状态解析放在这里，event handler 只传入 draw 和 pointer session。
- 表格拖拽提交中的 same-cell 判断、进出表格 positionContext 修正放在这里。
- 表格复制时的跨行列选区结构拼装放在这里，copy handler 只负责写剪贴板。
- keyboard / pointer intent 可以调用这里的表格交互 helper，但不在事件目录继续新增表格工具条实现。
- 表格结构、选区和布局计算仍分别放在 `particle/`、`selection/`、`layout/` 等专门目录。
