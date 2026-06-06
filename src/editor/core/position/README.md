# Position 目录索引

`position/` 存放位置、命中和坐标计算的核心公开入口。

## 位置说明

- 所属层级：坐标和命中公共层
- 下钻目录：`utils/`

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `Position.ts` | positionList、floatPositionList、cursor position 和 positionContext 管理 |
| `PositionHitTestMethods.ts` | 将 position 结果扩展为命中语义并安装到 Position 上 |
| `utils/resolvePositionAtIndex.ts` | 索引到 position 的定位工具 |
| `utils/resolvePointerBoundaryAtPosition.ts` | 根据 position 生成 pointer 边界 / collapsed cursor 位置 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `Position.ts` | `getPositionList()` / `getMainPositionList()` / `getMainPositionListByPage()` | 读取当前 position 缓存。 | `DrawCoordinateService`、命中和渲染链路 |
| `Position.ts` | `computePositionList()` / `computePositionListFromPage()` / `computeRowPosition()` / `computePageRowPosition()` | 计算整篇或分页 position。 | `draw/layout/RowLayoutEngine.ts`、`draw/layout/PagePartitioner.ts` |
| `Position.ts` | `setCursorPosition()` / `setCursorLogicalIndex()` / `getCursorPosition()` | 管理光标 position 和逻辑索引。 | cursor 和 range 链路 |
| `PositionHitTestMethods.ts` | `installPositionHitTestMethods(PositionClass)` | 将命中方法安装到 Position。 | `Position.ts` 模块初始化 |
| `utils/resolvePositionAtIndex.ts` | `resolvePositionAtIndex(...)` | 根据索引读取 position。 | 命中和光标链路 |
| `utils/resolvePointerBoundaryAtPosition.ts` | `resolvePointerBoundaryAtPosition(...)` / `createCollapsedLeftCursorPosition(...)` | 解析 pointer 边界和折叠光标位置。 | 指针命中链路 |

