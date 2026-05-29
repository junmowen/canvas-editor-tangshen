# Inline Date Particle 目录索引

`inline/particle/date/` 存放日期内联元素的业务绘制与日期选择浮层。

## 位置说明

- 所属业务：`inline/date`
- 所属层级：日期内联浮层运行层
- 注册位置：`draw/runtime/DrawComponentRegistry.ts`
- 主要调用：`modules/inline/interaction/applyInlinePointerEffects.ts`、`modules/control/runtime/date/DateControl.ts`

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `DateParticle.ts` | 日期元素的选区范围解析、值替换和浮层渲染入口 |
| `DatePicker.ts` | 日期选择器 DOM、模式切换、格式化和提交交互 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `DateParticle.ts` | `getDateElementRange()` | 解析当前日期元素连续范围。 | `DateParticle.renderDatePicker()` |
| `DateParticle.ts` | `clearDatePicker()` | 销毁日期选择浮层。 | `draw/runtime/DrawLifecycleService.ts`、`inline/interaction/*` |
| `DateParticle.ts` | `renderDatePicker(element, position)` | 在日期元素位置打开选择器并写回选择结果。 | `inline/interaction/applyInlinePointerEffects.ts` |
| `DatePicker.ts` | `isInvalidDate(value)` | 判断日期是否超出可选范围。 | `DatePicker` 内部日期选择流程 |
| `DatePicker.ts` | `formatDate(date, format)` | 按配置格式化日期值。 | `DatePicker.render()`、控件日期选择流程 |
| `DatePicker.ts` | `render(option)` | 创建并展示日期选择器。 | `DateParticle.ts`、`control/runtime/date/DateControl.ts` |
| `DatePicker.ts` | `dispose()` / `destroy()` | 隐藏或销毁日期选择器 DOM 和事件。 | `DateParticle.clearDatePicker()`、日期控件生命周期 |

## 维护规则

- 日期元素属于内联业务能力，相关绘制和浮层逻辑统一放在这里。
- 通用文本、上下标和换行等基础粒子仍归属 `core/draw/particle/`。
