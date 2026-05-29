# Checkbox Control 目录说明

`control/runtime/checkbox/` 存放复选框控件运行实现。

## 位置说明

- 所属业务：`control`
- 所属层级：控件运行时 / checkbox
- 上游调用：`Control.ts`、控件交互和命令链路
- 下游依赖：控件元素和选中状态

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `CheckboxControl.ts` | checkbox 控件取值、设值、选择、键盘和剪切行为。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `CheckboxControl.ts` | `setElement()` / `getElement()` / `getCode()` | 绑定并读取控件元素和 code。 | `Control.ts` |
| `CheckboxControl.ts` | `getValue()` / `setValue()` / `setSelect()` | 读取、写入和切换选中态。 | 控件命令、点击交互 |
| `CheckboxControl.ts` | `keydown()` / `cut()` | 处理键盘和剪切行为。 | 控件输入链路 |
