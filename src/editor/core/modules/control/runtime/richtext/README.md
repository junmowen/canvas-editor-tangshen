# Richtext Control 目录说明

`control/runtime/richtext/` 存放富文本控件的边框运行态。

## 位置说明

- 所属业务：`control`
- 所属层级：控件运行时 / richtext
- 上游调用：控件渲染链路
- 下游依赖：Canvas 2D context

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `Border.ts` | 富文本控件边框记录、清理和绘制。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `Border.ts` | `recordBorderInfo()` | 记录控件边框矩形。 | 控件行渲染 |
| `Border.ts` | `render(ctx)` | 绘制记录的控件边框。 | 控件 overlay 渲染 |
| `Border.ts` | `clearBorderInfo()` | 清理边框缓存。 | 渲染开始或销毁 |
