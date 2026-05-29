# Inline Render 目录索引

`render/` 存放超链接、日期等内联业务元素参与行绘制时的编排。

## 位置说明

- 所属业务：`inline`
- 所属层级：正文行级渲染层
- 上游调度：`draw/render/RowRenderer.ts`
- 下游依赖：`TextParticle`、`HyperlinkParticle`

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `InlineRowElementRenderer.ts` | 超链接绘制和日期元素连续合批 record / flush 规则 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `InlineRowElementRenderer.ts` | `canRender(element)` | 判断当前行内元素是否属于内联业务渲染范围，目前覆盖超链接和日期元素。 | `draw/render/RowRenderer.ts` 的 `renderRowElement()` |
| `InlineRowElementRenderer.ts` | `render(payload)` | 分发超链接独立绘制，或按 `dateId` 合批记录日期文本并在日期段边界 flush 文本粒子。 | `draw/render/RowRenderer.ts` 的 `renderRowElement()` |

## 维护规则

- 内联业务元素的行级绘制规则留在本目录。
- `draw/render/RowRenderer.ts` 只负责调度内联业务渲染入口，不内联超链接或日期细节。
