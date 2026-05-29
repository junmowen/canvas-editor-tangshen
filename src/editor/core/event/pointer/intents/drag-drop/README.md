# Pointer Drag Drop Intents 目录说明

`pointer/intents/drag-drop/` 存放拖拽移动文档元素的完整意图链路。

## 位置说明

- 所属层级：事件层 / 拖拽意图
- 上游调用：`event/handlers/drag*.ts`、`event/handlers/drop.ts`
- 下游依赖：draw mutation、range、pointer effects

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `CaptureDragSnapshotIntent.ts` | 捕获拖拽开始时的元素和选区快照。 |
| `ResolveDragPointerIntent.ts` | 解析拖拽过程中的目标位置。 |
| `DragHoverIntent.ts` | 拖拽悬停和插入光标更新。 |
| `DragCommitIntent.ts` | 拖拽提交主流程。 |
| `DragCommitMutationIntent.ts` | 执行拖拽造成的元素移动 mutation。 |
| `ApplyDragCursorIntent.ts` | 应用拖拽光标。 |
| `DragCommitHelpers.ts` | drag id 和元素索引查找工具。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `CaptureDragSnapshotIntent.ts` | `captureDragSnapshot()` | 保存拖拽源元素、range 和上下文。 | `handlers/drag.ts` |
| `ResolveDragPointerIntent.ts` | `resolveDragPointerIntent()` | 解析拖拽目标 position 和可提交状态。 | `DragHoverIntent.ts`、`DragCommitIntent.ts` |
| `DragHoverIntent.ts` | `runDragHoverIntent()` | 更新拖拽悬停状态和插入光标。 | `handlers/dragover.ts` |
| `DragCommitIntent.ts` | `runDragCommitIntent()` | 处理拖拽提交、失败、回滚和渲染收尾。 | `handlers/drop.ts` |
| `DragCommitMutationIntent.ts` | `applyDragCommitMutation()` | 对元素列表执行拖拽移动。 | `DragCommitIntent.ts` |
| `ApplyDragCursorIntent.ts` | `applyDragCursorIntent()` | 根据拖拽目标绘制或清理拖拽光标。 | `DragHoverIntent.ts` |
| `DragCommitHelpers.ts` | `createDragId()` / `getElementIndexByDragId()` | 生成拖拽元素标识并反查索引。 | 拖拽快照和提交 |
