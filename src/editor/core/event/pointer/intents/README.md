# Pointer Intents 目录说明

`pointer/intents/` 存放指针命中、选区和拖拽意图，负责把 pointer session 和坐标转换为具体编辑器操作。

## 位置说明

- 所属层级：事件层 / 指针意图
- 上游调用：`event/handlers/**`
- 下游依赖：draw、range、position、pointer effects
- 子目录：`drag-drop/`、`selection/`

## 文件说明

| 文件 / 目录 | 职责 |
| --- | --- |
| `ResolvePointerHitIntent.ts` | 根据坐标解析正文、表格、控件、浮动元素命中。 |
| `drag-drop/` | 拖拽快照、hover、提交和 mutation。 |
| `selection/` | 选区开始、拖动、词选区、段落选区。 |

## 函数说明

| 文件 / 目录 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `ResolvePointerHitIntent.ts` | `resolvePointerHitIntent()` | 根据当前指针坐标生成命中结果和 positionContext。 | `handlers/mousedown.ts`、`handlers/mousemove.ts` |
| `drag-drop/` | `captureDragSnapshot()` / `runDragHoverIntent()` / `runDragCommitIntent()` | 处理拖拽开始、悬停和提交。 | drag handlers |
| `selection/` | `runSelectionStartIntent()` / `runSelectionDragIntent()` | 处理选区开始和拖动。 | mouse handlers |
| `selection/` | `resolveWordRangeIntent()` / `resolveParagraphSelectionIntent()` | 处理双击词选区和三击段落选区。 | `handlers/dblclick.ts`、`handlers/threeClick.ts` |
