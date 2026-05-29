# Pointer Effects 目录说明

`pointer/effects/` 存放指针交互后的渲染副作用，包括选区刷新和拖拽光标绘制。

## 位置说明

- 所属层级：事件层 / 指针渲染副作用
- 上游调用：`pointer/intents/**`
- 下游依赖：draw、range、cursor

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `DragEffect.ts` | 绘制拖拽目标光标。 |
| `PointerRenderEffect.ts` | 选区开始、拖动、拖拽提交后的渲染收尾。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `DragEffect.ts` | `drawDragCursor()` | 在拖拽目标位置绘制插入光标。 | drag-hover intent |
| `PointerRenderEffect.ts` | `renderSelectionStart()` | 选区开始后刷新光标和页面。 | `SelectionStartIntent.ts` |
| `PointerRenderEffect.ts` | `renderSelectionDrag()` / `renderSelectionRange()` | 拖动选区或范围变化后刷新渲染。 | `SelectionDragIntent.ts`、词 / 段落选择 |
| `PointerRenderEffect.ts` | `renderDragCommitRollback()` / `renderDragCommitBlocked()` / `renderDragCommitFailed()` / `renderDragCommitApplied()` | 拖拽提交不同结果下的渲染收尾。 | drag-drop intents |
