# Control Selection 目录索引

`selection/` 存放控件参与选区、光标落点和禁用态命中时的业务规则。

## 位置说明

- 所属业务：`control`
- 所属层级：选区边界策略层
- 上游调度：`range/RangeManagerEdit.ts`、`range/selection/resolveSelectionDragRange.ts`、指针选择链路
- 下游依赖：控件 value / prefix / suffix / placeholder 组件判断

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `shrinkControlRangeBoundary.ts` | 控件结构内外的 range 边界收缩 |
| `isControlPlaceholderRange.ts` | 判断拖选范围是否只覆盖控件 placeholder |
| `resolveDisabledControlCursorIndex.ts` | 禁用控件命中后的光标落点修正 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `shrinkControlRangeBoundary.ts` | `shrinkControlRangeBoundary(payload)` | 根据控件前缀、后缀、占位符和值域规则收缩 range 边界。 | `range/RangeManagerEdit.ts` |
| `isControlPlaceholderRange.ts` | `isControlPlaceholderRange(draw, range)` | 判断拖选范围是否只覆盖同一控件 placeholder。 | `range/selection/resolveSelectionDragRange.ts` |
| `resolveDisabledControlCursorIndex.ts` | `resolveDisabledControlCursorIndex(...)` | 禁用控件命中时解析可落光标索引。 | 指针选择 intent |

## 维护规则

- 控件结构内外的光标落点修正放在这里。
- 控件 placeholder 等特殊选区规则放在这里。
- range 边界收缩时涉及的控件前缀、后缀、占位符和值域规则放在这里。
- pointer selection intent 只传入命中元素和索引，不直接遍历控件结构边界。
