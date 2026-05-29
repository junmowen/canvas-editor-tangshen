# Select Control 目录说明

`control/runtime/select/` 存放下拉选择控件运行实现。

## 位置说明

- 所属业务：`control`
- 所属层级：控件运行时 / select
- 上游调用：`Control.ts`、控件交互链路
- 下游依赖：选项 code、弹层和控件值

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `SelectControl.ts` | select 控件取值、设值、选项文本、弹层、选择、键盘和销毁。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `SelectControl.ts` | `setElement()` / `getElement()` / `getIsPopup()` | 绑定控件元素并读取弹层状态。 | `Control.ts` |
| `SelectControl.ts` | `getCodes()` / `getText()` | 读取选项 code 和显示文本。 | 控件取值、弹层渲染 |
| `SelectControl.ts` | `getValue()` / `setValue()` | 读取或写入 select 值。 | 控件命令、外部取值 |
| `SelectControl.ts` | `keydown()` / `cut()` / `clearSelect()` / `setSelect()` | 处理键盘、剪切和选择。 | 控件交互链路 |
| `SelectControl.ts` | `awake()` / `destroy()` | 打开或销毁下拉弹层。 | 控件点击和生命周期 |
