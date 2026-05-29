# Area Render 目录索引

`render/` 存放区域元素参与页面绘制时的业务编排。

## 位置说明

- 上游调用：`src/editor/core/draw/render/PageContentPainter.ts`
- 下游依赖：`draw.getArea().render(ctx, pageNo)`
- 迁移目的：页内容绘制器只调度区域辅助层入口，不直接访问区域运行对象。

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `PageAreaRenderer.ts` | 非打印模式下的区域辅助层绘制 |

## 函数说明

| 文件 | 函数/方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `PageAreaRenderer.ts` | `render(ctx, pageNo, isPrintMode)` | 非打印模式下绘制指定页区域辅助层 | `PageContentPainter.drawPageContent()` |

## 维护规则

- 区域页级渲染规则留在本目录。
- `draw/render/PageContentPainter.ts` 只负责调度区域渲染入口。
