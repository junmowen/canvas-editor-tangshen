# Text Control 目录说明

`control/runtime/text/` 存放文本控件运行实现。

## 位置说明

- 所属业务：`control`
- 所属层级：控件运行时 / text
- 上游调用：`Control.ts`、输入链路
- 下游依赖：控件元素 valueList

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `TextControl.ts` | 文本控件取值、设值、清空、键盘和剪切。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `TextControl.ts` | `setElement()` / `getElement()` | 绑定并读取控件元素。 | `Control.ts` |
| `TextControl.ts` | `getValue()` / `setValue()` / `clearValue()` | 读取、写入和清空控件文本值。 | 控件命令、输入链路 |
| `TextControl.ts` | `keydown()` / `cut()` | 处理文本控件键盘和剪切。 | 控件输入链路 |
