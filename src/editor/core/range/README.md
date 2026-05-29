# Range 目录索引

`range/` 存放 range 状态、编辑和查询的公共入口。

## 位置说明

- 所属层级：range 公共编排层
- 下钻目录：`selection/`、`utils/`

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `RangeManagerBase.ts` | range 基础状态和投影服务装配 |
| `RangeManagerState.ts` | range 状态、公共 cursor 和 render range |
| `RangeManagerEdit.ts` | range 编辑入口和控件 / 表格 / 标题 / 列表边界处理 |
| `RangeManagerQuery.ts` | range 查询、关键词范围和元素筛选 |
| `RangeManager.ts` | range 门面聚合 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `RangeManagerBase.ts` | 构造和投影服务初始化 | 装配表格选区投影服务。 | `Draw` 初始化 |
| `RangeManagerState.ts` | `getRenderSelectionRange()` / `getPublicRange()` / `getPublicCursorPosition()` | 提供对外 range / cursor 状态。 | 渲染和外部 API |
| `RangeManagerEdit.ts` | `isRangeInputAllowed()` / `removeHiddenElements()` / `shrinkBoundary()` | 处理输入、隐藏元素清理和边界收缩。 | keyboard / input / pointer intent |
| `RangeManagerQuery.ts` | `getKeywordRangeList()` | 获取关键词匹配 range。 | search 链路 |
| `utils/resolveSelectionContent.ts` | `resolveSelectionContentRange()` / `sliceSelectionContent()` | 处理 range 内容截取。 | range 查询和复制链路 |

