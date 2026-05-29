# Position Utils 目录说明

`position/utils/` 存放 position 层的纯工具函数，用于按索引定位 position 和解析 pointer 边界。

## 位置说明

- 所属层级：公共坐标层 / position 工具
- 上游调用：`Position.ts`、`PositionHitTestMethods.ts`
- 下游依赖：positionList、元素类型和页面坐标

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `resolvePositionAtIndex.ts` | 从 positionList 中按逻辑索引查找 position，并提供边界兜底。 |
| `resolvePointerBoundaryAtPosition.ts` | 根据当前 position 生成 pointer 边界和折叠光标位置。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `resolvePositionAtIndex.ts` | `resolvePositionAtIndex()` | 按索引从 positionList 查找命中位置，找不到时使用邻近位置。 | `Position.ts`、命中和光标链路 |
| `resolvePointerBoundaryAtPosition.ts` | `resolvePointerBoundaryAtPosition()` | 计算当前 position 左右边界和 pointer 命中语义。 | `PositionHitTestMethods.ts` |
| `resolvePointerBoundaryAtPosition.ts` | `createCollapsedLeftCursorPosition()` | 为折叠光标生成左侧边界 position。 | `PositionHitTestMethods.ts` |
