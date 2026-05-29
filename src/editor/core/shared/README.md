# Shared 目录索引

`shared/` 存放公共遍历和通用工具。

## 位置说明

- 所属层级：公共工具层
- 下钻目录：`traversal/`、`utils/`

## 文件说明

| 文件 / 目录 | 职责 |
| --- | --- |
| `traversal/ElementTreeTraversal.ts` | 元素树遍历和 position table context 创建 |
| `utils/editorState.ts` | 编辑器状态判断 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `traversal/ElementTreeTraversal.ts` | `walkElementTree()` / `findElementTree()` | 遍历和查找元素树。 | `draw/data`、`table`、`control` 链路 |
| `traversal/ElementTreeTraversal.ts` | `createPositionTableContext()` | 为 position 计算构造表格上下文。 | `Position.ts` |
| `utils/editorState.ts` | `isEditorDisabled(draw)` | 判断编辑器是否处于 disabled。 | 事件、命令和状态判断链路 |

