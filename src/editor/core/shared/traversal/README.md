# Shared Traversal 目录索引

`shared/traversal/` 存放跨模块复用的元素树遍历能力。

## 位置说明

- 所属层级：公共 shared 层 / 元素树遍历
- 上游调用：range、worker、模块查询和导出链路
- 下游依赖：普通元素、控件 valueList、表格单元格遍历工具

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `ElementTreeTraversal.ts` | 统一遍历普通元素、控件内部值和表格单元格元素树。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `ElementTreeTraversal.ts` | `walkElementTree(payload)` | 深度遍历文档元素树，并允许回调中断遍历。 | range 查询、worker 统计、业务模块 |
| `ElementTreeTraversal.ts` | `createPositionTableContext()` | 为 position / table 遍历创建表格上下文。 | position 和 table 链路 |
| `ElementTreeTraversal.ts` | `findElementTree<T>()` | 在元素树中查找第一个满足条件的元素。 | 命令、查询和业务工具 |

## 维护规则

- 普通元素、控件 `valueList` 和表格单元格的统一遍历入口放在这里。
- 表格单元格的底层遍历仍归属 `modules/table/utils/`，这里只负责把它接入通用元素树。
- 不把业务匹配、命令执行或渲染副作用放进遍历工具。
