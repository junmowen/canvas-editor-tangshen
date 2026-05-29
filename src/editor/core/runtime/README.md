# Runtime 目录索引

`runtime/` 存放编辑器通用运行时对象。

## 位置说明

- 所属层级：通用运行时层
- 下钻目录：`actuator/`、`contextmenu/`、`cursor/`、`history/`、`listener/`、`observer/`、`worker/`、`zone/`

## 文件说明

| 文件 / 目录 | 职责 |
| --- | --- |
| `HistoryManager.ts` | undo / redo 栈和历史开关 |
| `Listener.ts` | 外部回调容器 |
| `Cursor.ts` / `CursorAgent.ts` | 光标 DOM 和光标代理 |
| `Zone.ts` / `ZoneTip.ts` | 编辑区 / 页眉 / 页脚区判断和提示 |
| `WorkerManager.ts` | word count / catalog / group / value worker 接口 |
| `ContextMenu.ts` | 通用右键菜单运行时装配 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `HistoryManager.ts` | `undo()` / `redo()` / `execute()` / `recovery()` / `disable()` / `enable()` | 管理历史栈。 | `Draw` 和 command 链路 |
| `Cursor.ts` | `focus()` / `drawCursor()` / `recoveryCursor()` / `moveCursorToVisible()` | 管理光标 DOM 和可见性。 | `DrawCursorService` |
| `Zone.ts` | `getZone()` / `replaceZone()` / `getZoneByY()` / `drawZoneIndicator()` | 管理当前编辑区和区提示。 | `Draw` 和页面渲染链路 |
| `WorkerManager.ts` | `getWordCount()` / `getCatalog()` / `getGroupIds()` / `getValue()` | 提供 worker 能力。 | command / data 链路 |
| `ContextMenu.ts` | `getContextMenuList()` / `registerContextMenuList()` / `dispose()` | 装配通用右键菜单。 | `runtime/contextmenu/ContextMenu.ts` |
| `Listener.ts` | 回调属性 | 存放 content / page / control 等外部监听。 | `Draw` |

