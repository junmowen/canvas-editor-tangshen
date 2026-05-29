# Control Hittest 目录索引

`hittest/` 存放控件参与位置命中、直接命中和控件结构识别的规则。

## 位置说明

- 所属业务：`control`
- 所属层级：命中测试策略层
- 上游调度：`position/PositionHitTestMethods.ts`、指针选择 intent
- 下游依赖：控件组件类型和控件 id

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `ControlHitTest.ts` | checkbox / radio 直接命中和元素是否处于控件结构内的判断 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `ControlHitTest.ts` | `isCheckboxHitElement(element)` | 判断元素是否为 checkbox 可直接命中对象。 | 指针选择和控件切换链路 |
| `ControlHitTest.ts` | `isRadioHitElement(element)` | 判断元素是否为 radio 可直接命中对象。 | 指针选择和控件切换链路 |
| `ControlHitTest.ts` | `isElementInControl(element)` | 判断元素是否处于控件结构内。 | `position/PositionHitTestMethods.ts` |

## 维护规则

- checkbox、radio 等控件组件命中判断放在这里。
- position/event 目录只消费命中语义，不直接判断 `controlComponent` 或 `controlId`。
