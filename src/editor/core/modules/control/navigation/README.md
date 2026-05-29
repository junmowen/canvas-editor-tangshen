# Control Navigation 目录索引

`navigation/` 存放控件之间的键盘导航和边界跳转规则。

## 位置说明

- 所属业务：`control`
- 所属层级：键盘导航策略层
- 上游调度：`event/keyboard/intents/TabIntent.ts`、方向键 intent
- 下游依赖：`control/runtime/Control` 和隐藏控件上下文

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `tryNavigateActiveControl.ts` | 表单控件前后切换入口 |
| `tryNavigateFormControlBoundary.ts` | 表单模式下控件边界导航判断 |
| `resolveHiddenControlHorizontalMove.ts` | 隐藏控件内部横向移动落点修正 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `tryNavigateActiveControl.ts` | `tryNavigateActiveControl(control, order)` | 在 active control 存在时按前后顺序切换控件。 | `event/keyboard/intents/TabIntent.ts` |
| `tryNavigateFormControlBoundary.ts` | `tryNavigateFormControlBoundary(payload)` | 表单模式下识别控件边界并触发相邻控件导航。 | 键盘方向移动 intent |
| `resolveHiddenControlHorizontalMove.ts` | `resolveHiddenControlHorizontalMove(payload)` | 命中隐藏控件内部时修正水平移动的光标位置。 | `event/keyboard/shared/horizontalMove.ts` |

## 维护规则

- 表单模式下控件前后切换、控件边界识别、隐藏控件内部落点等业务判断放在这里。
- Tab、方向键等键盘入口只传入方向语义，具体 `initNextControl` 调用集中在这里。
- keyboard event 只负责识别按键方向和调用导航入口，不直接维护控件组件边界细节。
