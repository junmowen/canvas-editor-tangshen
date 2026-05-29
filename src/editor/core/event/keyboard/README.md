# Event Keyboard 目录说明

`keyboard/` 存放键盘动作、意图和公共 helper，负责将 keydown 转换为删除、换行、缩进、光标移动等编辑器行为。

## 位置说明

- 所属层级：事件层 / 键盘动作和意图
- 上游调用：`KeyboardController.ts`
- 下游依赖：`CanvasEvent`、range、draw、position
- 子目录：`actions/`、`intents/`、`shared/`

## 文件说明

| 目录 | 职责 |
| --- | --- |
| `actions/` | 按键盘动作拆分 keydown 分支，例如撤销、重做、保存、全选、ESC、Tab。 |
| `intents/` | Backspace、Delete、Enter、Tab、横向 / 纵向移动等键盘意图。 |
| `shared/` | 删除、移动、插入、隐藏元素处理等键盘公共收尾逻辑。 |

## 函数说明

| 文件 / 目录 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `actions/` | `run*Action(evt, host)` | 识别并执行一个键盘动作，命中后返回 `true` 终止后续动作。 | `KeyboardController.keydown()` |
| `intents/` | `runBackspaceIntent()` / `runDeleteIntent()` / `runEnterIntent()` / `runTabIntent()` | 处理删除、换行和 Tab。 | `KeyboardController.keydown()` |
| `intents/` | `runKeyboardNavigationIntent()` / `runVerticalNavigationIntent()` / `runLineBoundaryNavigationIntent()` | 处理方向键、上下移动和行首行尾。 | `KeyboardController.keydown()` |
| `shared/` | `finalizeDeletion()` / `finalizeCollapsedCursorMove()` / `finalizeVerticalMove()` | 完成删除或移动后的光标、range、render 收尾。 | keyboard intents |
| `shared/` | `insertWithContext()` / `formatInsertContext()` | 按上下文插入元素并继承格式。 | Enter、Tab、文本输入 |
| `shared/` | `removeHiddenElements()` / `runHorizontalMove()` | 移除隐藏元素并处理左右移动。 | 删除和导航 intent |
