# Row Drag 目录索引

`row-drag/` 存放整行拖拽手柄、命中和拖放目标解析。

## 位置说明

- 所属业务：`row-drag`
- 所属层级：行拖拽渲染和命中策略层
- 上游调度：`draw/render/RowRenderer.ts`、`event/pointer/intents/drag-drop/DragHoverIntent.ts`
- 下游依赖：行位置、段落范围、标题判断和拖拽光标位置

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `RowDragHandle.ts` | 行拖拽手柄可见性、边界、命中、段落范围和绘制 |
| `RowDragDrop.ts` | 行拖拽 drop target 和光标位置解析 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `RowDragHandle.ts` | `getIsTitleRow(payload)` / `getIsTitleElement(element)` | 判断行或元素是否属于标题上下文。 | 行拖拽范围和可见性判断 |
| `RowDragHandle.ts` | `getRowDragHandleBounds(payload)` | 计算当前行拖拽手柄矩形。 | `resolveRowDragHandleAtPoint()`、`renderRowDragHandle()` |
| `RowDragHandle.ts` | `resolveRowDragParagraphRange(payload)` | 解析行拖拽对应的段落范围。 | 指针拖拽起始链路 |
| `RowDragHandle.ts` | `isRowDragHandleVisible(payload)` | 判断当前行是否应该显示拖拽手柄。 | `renderRowDragHandle()` |
| `RowDragHandle.ts` | `resolveRowDragHandleAtPoint(payload)` | 根据指针坐标解析命中的行拖拽手柄。 | 指针命中链路 |
| `RowDragHandle.ts` | `renderRowDragHandle(payload)` | 在行渲染中绘制拖拽手柄。 | `draw/render/RowRenderer.ts` |
| `RowDragDrop.ts` | `resolveRowDragDropTarget(payload)` | 解析拖拽悬停时的行级 drop target 和光标位置。 | `event/pointer/intents/drag-drop/DragHoverIntent.ts` |

## 维护规则

- 行拖拽手柄绘制、可见性、命中和 drop target 解析放在这里。
- event 只负责把指针事件坐标传入，不直接维护行拖拽业务规则。
- render 层可以调用手柄绘制函数，但不反向依赖 event/pointer 目录。
