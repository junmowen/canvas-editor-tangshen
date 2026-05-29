# Table Position 目录索引

`position/` 存放表格参与 position 计算的业务规则，包括表格上下文里的 positionList 解析和单元格内部 position 计算能力。

## 位置说明

- 所属业务：`table`
- 所属层级：position 计算策略层
- 上游调度：`position/Position.ts`
- 下游依赖：表格 target resolver、表格单元格 inset、分页 fragment 和垂直对齐策略

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `TablePositionPolicy.ts` | 行内表格、fragment 绑定和单元格 position 计算触发判断 |
| `resolveTablePositionList.ts` | 表格上下文中的 positionList 解析和分页片段归并 |
| `computeTableCellPositions.ts` | 表格单元格内部元素 position 递归计算 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `TablePositionPolicy.ts` | `hasInlineTableElement(elementList)` | 判断元素列表中是否包含行内表格。 | `position/Position.ts` |
| `TablePositionPolicy.ts` | `resolveTableFragmentForPositionElement(element)` | 为 position 元素解析对应表格 fragment。 | `position/Position.ts` |
| `TablePositionPolicy.ts` | `isNonTableElementInInlineTableRow(payload)` | 判断当前元素是否处于行内表格行但自身不是表格。 | `position/Position.ts` |
| `TablePositionPolicy.ts` | `shouldComputeTableCellPosition(element)` | 判断是否需要计算单元格内部 position。 | `position/Position.ts` |
| `resolveTablePositionList.ts` | `resolveTablePositionList(...)` | 根据表格上下文解析当前可用 positionList。 | `position/Position.ts` |
| `computeTableCellPositions.ts` | `computeTableCellPositions(...)` | 递归计算表格单元格内部元素位置并处理垂直对齐偏移。 | `position/Position.ts` |

## 维护规则

- 行内表格判断、表格 fragment 绑定、单元格递归位置计算触发条件放在这里。
- 表格单元格 positionList 的分页片段归并、pagingId 匹配和局部索引归一化放在这里。
- 表格单元格内部元素 position 递归计算、垂直对齐坐标偏移放在这里。
- `position/Position.ts` 保留公开入口和基础正文 position 管理，不直接枚举表格元素条件。
