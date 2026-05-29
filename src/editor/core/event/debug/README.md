# Event Debug 目录说明

`debug/` 存放指针和拖拽事件调试函数，用于在事件处理前后输出状态，辅助定位交互问题。

## 位置说明

- 所属层级：事件层 / 调试辅助
- 上游调用：`event/handlers/**`
- 下游依赖：`CanvasEvent` 和 pointer session

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `logPointerEvent.ts` | 统一输出 pointer / drag / wheel 调试信息。 |
| `click.ts`、`mousedown.ts`、`mousemove.ts`、`mouseup.ts`、`dblclick.ts` | 鼠标事件调试包装。 |
| `drag.ts`、`dragover.ts`、`drop.ts` | 拖拽事件调试包装。 |
| `mouseenter.ts`、`mouseleave.ts`、`mouseover.ts`、`mouseout.ts`、`contextmenu.ts`、`wheel.ts` | 其它指针事件调试包装。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `logPointerEvent.ts` | `logPointerEvent()` | 按统一格式输出事件、坐标和 pointer session 状态。 | 本目录各 `debug*` 函数 |
| `click.ts` | `debugClick()` | 输出 click 调试信息。 | `handlers/click.ts` |
| `mousedown.ts` | `debugMousedown()` | 输出 mousedown 前后状态。 | `handlers/mousedown.ts` |
| `mousemove.ts` | `debugMousemove()` | 输出 mousemove 前后状态。 | `handlers/mousemove.ts` |
| `mouseup.ts` | `debugMouseup()` | 输出 mouseup 前后状态。 | `handlers/mouseup.ts` |
| `drag.ts` / `dragover.ts` / `drop.ts` | `debugDrag()` / `debugDragover()` / `debugDrop()` | 输出拖拽链路调试信息。 | `handlers/drag*.ts`、`handlers/drop.ts` |
| 其它 `debug*.ts` | 对应 `debugXxx()` | 输出对应 DOM 事件调试信息。 | 对应 `handlers/*.ts` |
