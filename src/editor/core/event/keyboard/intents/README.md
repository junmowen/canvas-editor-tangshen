# Keyboard Intents 目录说明

`keyboard/intents/` 存放 keydown 对应的编辑意图实现，每个文件负责一种或一组键盘行为。

## 位置说明

- 所属层级：事件层 / 键盘意图实现
- 上游调用：`KeyboardController.ts`
- 下游依赖：`keyboard/shared/**`、range、draw、position

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `BackspaceIntent.ts` | Backspace 删除。 |
| `DeleteIntent.ts` | Delete 删除。 |
| `EnterIntent.ts` | 回车换行 / 新段落。 |
| `TabIntent.ts` | Tab 缩进或表格内跳转。 |
| `KeyboardDeletionIntent.ts` | 删除类键的公共实现。 |
| `KeyboardNavigationIntent.ts` | 左右移动和组合导航入口。 |
| `LineBoundaryNavigationIntent.ts` | 行首 / 行尾移动。 |
| `VerticalNavigationIntent.ts` | 上下移动。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `BackspaceIntent.ts` | `runBackspaceIntent(evt, host)` | 处理 Backspace 并委托公共删除逻辑。 | `KeyboardController.keydown()` |
| `DeleteIntent.ts` | `runDeleteIntent(evt, host)` | 处理 Delete 并委托公共删除逻辑。 | `KeyboardController.keydown()` |
| `KeyboardDeletionIntent.ts` | `runKeyboardDeletionIntent()` | 根据方向、选区和上下文执行删除。 | `BackspaceIntent.ts`、`DeleteIntent.ts` |
| `EnterIntent.ts` | `runEnterIntent(evt, host)` | 插入换行、新段落或处理表格上下文。 | `KeyboardController.keydown()` |
| `TabIntent.ts` | `runTabIntent(evt, host)` | 执行 Tab 缩进、列表层级或表格单元格跳转。 | `KeyboardController.keydown()` |
| `KeyboardNavigationIntent.ts` | `runKeyboardNavigationIntent()` | 处理左右方向键和选区移动。 | `KeyboardController.keydown()` |
| `LineBoundaryNavigationIntent.ts` | `runLineBoundaryNavigationIntent()` | 处理 Home / End 类边界移动。 | `KeyboardController.keydown()` |
| `VerticalNavigationIntent.ts` | `runVerticalNavigationIntent(evt, host)` | 处理上下方向键，按 x 坐标保持视觉列。 | `KeyboardController.keydown()` |
