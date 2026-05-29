# Event 目录索引

`event/` 存放输入、键盘、指针、剪贴板和外部事件控制器。

## 位置说明

- 所属层级：事件分发和意图编排层
- 主要下钻：`clipboard/`、`debug/`、`eventbus/`、`handlers/`、`input/`、`keyboard/`、`pointer/`

## 文件说明

| 目录 / 文件 | 职责 |
| --- | --- |
| `EditorInputController.ts` | 键盘、输入、剪切、复制和输入法事件控制器 |
| `KeyboardController.ts` | 键盘事件控制器 |
| `EditorClipboardController.ts` | 剪贴板事件控制器 |
| `CanvasEvent.ts` / `GlobalEvent.ts` | 画布和全局事件分发 |
| `eventbus/` | 内部事件总线 |
| `handlers/` | copy / cut / dblclick / drop / mousedown 等 DOM 事件入口 |
| `input/` | 输入流和增量渲染调度 |
| `keyboard/` | 键盘 action、intent 和 shared helper |
| `pointer/` | 指针 action、会话、命中、拖拽和坐标 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `EditorInputController.ts` | `keydown()` / `input()` / `cut()` / `copy()` / `compositionstart()` / `compositionend()` | 统一接收输入法和键盘事件。 | 外层 DOM 事件绑定 |
| `KeyboardController.ts` | `keydown(evt)` | 按动作列表分发键盘事件。 | 原生键盘事件入口 |
| `EditorClipboardController.ts` | `copy()` / `paste()` / `cut()` | 分发剪贴板事件。 | 原生剪贴板事件入口 |
| `eventbus/EventBus.ts` | `on()` / `emit()` / `off()` / `isSubscribe()` | 内部事件订阅和发布。 | 事件系统内部 |
| `keyboard/actions/` | `run*Action(evt, host)` | 将 keydown 拆成删除、导航、撤销、保存等动作。 | `KeyboardController.ts` |
| `pointer/actions/` | `*Action(payload)` | 将鼠标交互拆成右键保留选区、选区拖拽、行拖拽和普通选区起点等动作。 | `handlers/mousedown.ts` |
| `handlers/copy.ts` / `cut.ts` / `dblclick.ts` / `drop.ts` / `mousedown.ts` | 对应 DOM 事件处理函数 | 将原生事件转换成编辑器动作或意图。 | `GlobalEvent.ts`、`CanvasEvent.ts` |
| `input/FastInputProcessor.ts` | 快速输入处理入口 | 处理中英文输入和控件输入写回。 | 输入链路 |
| `pointer/PointerController.ts` / `PointerSessionController.ts` | 指针会话和命中编排 | 统一指针按下 / 移动 / 抬起状态。 | pointer event 入口 |
