# Range Selection 目录索引

`selection/` 存放选区范围解析 helper。

## 位置说明

- 所属层级：公共 range 层 / 选区解析与绘制
- 上游调用：`event/pointer/intents/selection/**`、`draw/render/RowRenderer.ts`
- 下游依赖：positionList、rowList、table selection

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `RowSelectionRenderer.ts` | 普通字符选区矩形和表格单元格递归选区绘制 |
| `resolvePointerMouseDownIndex.ts` | 鼠标按下位置到文档索引的折叠解析 |
| `resolveSelectionDragRange.ts` | 拖选范围解析 |
| `resolveSelectionStartState.ts` | 普通选区起点状态解析 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `RowSelectionRenderer.ts` | `render(ctx, payload)` | 绘制当前行选区和表格单元格递归选区。 | `draw/render/RowRenderer.ts` |
| `resolvePointerMouseDownIndex.ts` | `resolvePointerMouseDownIndex()` | 将鼠标按下位置解析为折叠索引。 | `SelectionStartIntent.ts` |
| `resolveSelectionDragRange.ts` | `resolveSelectionDragRange()` | 根据拖动起点和终点解析 range。 | `SelectionDragIntent.ts` |
| `resolveSelectionStartState.ts` | `resolveSelectionStartState()` | 解析选区起始状态、position 和 mouseDownIndex。 | `SelectionStartIntent.ts` |

## 维护规则

- 拖选范围和普通文本命中范围解析放在这里，表格单元格拖选细节归属 `table/selection/`。
- 选区起点解析放在这里，mousedown 只消费解析后的 position 和 mouseDownIndex。
- 鼠标按下索引折叠规则放在这里，普通文本和表格起点解析共享同一实现。
- 行级选区矩形绘制放在这里，`draw/render/RowRenderer.ts` 只负责触发选区层渲染。
- 事件层只传入 pointer 命中结果并消费解析结果，不直接维护 range 计算细节。
- 表格专属起点、拖选单元格 range、投影和交互状态仍放在 `table/selection/` 或 `table/interaction/`。
