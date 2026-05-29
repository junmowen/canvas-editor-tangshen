# Control Render 目录索引

`render/` 存放控件参与行绘制和覆盖层绘制时的业务编排。

## 位置说明

- 上游调用：`draw/render/RowRenderer.ts`、`draw/render/PageContentPainter.ts`
- 下游依赖：checkbox/radio 粒子、控件边框状态、控件高亮列表
- 迁移目的：公共行渲染和页渲染只调度控件渲染入口，不直接判断控件类型和边框连续性。

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `CheckableControlRenderer.ts` | checkbox / radio 行内控件绘制分发 |
| `PageControlHighlightRenderer.ts` | 非打印模式下的页面控件高亮绘制 |
| `RowControlBorderRenderer.ts` | 行内控件连续边框的 record 和最终 flush 规则 |

## 函数说明

| 文件 | 函数/方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `CheckableControlRenderer.ts` | `isCheckable(element)` | 判断元素是否是 checkbox/radio 控件绘制目标 | `RowRenderer`、`PageRenderSnapshotRowElementCommands` 通过模块 predicate |
| `CheckableControlRenderer.ts` | `render(payload)` | 分发 checkbox/radio 行内绘制 | `RowRenderer` |
| `PageControlHighlightRenderer.ts` | `render(ctx, pageNo, isPrintMode)` | 非打印模式下绘制页面控件高亮 | `PageContentPainter.drawPageContent()` |
| `RowControlBorderRenderer.ts` | `render(payload)` | 记录行内控件连续边框范围 | `RowRenderer` |
| `RowControlBorderRenderer.ts` | `flush(ctx, control)` | flush 已记录的控件边框 | `RowRenderer` |

## 维护规则

- 控件边框、高亮、checkbox / radio 等业务渲染规则放在本目录或 `runtime/` 中。
- `draw/render/RowRenderer.ts` 只负责调度控件渲染入口，不内联控件类型判断和边框细节。
