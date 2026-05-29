# Event Pointer 目录说明

`pointer/` 管理鼠标、拖拽、选区和命中相关状态，是 DOM pointer 事件到编辑器选择 / 拖拽意图的编排层。

## 位置说明

- 所属层级：事件层 / 指针交互
- 上游调用：`CanvasEvent.ts`
- 下游依赖：`handlers/**`、`pointer/intents/**`、draw、range、position
- 子目录：`coordinates/`、`effects/`、`intents/`、`utils/`

## 文件说明

| 文件 / 目录 | 职责 |
| --- | --- |
| `PointerController.ts` | 指针事件控制器，转发 mouse / drag / wheel 到 handlers。 |
| `PointerSession.ts` | 指针会话状态类型和默认状态。 |
| `PointerSessionController.ts` | 清理选区和拖拽会话状态。 |
| `coordinates/` | 指针坐标解析。 |
| `effects/` | 指针交互后的渲染副作用。 |
| `intents/` | 命中、选区、拖拽意图。 |
| `utils/` | pointer positionContext 公共写入。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `PointerController.ts` | `mousemove()` / `mousedown()` / `mouseup()` / `click()` | 转发核心鼠标事件。 | `CanvasEvent.ts` |
| `PointerController.ts` | `drag()` / `dragover()` / `drop()` | 转发拖拽事件。 | `CanvasEvent.ts` |
| `PointerController.ts` | `contextmenu()` / `wheel()` / `dblclick()` / `threeClick()` | 转发右键、滚轮和多击事件。 | `CanvasEvent.ts` |
| `PointerSession.ts` | `createDefaultPointerSession()` | 创建 pointer session 初始状态。 | `CanvasEvent.ts` |
| `PointerSessionController.ts` | `clearSelection()` / `clearDrag()` | 清理选区或拖拽状态。 | handlers、drag-drop intents |
