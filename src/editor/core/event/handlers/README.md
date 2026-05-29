# Event Handlers 目录说明

`handlers/` 是原生 DOM 事件到编辑器行为的适配层，负责调用 pointer、keyboard、clipboard 和业务 intent。

## 位置说明

- 所属层级：事件层 / DOM 事件处理
- 上游调用：`CanvasEvent.ts`
- 下游依赖：`CanvasEvent`、`pointer/**`、`clipboard/**`、range 和 draw

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `click.ts`、`mousedown.ts`、`mousemove.ts`、`mouseup.ts` | 鼠标主链路处理。 |
| `dblclick.ts`、`threeClick.ts` | 双击、三击选择处理。 |
| `drag.ts`、`dragover.ts`、`drop.ts` | 拖拽移动和放置处理。 |
| `copy.ts`、`cut.ts` | 复制和剪切处理。 |
| `contextmenu.ts`、`wheel.ts` | 右键菜单和滚轮处理。 |
| `mouseenter.ts`、`mouseleave.ts`、`mouseover.ts`、`mouseout.ts` | 鼠标进入 / 离开类事件处理。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `mousedown.ts` | `mousedown(evt, host)` | 开始 pointer 会话并进入选区 / 拖拽判断。 | `PointerController.mousedown()` |
| `mousemove.ts` | `mousemove(evt, host)` | 更新 pointer hover、选区拖动或拖拽位置。 | `PointerController.mousemove()` |
| `mouseup.ts` | `mouseup(evt, host)` | 结束选区或拖拽提交。 | `PointerController.mouseup()` |
| `click.ts` | `click(evt, host)` | 处理单击命中、光标和控件交互。 | `PointerController.click()` |
| `dblclick.ts` / `threeClick.ts` | `dblclick()` / `threeClick()` | 执行词选区或段落选区。 | `PointerController`、`CanvasEvent.register()` |
| `drag.ts` / `dragover.ts` / `drop.ts` | `drag()` / `dragover()` / `drop()` | 处理拖拽快照、hover 和提交。 | `PointerController` |
| `copy.ts` / `cut.ts` | `copy()` / `cut()` | 将选区写入剪贴板或执行剪切 mutation。 | `EditorInputController`、`CanvasEvent` |
| `contextmenu.ts` / `wheel.ts` | `contextmenu()` / `wheel()` | 打开上下文菜单或处理滚轮缩放 / 滚动。 | `PointerController`、`GlobalEvent` |
