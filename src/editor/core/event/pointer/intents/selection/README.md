# Pointer Selection Intents 目录说明

`pointer/intents/selection/` 存放鼠标选择相关意图，包括单击定位、拖动选区、双击选词和三击选段。

## 位置说明

- 所属层级：事件层 / 选区意图
- 上游调用：`event/handlers/**`
- 下游依赖：range、position、pointer effects

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `SelectionStartIntent.ts` | 鼠标按下后开始选区或定位光标。 |
| `SelectionDragIntent.ts` | 鼠标拖动时扩展选区。 |
| `SelectionWordRangeIntent.ts` | 双击解析词选区。 |
| `ParagraphSelectionIntent.ts` | 三击解析段落选区。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `SelectionStartIntent.ts` | `runSelectionStartIntent()` | 根据命中结果设置起始 range 和光标。 | `handlers/mousedown.ts` |
| `SelectionDragIntent.ts` | `runSelectionDragIntent()` | 拖动鼠标时更新选区终点。 | `handlers/mousemove.ts` |
| `SelectionWordRangeIntent.ts` | `resolveWordRangeIntent()` | 根据当前 position 选择一个词范围。 | `handlers/dblclick.ts` |
| `ParagraphSelectionIntent.ts` | `resolveParagraphSelectionIntent()` | 根据当前 position 选择段落范围。 | `handlers/threeClick.ts` |
