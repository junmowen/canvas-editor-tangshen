# Page Break Render 目录索引

`render/` 存放分页符参与行绘制时的业务编排。

## 位置说明

- 所属业务：`page-break`
- 所属层级：正文行级渲染层
- 上游调度：`draw/render/RowRenderer.ts`
- 下游依赖：`components.pageBreakParticle`

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `PageBreakRowRenderer.ts` | 非打印、非 clean 模式下的分页符标记绘制 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `PageBreakRowRenderer.ts` | `canRender(element)` | 判断当前行内元素是否为分页符元素。 | `draw/render/RowRenderer.ts` 的 `renderRowElement()` |
| `PageBreakRowRenderer.ts` | `render(ctx, element, x, y, mode, isPrintMode, pageBreakParticle)` | 在编辑态且非 clean / 非打印模式下绘制分页符可视标记。 | `draw/render/RowRenderer.ts` 的 `renderRowElement()` |

## 维护规则

- 分页符行内渲染规则留在本目录。
- `draw/render/RowRenderer.ts` 只负责调度分页符渲染入口。
