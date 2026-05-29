# Keyboard Actions 目录说明

`keyboard/actions/` 存放 `keydown` 入口的动作分发模块。每个文件负责识别一种键盘动作，并在命中时完成对应 intent、快捷键或编辑器状态收尾。

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `KeyboardActions.ts` | keydown 动作列表，控制执行顺序。 |
| `DeletionAction.ts` | Backspace / Delete 删除动作。 |
| `EnterAction.ts` | Enter 换行或新段落动作。 |
| `NavigationAction.ts` | 方向键和行边界导航动作。 |
| `UndoAction.ts` / `RedoAction.ts` | 撤销和重做快捷键动作。 |
| `ClipboardActions.ts` | 复制和剪切快捷键动作。 |
| `SelectAllAction.ts` | 全选快捷键动作。 |
| `SaveAction.ts` | 保存快捷键动作。 |
| `EscapeAction.ts` | ESC 清理临时状态并回到正文区域。 |
| `TabAction.ts` | Tab 缩进、列表层级或表格跳转动作。 |
