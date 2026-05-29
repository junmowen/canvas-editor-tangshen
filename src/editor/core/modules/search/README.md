# Search 模块

`search/` 承接查找替换业务，负责搜索关键字、命中列表、跳转位置和搜索高亮渲染。

## 子目录说明

| 目录 | 职责 |
| --- | --- |
| `range/` | 搜索命中转换为 range 的查询策略 |
| `render/` | 搜索命中参与页面绘制的编排 |
| `runtime/` | Search 运行对象、命中缓存、跳转状态和渲染页追踪 |

## 维护规则

- 搜索相关状态和渲染副作用留在本模块，不再放回 `draw/interactive/`。
- 搜索页级渲染调度留在 `render/`，不要内联回 `draw/render/PageContentPainter.ts`。
- 表格单元格遍历通过 `modules/table/utils/`，普通元素树遍历通过 `core/shared/traversal/`。

## 位置说明

- 所属层级：业务模块层 / 搜索
- 上游调用：command query、page render
- 下游依赖：`runtime/`、`range/`、`render/`

## 文件说明

| 目录 | 职责 |
| --- | --- |
| `runtime/` | 搜索关键字、命中缓存、跳转和渲染页追踪。 |
| `range/` | 搜索命中转换为 range。 |
| `render/` | 搜索高亮页级渲染调度。 |

## 函数说明

| 目录 | 主要入口 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `runtime/Search.ts` | search runtime 方法 | 查找、替换、跳转和高亮状态管理。 | command、render |
| `range/` | search range helper | 将搜索命中转换为 range。 | range query |
| `render/` | search render helper | 绘制搜索高亮。 | `PageContentPainter` |
