# Paragraph Render 目录索引

`render/` 存放段落级格式标记和行内辅助绘制。

## 位置说明

- 所属业务：`paragraph`
- 所属层级：正文行级渲染层
- 上游调度：`draw/render/RowRenderer.ts`
- 下游依赖：`TextParticle`、`components.lineBreakParticle`、Canvas 2D 标记绘制

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `LineBreakMarkerRenderer.ts` | 行尾换行符可视标记绘制 |
| `ParagraphTextRunRenderer.ts` | tab、对齐控制符、普通文本、修订色和空格可视标记绘制 |
| `WhitespaceMarkerRenderer.ts` | 空格和不换行空格的可视格式标记绘制 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `LineBreakMarkerRenderer.ts` | `render(payload)` | 在启用格式标记、非打印、非 clean、行宽足够且位于行尾时，绘制换行符可视标记。 | `draw/render/RowRenderer.ts` 的 `renderRowElement()` |
| `ParagraphTextRunRenderer.ts` | `render(payload)` | 处理普通段落文本绘制；对 tab、两端对齐控制符、修订文本、空格标记和需强制 flush 的文本分别编排。 | `draw/render/RowRenderer.ts` 的 `renderRowElement()` |
| `WhitespaceMarkerRenderer.ts` | `render(ctx, element, rowPosition, options)` | 根据行内位置和格式标记配置，在空格或不换行空格中心绘制可视圆点。 | `ParagraphTextRunRenderer.ts` 的 `render()` |

## 维护规则

- 段落级文本 run、格式标记和行尾标记渲染留在本目录。
- `draw/render/RowRenderer.ts` 只负责判断何时需要绘制格式标记，不内联 Canvas 绘制细节。
