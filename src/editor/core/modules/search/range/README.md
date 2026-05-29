# Search Range

`range/` 存放搜索命中转换为编辑器选区范围的业务规则。

## 位置说明

- 上游调用：`src/editor/core/range/RangeManagerQuery.ts`
- 下游依赖：`Search.getMatchList()`、`modules/table/selection/resolveTableKeywordSearchRange.ts`
- 迁移目的：range 查询层只暴露关键词 range 查询入口，不直接访问搜索运行对象和表格搜索上下文映射。

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `SearchRangeQuery.ts` | 将搜索模块命中列表聚合为 range 列表，并处理表格单元格上下文映射 |

## 函数说明

| 函数 | 作用 | 调用地方 |
| --- | --- | --- |
| `getSearchKeywordRangeList(draw, keyword)` | 读取搜索命中列表，按 `groupId` 聚合为连续 range，并补充表格单元格上下文 | `RangeManagerQuery.getKeywordRangeList()` |

## 维护规则

- 搜索命中到 range 的转换留在本目录。
- `core/range` 只调用搜索范围入口，不直接访问 `Search` 运行对象。
