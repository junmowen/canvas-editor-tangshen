# Draw State 目录说明

`state/` 存放 draw 层视图状态，包括可见页、当前页、渲染次数、页面像素比和页面模式。

## 位置说明

- 所属层级：公共绘制层 / 视图状态层
- 上游调用：`Draw.ts`、viewport、render
- 下游依赖：无业务依赖，主要保存内存状态

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `DrawViewState.ts` | 管理可见页、交叉页、当前页、render count、DPR 和 page mode。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `DrawViewState.ts` | `getVisiblePageNoList()` / `setVisiblePageNoList()` | 读取和写入可见页列表。 | `DrawViewportService.ts`、render |
| `DrawViewState.ts` | `getPageNo()` / `setPageNo()` / `getIntersectionPageNo()` | 管理当前页和 intersection 页。 | 滚动、懒渲染、状态查询 |
| `DrawViewState.ts` | `getRenderCount()` / `incrementRenderCount()` / `replaceRenderCount()` | 记录渲染次数。 | `DrawRenderFacadeService.ts` |
| `DrawViewState.ts` | `getPagePixelRatio()` / `setPagePixelRatio()` / `replacePagePixelRatio()` | 管理页面渲染像素比。 | `GlobalEvent.ts`、render backend |
| `DrawViewState.ts` | `getPageMode()` | 读取当前页面模式。 | `Draw.ts`、layout、render |
