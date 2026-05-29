# Number Control 目录说明

`control/runtime/number/` 存放数字控件运行实现。

## 位置说明

- 所属业务：`control`
- 所属层级：控件运行时 / number
- 上游调用：`Control.ts`
- 下游依赖：`TextControl`

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `NumberControl.ts` | 复用文本控件能力的数字控件实现。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `NumberControl.ts` | `NumberControl` | 继承 `TextControl`，承载数字控件类型分发。 | `Control.ts`、控件工厂 |
