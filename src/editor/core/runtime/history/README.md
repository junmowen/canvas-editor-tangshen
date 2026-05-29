# Runtime History 目录索引

`history/` 存放历史栈运行对象。

## 位置说明

- 所属层级：历史记录运行层

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `HistoryManager.ts` | undo / redo 和历史开关 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `HistoryManager.ts` | `undo()` / `redo()` | 撤销或重做文档状态。 | command、快捷键 |
| `HistoryManager.ts` | `execute(fn)` | 在历史管理上下文中执行变更。 | mutation、command |
| `HistoryManager.ts` | `isCanUndo()` / `isCanRedo()` / `isStackEmpty()` | 查询历史栈状态。 | command query、菜单状态 |
| `HistoryManager.ts` | `recovery()` / `popUndo()` | 恢复或弹出历史记录。 | undo / redo 内部 |
| `HistoryManager.ts` | `disable()` / `enable()` / `isDisabledHistory()` | 控制历史记录开关。 | 批量 setValue、导入链路 |
