# List Interaction 目录说明

`list/interaction/` 存放列表键盘、拖拽和选区业务规则。

## 位置说明

- 所属业务：`list`
- 所属层级：业务交互层
- 上游调用：keyboard intents、drag-drop、range
- 下游依赖：列表上下文和段落元素

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `ListKeyboardInteraction.ts` | Tab、Enter、Shift+Enter、Backspace 等列表键盘规则。 |
| `ListDragDropContext.ts` | 拖拽复制列表上下文字段。 |
| `ListSelectionPolicy.ts` | 列表选区上下文判断。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `ListKeyboardInteraction.ts` | `tryIndentListOnTab()` | Tab 时尝试调整列表层级。 | `TabIntent.ts` |
| `ListKeyboardInteraction.ts` | `tryUnsetEmptyListOnEnter()` | 空列表回车时退出列表。 | `EnterIntent.ts` |
| `ListKeyboardInteraction.ts` | `applyListWrapForShiftEnter()` | Shift+Enter 时保留列表换行上下文。 | `EnterIntent.ts` |
| `ListKeyboardInteraction.ts` | `tryUnsetListOnBackspaceAtStart()` | 列表起点 Backspace 时退出列表。 | 删除 intent |
| `ListDragDropContext.ts` | `appendListDragDropCopyAttrs()` | 拖拽复制时补齐列表上下文字段。 | drag commit mutation |
| `ListSelectionPolicy.ts` | `hasListSelectionContext()` | 判断选区是否包含列表上下文。 | range / drag 链路 |
