# Background Render 目录索引

`render/` 存放页面背景参与页绘制时的业务编排。

## 位置说明

- 上游调用：`src/editor/core/draw/render/PageContentPainter.ts`
- 下游依赖：`draw.getBackground().render(ctx, pageNo)`
- 迁移目的：页内容绘制器只调度背景入口，不直接调用背景运行对象。

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `PageBackgroundRenderer.ts` | 页面背景绘制分发 |

## 函数说明

| 文件 | 函数/方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `PageBackgroundRenderer.ts` | `render(ctx, pageNo)` | 绘制指定页背景色或背景图 | `PageContentPainter.drawPageContent()` |

## 维护规则

- 背景页级渲染规则留在本目录。
- `draw/render/PageContentPainter.ts` 只负责调度背景渲染入口。
