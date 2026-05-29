# Draw Coordinate 目录说明

`coordinate/` 是 draw 层对 position 计算能力的适配入口，给渲染、事件和业务模块提供统一的坐标、命中和光标 position 访问。

## 位置说明

- 所属层级：公共绘制层 / 坐标适配层
- 上游调用：`Draw.ts`、`event/pointer/**`、`position/**`
- 下游依赖：`Position`、`PointerCoordinateService`

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `DrawCoordinateService.ts` | 包装 `Position` 的 positionList、命中、光标和上下文操作，同时提供指针坐标换算入口。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `DrawCoordinateService.ts` | `getPointerCoordinates()` / `getPointerDelta()` | 将原生鼠标 / 拖拽事件转换为容器、页面和 delta 坐标。 | `draw/viewport/DrawViewportService.ts`、`event/pointer/**` |
| `DrawCoordinateService.ts` | `getPositionList()` / `getOriginalPositionList()` / `getLayoutMainPositionList()` | 读取当前布局 position 缓存。 | `Draw.ts`、渲染和命中链路 |
| `DrawCoordinateService.ts` | `getPositionByXY()` / `getFloatPositionByXY()` | 根据页面坐标解析正文或浮动元素命中位置。 | `event/pointer/intents/**`、`position/PositionHitTestMethods.ts` |
| `DrawCoordinateService.ts` | `setCursorPosition()` / `getCursorPosition()` / `setCursorLogicalIndex()` | 管理光标物理位置和逻辑索引。 | 光标、选区和键盘移动链路 |
| `DrawCoordinateService.ts` | `computePositionList()` / `computePositionListFromPage()` / `computePageRowPosition()` / `computeRowPosition()` | 触发整篇、分页或行级 position 计算。 | `draw/layout/**`、`Draw.render()` |
| `DrawCoordinateService.ts` | `setPositionContext()` / `setSurroundPosition()` | 写入当前命中上下文和前后 position。 | 指针命中、range 和 table 链路 |
