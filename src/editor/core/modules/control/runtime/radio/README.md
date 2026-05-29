# Radio Control 目录说明

`control/runtime/radio/` 存放单选控件运行实现。

## 位置说明

- 所属业务：`control`
- 所属层级：控件运行时 / radio
- 上游调用：`Control.ts`
- 下游依赖：`CheckboxControl`

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `RadioControl.ts` | 基于 checkbox 控件扩展单选互斥逻辑。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `RadioControl.ts` | `setSelect()` | 设置当前 radio 选中态并处理同组互斥。 | 控件点击和命令链路 |
