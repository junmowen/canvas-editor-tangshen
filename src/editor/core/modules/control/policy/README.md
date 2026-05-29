# Control Policy 目录索引

`policy/` 存放控件跨事件复用的业务规则。

## 位置说明

- 所属业务：`control`
- 所属层级：跨事件业务策略层
- 上游调度：`event/keyboard/`、`event/input/`、`event/pointer/`、`range/RangeManagerEdit.ts`
- 下游依赖：控件 runtime、控件组件类型和编辑器模式

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `ControlDeletionPolicy.ts` | 控件禁删和表单模式 VALUE 删除许可 |
| `ControlDragPolicy.ts` | 控件拖拽许可、拖拽上下文过滤和控件元素判断 |
| `ControlEnterPolicy.ts` | 回车时控件锚点样式继承和 active control 拦截 |
| `ControlInputPolicy.ts` | range 输入许可和 active control 编辑状态判断 |
| `ControlPreviewerPolicy.ts` | 控件内图片预览拖拽禁用判断 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `ControlDeletionPolicy.ts` | `isRangeControlDeletionDisabled(control, range)` | 判断当前 range 是否禁止删除控件结构。 | `event/keyboard/intents/BackspaceIntent.ts`、`DeleteIntent.ts` |
| `ControlDeletionPolicy.ts` | `canDeleteControlValueInFormMode(payload)` | 表单模式禁删开启时判断 VALUE 组件是否允许删除。 | `draw/data/DrawMutationService.ts` |
| `ControlDragPolicy.ts` | `isAllowedControlDrag(...)` | 判断控件相关拖拽是否允许执行。 | `event/pointer/intents/drag-drop/DragCommitIntent.ts` |
| `ControlDragPolicy.ts` | `shouldOmitControlContextForDragDrop(payload)` | 拖拽提交时判断是否需要忽略控件上下文。 | `event/pointer/intents/drag-drop/DragCommitMutationIntent.ts` |
| `ControlDragPolicy.ts` | `hasControlElement(elementList)` | 判断元素列表中是否包含控件元素。 | 拖拽和剪贴板相关控件策略 |
| `ControlEnterPolicy.ts` | `shouldCopyStyleForEnterAnchor(element)` | 判断回车锚点是否应复制控件外样式。 | `event/keyboard/intents/EnterIntent.ts` |
| `ControlEnterPolicy.ts` | `shouldPreventEnterInActiveControl(control)` | active control 内是否阻止普通回车插入。 | `event/keyboard/intents/EnterIntent.ts` |
| `ControlInputPolicy.ts` | `isControlRangeInputAllowed(payload)` | 判断当前 range 是否允许文本输入。 | `range/RangeManagerEdit.ts` |
| `ControlInputPolicy.ts` | `hasActiveControlEditing(control)` | 判断 active control 是否正在编辑。 | `event/input/FastInputProcessor.ts` |
| `ControlPreviewerPolicy.ts` | `isControlPreviewerDragDisabled(payload)` | 图片位于控件内时判断预览拖拽是否禁用。 | `image/interaction/handleImageSelectionStart.ts` |

## 维护规则

- 拖拽、删除、输入等事件共享的控件规则放在这里。
- 回车、Tab、方向键等键盘入口涉及的控件组件判断和控件类型限制放在这里或 `navigation/`。
- Delete/Backspace 入口涉及的控件禁删规则放在这里，避免 keyboard intent 直接访问控件内部规则。
- 表单模式控件禁删开启时，控件 VALUE 组件是否允许删除的判断放在这里。
- range 输入许可中的控件组件边界规则放在这里。
- event intent 只调用 policy，不直接维护控件规则判断。
