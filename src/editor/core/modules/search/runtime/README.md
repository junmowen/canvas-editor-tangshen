# Search Runtime

`runtime/` 存放 `Search` 运行对象。

## 位置说明

- 所属业务：`search`
- 所属层级：查找替换运行对象
- 注册位置：`draw/runtime/DrawComponentRegistry.ts`
- 主要调用：`command/CommandAdaptSearch.ts`、`draw/layout/DrawLayoutPipeline.ts`、`modules/search/render/PageSearchRenderer.ts`

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `Search.ts` | 查找、替换、搜索导航、命中缓存和搜索高亮渲染 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `Search.ts` | `getSearchKeyword()` / `setSearchKeyword(payload)` | 读取或更新当前搜索关键词。 | `command/CommandAdaptSearch.ts`、`search/render/PageSearchRenderer.ts` |
| `Search.ts` | `searchNavigatePre()` / `searchNavigateNext()` | 跳转到上一个或下一个搜索命中项。 | `command/CommandAdaptSearch.ts` |
| `Search.ts` | `searchNavigateScrollIntoView(position)` | 将指定搜索命中位置滚动到可见区域。 | `searchNavigatePre()`、`searchNavigateNext()` |
| `Search.ts` | `getSearchNavigateIndexList()` / `getSearchMatchList()` | 读取命中索引列表和命中结果列表。 | 搜索导航、搜索 range 查询和渲染链路 |
| `Search.ts` | `consumeSearchRenderPageNoList()` | 消费需要刷新搜索高亮的页码列表。 | `search/render/PageSearchRenderer.ts`、`table/render/TableOverlayRenderer.ts` |
| `Search.ts` | `getSearchNavigateInfo()` | 返回搜索导航总数和当前命中序号。 | `command/CommandAdaptSearch.ts` |
| `Search.ts` | `getMatchList(payload, options)` | 计算指定内容中的搜索匹配片段。 | `Search.compute()`、控件搜索高亮链路 |
| `Search.ts` | `compute(payload, options)` | 重新计算全文搜索命中、导航状态和待渲染页。 | `draw/layout/DrawLayoutPipeline.ts` |
| `Search.ts` | `render(ctx, pageIndex)` | 在指定页绘制搜索高亮。 | `search/render/PageSearchRenderer.ts`、`table/render/TableOverlayRenderer.ts` |
| `Search.ts` | `replace(payload, option)` | 替换当前搜索命中内容。 | `command/CommandAdaptSearch.ts` |

## 维护规则

- 只放需要持有运行态状态或访问 `Draw` 门面的搜索对象。
- 对外类型如 `INavigateInfo` 从本目录导出，并由 `src/editor/index.ts` 汇总。
