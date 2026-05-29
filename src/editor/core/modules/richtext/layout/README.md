# Richtext Layout

`layout/` 存放富文本装饰元素参与行内布局测量的业务规则。

## 位置说明

- 所属业务：`richtext`
- 所属层级：行内布局测量层
- 上游调度：`draw/layout/InlineElementLayout.ts`
- 下游依赖：上标 / 下标元素类型和行内 metrics

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `ScriptElementLayout.ts` | 上标、下标字号和基线测量修正 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `ScriptElementLayout.ts` | `applyActualSize(element, defaultSize)` | 对上标 / 下标元素按默认字号计算实际字号。 | `draw/layout/InlineElementLayout.ts` 的文本测量流程 |
| `ScriptElementLayout.ts` | `adjustMetrics(element, metrics)` | 根据上标 / 下标类型调整 ascent / descent，修正基线占位。 | `draw/layout/InlineElementLayout.ts` 的文本测量流程 |
| `ScriptElementLayout.ts` | `isScript(element)` | 判断元素是否为上标或下标。 | `ScriptElementLayout.applyActualSize()` |

## 维护规则

- 上下标测量修正留在本目录，不内联回 `draw/layout/InlineElementLayout.ts`。
