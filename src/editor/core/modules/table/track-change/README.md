# Table Track Change

`track-change/` 存放表格参与修订留痕的业务策略。

## 位置说明

- 上游调用：`src/editor/core/draw/track-change/TrackChangeService.ts`
- 下游依赖：`modules/table/utils/TableCellTraversal.ts`
- 迁移目的：修订服务只处理批次、接受/拒绝和矩形聚合，不直接维护表格形态判断、单元格递归和分页片段遍历。

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `TableTrackChangePolicy.ts` | 表格修订递归遍历、表格摘要判断和分页片段位置遍历 |

## 函数说明

| 函数 | 作用 | 调用地方 |
| --- | --- | --- |
| `isTrackChangeTableElement(element)` | 判断元素是否是修订链路需要递归处理的表格 | `forEachTrackChangeTableCell()` |
| `isTrackChangeContainerElement(element)` | 判断元素是否包含表格或嵌套 `valueList`，用于修订收集调试摘要 | `TrackChangeService.collectRecordList()` |
| `hasTrackChangeTableElement(elementList)` | 判断修订记录元素列表中是否包含表格 | `TrackChangeService.getRecordList()` |
| `getTrackChangeTableRowCount(element)` | 获取表格行数，用于修订摘要输出 | `TrackChangeService.collectRecordList()` |
| `forEachTrackChangeTableCell(payload)` | 遍历表格单元格，隐藏 `ElementType.TABLE` 和 `forEachTableCell` 细节 | `TrackChangeService.resolveElementList()`、`collectRecordList()`、`collectElementPositionRectList()`、`collectElementTrackChangeIdSet()`、`markElementAndChildren()` |
| `forEachTrackChangeTableFragmentPosition(payload)` | 遍历分页表格片段中的单元格行元素和 position | `TrackChangeService.collectPageTableFragmentRectList()` |

## 维护规则

- 表格形态判断和单元格遍历留在本目录或 `table/utils/`。
- `draw/track-change` 只处理修订批次、接受/拒绝和矩形聚合流程，不直接散写表格枚举判断。
