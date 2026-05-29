# Table Particle

这个目录存放表格绘制、表格工具条、表格操作和合并拆分逻辑。

这些类仍由 `DrawComponentRegistry` 装配，并通过 `draw.getTableParticle()` / `draw.getTableTool()` / `draw.getTableOperate()` 暴露给现有主链。目录归属调整为表格域，避免表格能力继续散落在 `draw/particle/table/`。

## 位置说明

- 所属业务：`table`
- 所属层级：表格绘制、工具条和结构操作层
- 注册位置：`draw/runtime/DrawComponentRegistry.ts`
- 主要调用：`command/CommandAdaptTable.ts`、`draw/render/RowRenderer.ts`、`modules/table/interaction/*`

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `TableParticle.ts` | 表格绘制、行列信息计算、选区范围绘制和拆分表合并 |
| `TableTool.ts` | 表格工具条渲染、定位和事件绑定 |
| `TableOperate.ts` | 表格插入、行列增删、自适应、边框、背景、合并拆分等结构操作 |
| `TableMergeMethods.ts` | 表格单元格合并、取消合并、横向 / 纵向拆分方法挂载 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `TableParticle.ts` | `getRangeRowCol()` | 读取当前跨行列选区的单元格矩阵。 | `table/interaction/resolveTableCopyElementList.ts`、range 状态链路 |
| `TableParticle.ts` | `getTableWidth()` / `getTableHeight()` / `computeRowColInfo(element)` | 计算表格尺寸和行列索引信息。 | `table/layout/engine/*`、`table/target/*`、`TableOperate.ts` |
| `TableParticle.ts` | `getTdListByColIndex()` / `getTdListByRowIndex()` / `getRowCountByColIndex()` | 按行列索引读取单元格集合。 | `TableOperate.ts`、`TableLayoutEngine.ts` |
| `TableParticle.ts` | `mergeSplittedTable(payload)` | 合并分页拆分后的表格片段。 | 表格布局和导出相关链路 |
| `TableParticle.ts` | `drawRange(ctx, element, x, y)` / `render(ctx, element, x, y)` | 绘制表格选区范围和表格本体。 | `draw/render/RowRenderer.ts`、`table/render/TableRowElementRenderer.ts` |
| `TableTool.ts` | `render()` / `dispose()` | 渲染或销毁表格工具条。 | `table/interaction/TableToolEffect.ts`、`applyTableToolState.ts` |
| `TableOperate.ts` | `insertTable()` / `insertTableTopRow()` / `insertTableBottomRow()` / `insertTableLeftCol()` / `insertTableRightCol()` | 表格和行列插入。 | `command/CommandAdaptTable.ts` |
| `TableOperate.ts` | `deleteTableRow()` / `deleteTableCol()` / `deleteTable()` | 行、列和整表删除。 | `command/CommandAdaptTable.ts` |
| `TableOperate.ts` | `autoFitTable()` / `adjustColWidth()` | 表格自适应和列宽调整。 | `command/CommandAdaptTable.ts`、表格工具条 |
| `TableOperate.ts` | `tableTdVerticalAlign()` / `tableBorder*()` / `tableTdBorder*()` / `tableTdBackgroundColor()` | 单元格对齐、表格边框、单元格边框和背景设置。 | `command/CommandAdaptTable.ts`、右键菜单 |
| `TableMergeMethods.ts` | `installTableMergeMethods(TableOperateClass)` | 将合并、取消合并、横向 / 纵向拆分方法挂载到 `TableOperate`。 | `TableOperate.ts` 模块初始化 |

## 维护规则

- 表格绘制、表格工具条、表格结构操作优先放在这里。
- 通用粒子仍放在 `src/editor/core/draw/particle/`。
- 对外调用入口暂时保持 Draw facade，避免一次性扩大调用方改造范围。
