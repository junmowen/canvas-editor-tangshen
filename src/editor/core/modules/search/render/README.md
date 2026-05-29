# Search Render 目录索引

`render/` 存放搜索命中参与页面绘制时的业务编排。

## 位置说明

- 上游调用：`src/editor/core/draw/render/PageContentPainter.ts`、`PageRenderer.ts`
- 下游依赖：`Search` 运行对象的关键字、待重绘页列表和高亮绘制
- 迁移目的：页级渲染和可见页调度只调用搜索渲染入口，不直接访问搜索运行对象。

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `PageSearchRenderer.ts` | 非打印模式下的搜索高亮绘制、搜索激活状态和待重绘页消费 |

## 函数说明

| 文件 | 函数/方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `PageSearchRenderer.ts` | `hasActiveKeyword()` | 判断当前是否存在搜索关键字 | `PageRenderer.isInteractivePage()`、`PageSearchRenderer.render()` |
| `PageSearchRenderer.ts` | `consumeRenderPageNoList()` | 消费搜索模块标记的待重绘页 | `PageRenderer.renderVisiblePages()` |
| `PageSearchRenderer.ts` | `render(ctx, pageNo, isPrintMode)` | 非打印模式下绘制指定页搜索高亮 | `PageContentPainter.drawPageContent()` |

## 维护规则

- 搜索页级渲染规则留在本目录。
- `draw/render/PageContentPainter.ts` 和 `PageRenderer.ts` 只负责调度搜索渲染入口，不直接读取搜索运行对象。
