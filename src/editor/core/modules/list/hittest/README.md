# List HitTest 目录索引

`hittest/` 存放列表相关的命中测试业务规则。

## 位置说明

- 所属业务：`list`
- 所属层级：命中测试策略层
- 上游调度：`position/PositionHitTestMethods.ts`
- 下游依赖：列表样式、行位置和 checkbox 列表符号尺寸

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `ListCheckboxHitTestPolicy.ts` | checkbox 列表符号命中、行首空白命中和命中索引解析 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `ListCheckboxHitTestPolicy.ts` | `resolveListCheckboxTabHit(payload)` | 解析 checkbox 列表符号或行首 tab 的命中结果。 | `position/PositionHitTestMethods.ts` |
| `ListCheckboxHitTestPolicy.ts` | `resolveListCheckboxHeadStartX(payload)` | 计算 checkbox 列表符号起始横坐标。 | `resolveListCheckboxHeadHit()` |
| `ListCheckboxHitTestPolicy.ts` | `resolveListCheckboxHeadHit(payload)` | 判断坐标是否命中 checkbox 列表行头。 | `position/PositionHitTestMethods.ts` |

## 维护规则

- checkbox 列表符号、列表行首空白命中和列表符号对应的逻辑索引解析放在这里。
- position 命中流程只调用这里的策略，不直接判断 `ListStyle.CHECKBOX`。
