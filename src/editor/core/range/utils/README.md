# Range Utils 目录说明

`range/utils/` 存放 range 层的纯工具函数。

## 位置说明

- 所属层级：公共 range 层 / 工具
- 上游调用：`RangeManagerState.ts`、copy 和查询链路
- 下游依赖：range、元素列表

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `resolveSelectionContent.ts` | 解析选区内容范围并切片元素列表。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `resolveSelectionContent.ts` | `resolveSelectionContentRange()` | 计算选区实际内容起止边界。 | `RangeManagerState.ts`、复制链路 |
| `resolveSelectionContent.ts` | `sliceSelectionContent<T>()` | 按选区内容范围切片元素列表。 | range 查询、copy |
