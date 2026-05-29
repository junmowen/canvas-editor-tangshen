# Control Interaction 目录索引

`interaction/` 存放控件交互后的业务处理。

## 位置说明

- 所属业务：`control`
- 所属层级：事件交互副作用层
- 上游调度：`event/input/`、`event/keyboard/`、`event/pointer/`、`range/RangeManagerEdit.ts`
- 下游依赖：`control/runtime/Control` 及 checkbox / radio 运行实例

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `ControlToggleInteraction.ts` | 表单模式下 checkbox / radio / 值联动控件的点击切换规则 |
| `applyControlDragDropMutation.ts` | 拖拽提交写入控件、剪切拖拽源和内容变更派发 |
| `cutActiveControl.ts` | 当前激活控件内剪切处理 |
| `handleControlDeletion.ts` | Backspace / Delete 捕获控件删除和后继控件整删 |
| `insertIntoActiveControl.ts` | 输入内容写入当前激活控件 |
| `removeHiddenControlAtIndex.ts` | 隐藏元素清理时的控件整删 |
| `syncActiveControlForRange.ts` | range 变化后的控件激活状态同步 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `syncActiveControlForRange.ts` | `syncActiveControlForRange(payload)` | 根据当前 range 是否命中控件初始化或销毁 active control。 | `range/RangeManagerEdit.ts` |
| `removeHiddenControlAtIndex.ts` | `removeHiddenControlAtIndex(payload)` | 隐藏元素清理命中控件时改走整控件删除，并返回新的索引。 | `event/keyboard/shared/removeHiddenElements.ts` |
| `cutActiveControl.ts` | `cutActiveControl(control)` | 当前选区位于控件内时执行控件剪切并派发内容变更。 | `event/handlers/cut.ts` |
| `handleControlDeletion.ts` | `handleControlDeletion(control, evt, guard)` | 统一封装控件键盘删除捕获、keydown 调用和内容变更派发。 | `handleBackspaceControlDeletion()`、`handleDeleteControlDeletion()` |
| `handleControlDeletion.ts` | `handleBackspaceControlDeletion(control, evt)` | Backspace 在 active control 可捕获选区时交给控件处理。 | `event/keyboard/intents/BackspaceIntent.ts` |
| `handleControlDeletion.ts` | `handleDeleteControlDeletion(control, evt)` | Delete 在选区位于控件内时交给控件处理。 | `event/keyboard/intents/DeleteIntent.ts` |
| `handleControlDeletion.ts` | `removeNextControlForDelete(payload)` | Delete 命中后继控件结构时删除整控件。 | `event/keyboard/intents/DeleteIntent.ts` |
| `insertIntoActiveControl.ts` | `insertIntoActiveControl(control, insertElementList, options)` | 将输入内容写入当前 active control，并按需派发变更事件。 | `event/input/FastInputProcessor.ts`、`event/keyboard/intents/EnterIntent.ts` |
| `ControlToggleInteraction.ts` | `canToggleFormControl(payload)` | 判断表单模式下只读 checkbox / radio 是否允许点击切换。 | `event/pointer/intents/selection/SelectionStartIntent.ts` |
| `ControlToggleInteraction.ts` | `renderBeforeFormControlToggle(payload)` | 表单控件切换前刷新当前可见页，避免光标状态与控件状态冲突。 | `event/pointer/intents/selection/SelectionStartIntent.ts` |
| `ControlToggleInteraction.ts` | `applyCheckboxToggle(payload)` | 切换独立 checkbox 或值联动 checkbox 控件选中值。 | `event/pointer/intents/selection/SelectionStartIntent.ts`、`applyValueLinkedControlToggle()` |
| `ControlToggleInteraction.ts` | `applyRadioToggle(payload)` | 切换独立 radio 或值联动 radio 控件选中值。 | `event/pointer/intents/selection/SelectionStartIntent.ts`、`applyValueLinkedControlToggle()` |
| `ControlToggleInteraction.ts` | `applyValueLinkedControlToggle(payload)` | 点击控件 VALUE 文本时回溯同组 checkbox / radio 并触发切换。 | `event/pointer/intents/selection/SelectionStartIntent.ts` |
| `applyControlDragDropMutation.ts` | `insertDragDropIntoActiveControl(payload)` | 拖拽落点位于 active control 值域内时，将拖拽内容写入控件。 | `event/pointer/intents/drag-drop/DragCommitMutationIntent.ts` |
| `applyControlDragDropMutation.ts` | `cutControlDragSourceIfNeeded(payload)` | 拖拽源位于控件值域时恢复源选区并执行控件剪切。 | `event/pointer/intents/drag-drop/DragCommitMutationIntent.ts` |
| `applyControlDragDropMutation.ts` | `emitControlDragDropContentChange(payload)` | 拖拽提交结束后按 active control 或源控件派发内容变更。 | `event/pointer/intents/drag-drop/DragCommitIntent.ts` |

## 维护规则

- 复选框、单选框、值联动控件等点击切换逻辑放在这里。
- 删除、退格、回车输入、剪切、快速输入和拖拽提交等事件触发的控件交互处理放在这里。
- 键盘删除入口只传入按键事件和上下文，控件捕获、整控件删除和内容变更派发集中在这里。
- 通用隐藏元素清理流程遇到控件时，也通过这里删除整控件结构。
- range 变化后的控件激活/销毁状态同步放在这里。
- checkbox/radio 等控件切换前后的模式判断和渲染副作用放在这里。
- pointer intent 只负责传入 draw、元素和索引上下文，不直接维护控件切换细节。
