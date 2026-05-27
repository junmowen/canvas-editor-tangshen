# 坐标、目标对象与消费链路收敛说明

本文档约束编辑器内部“坐标 -> 目标对象 -> 业务消费”的调用边界，避免业务模块继续自己拼 `positionContext`、元素列表、表格单元格和当前对象来源。

## 核心链路

标准链路为：

```text
CoordinateService -> TargetResolver -> ObjectResolver -> 业务消费
```

- `CoordinateService` 负责坐标、光标、位置列表和 positionContext 的统一入口。
- `TargetResolver` 负责把 range、positionContext、命中结果解析成当前目标对象、表格、td、控件边界等上下文。
- `ObjectResolver` 负责 header/main/footer、当前编辑列表、原始列表、布局列表、行列表等对象源读取。
- 业务模块只消费解析结果，不自己拼对象来源。

## 坐标约束

业务代码不直接访问 `Position`：

- 不使用 `draw.getPosition()`。
- 不使用 `draw.getComponents().position`。
- 需要位置列表、光标、命中、positionContext 时走 `draw.getCoordinate()`。

当前 `DrawCoordinateService` 仍桥接到底层 `Position`，这是内部实现细节；外部调用不应绕过它。
`Draw` 上不再保留旧的 `getPosition()` facade；底层 `Position` 仅通过 `getInternalPosition()` 暴露给 `DrawCoordinateService`。

## 对象源约束

业务代码不直接从 runtime 或组件上拼对象列表：

- 当前编辑列表：`draw.getObjectResolver().getElementList()`
- 当前原始列表：`draw.getObjectResolver().getOriginalElementList()`
- 正文原始列表：`draw.getObjectResolver().getOriginalMainElementList()`
- 布局正文列表：`draw.getObjectResolver().getLayoutMainElementList()`
- 行列表：`draw.getObjectResolver().getRowList()` / `getOriginalRowList()`
- header/main/footer 聚合：`getOriginalEditorData()` 或 `getOriginalZoneElementList()`

业务模块不应使用 `positionContext.index` 直接读取 `getOriginalElement(...)` 或 `getOriginalMainElement(...)`。当前上下文对象应交给 `TargetResolver` 解析。

业务侧也不直接消费 header/footer 单独列表：

- 需要完整三段数据时使用 `getOriginalEditorData()`。
- 需要按区域遍历时使用 `getOriginalZoneElementList()`。

业务侧不直接计算正文首尾边界：

- 正文 index 是否有效使用 `getIsOriginalMainIndexAvailable(index)`。
- 正文 range 是否有效使用 `getIsOriginalMainRangeAvailable(startIndex, endIndex)`。
- 文档末尾 index 使用 `getOriginalMainLastIndex()`。
- 文档末尾元素使用 `getOriginalMainLastElement()`。
- placeholder 空正文判断使用 `getIsOriginalMainPlaceholderAvailable()`。

## 当前目标解析

需要“当前对象”时优先使用：

- `resolveRangeElement(...)`
- `resolveRangeAnchorElement(...)`
- `resolveRangeBoundaryElements(...)`
- `resolveElementByPositionContext(positionContext)`

需要“当前表格 / 当前 td”时优先使用：

- `resolveContextTable(...)`
- `resolveActiveLogicalTableCell(...)`
- `resolveActiveLogicalTableTd(...)`
- `resolveOriginalTableTdByIndex(...)`
- `resolveTableTdByIndex(...)`

业务模块不应自己组合 `tableId + trIndex + tdIndex + elementList` 来找 td，除非正在实现 `TargetResolver` 或表格算法本身。

## 表格遍历约束

普通对象树里的表格单元格遍历使用：

```ts
import { forEachTableCell, resolveTableCellByIndex } from '../table/utils/TableCellTraversal'
```

注意根据调用文件位置调整相对路径。

如果调用方只是“遍历普通元素树并处理命中元素”，优先使用：

```ts
import { walkElementTree, findElementTree } from '../utils/ElementTreeTraversal'
```

`walkElementTree / findElementTree` 会统一处理普通 `IElement` 表格下钻，调用方只保留匹配和读写逻辑。
`CommandElementTraversal` 和 `walkControlElementList` 已复用该底层遍历；command/control 自己只保留各自的上下文映射和业务过滤规则。

适合使用 `forEachTableCell` 的场景：

- command / control / search / track-change 中需要直接拿到 tr/td 结构的表格逻辑。
- worker 任务中需要保留表格页码、文本分组或结构上下文的专用统计逻辑。
- layout 或 render 流程中扫描原始或布局后的 `IElement` 表格。

不适合强行替换的场景：

- `tableFragment` 分页片段。
- 表格结构算法，如行列增删、合并拆分、导航算法。
- 渲染几何计算中依赖 fragment row、td bounds、rowList 顺序的专用循环。

## 架构检查

`node scripts/verify-architecture.js` 已覆盖以下约束：

- `Position` 只能在 `CoordinateService` 后面。
- 旧 `draw.getPosition()` 禁止回流，`draw.getInternalPosition()` 只能由 `CoordinateService` 使用。
- `dataAccess` 只能在 `ObjectResolver` 和 service registry 内部使用。
- runtime 对象列表只能通过 `ObjectResolver` 暴露。
- table snapshot accessor 只能在 `TargetResolver` 后面。
- 旧 `DrawTableCellTraversal` 和旧函数名禁止回流。
- 业务侧禁止用 `positionContext.index` 直接解析对象。
- 业务侧禁止直接消费 header/footer 单独列表。
- 业务侧禁止直接读取正文首元素或正文列表长度。
- 单元素对象读取只能留在 `Position` 和 `TargetResolver` 实现层。
- command 层禁止直接消费正文原始列表，需通过 `ObjectResolver` 聚合入口、`TargetResolver` 或领域服务拿解析结果。
- command / worker / draw interactive / draw control / 图片粒子这类普通元素树遍历禁止直接读 `.trList/.tdList`。
- 普通元素树遍历禁止直接使用 `forEachTableCell`，`Search` 这种按 td 分段的专用逻辑除外。

新增类似入口时，优先补 `TargetResolver / ObjectResolver / CoordinateService`，再让业务模块消费新入口。
