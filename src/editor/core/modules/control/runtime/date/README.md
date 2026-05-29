# Date Control 目录说明

`control/runtime/date/` 存放日期控件运行实现。

## 位置说明

- 所属业务：`control`
- 所属层级：控件运行时 / date
- 上游调用：`Control.ts`、控件交互和命令链路
- 下游依赖：日期弹层、控件值范围

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `DateControl.ts` | 日期控件取值、设值、弹层、选择、键盘和销毁。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `DateControl.ts` | `setElement()` / `getElement()` / `getIsPopup()` | 绑定控件元素并读取弹层状态。 | `Control.ts` |
| `DateControl.ts` | `getValueRange()` / `getValue()` / `setValue()` | 读取日期值范围、值和写入新值。 | 控件命令、取值链路 |
| `DateControl.ts` | `clearSelect()` / `setSelect()` / `keydown()` / `cut()` | 处理选择、键盘和剪切。 | 控件交互链路 |
| `DateControl.ts` | `awake()` / `destroy()` | 打开或销毁日期弹层。 | 控件点击和生命周期 |
