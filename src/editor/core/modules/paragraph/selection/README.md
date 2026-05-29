# Paragraph Selection 目录说明

`paragraph/selection/` 存放段落边界和段落选择范围解析。

## 位置说明

- 所属业务：`paragraph`
- 所属层级：业务选区策略层
- 上游调用：三击段落选择、range 收缩和键盘链路
- 下游依赖：元素列表、段落边界规则

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `ParagraphBoundaryPolicy.ts` | 段落起止边界和折叠段尾扩展规则。 |
| `resolveParagraphSelectionRange.ts` | 根据当前位置解析段落选区范围。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `ParagraphBoundaryPolicy.ts` | `isParagraphStartBoundary()` / `isParagraphEndBoundary()` | 判断段落起点和终点。 | range、paragraph selection |
| `ParagraphBoundaryPolicy.ts` | `shouldExtendCollapsedParagraphEnd()` | 判断折叠选区是否需要扩展到段尾。 | range 收缩 / 扩展链路 |
| `resolveParagraphSelectionRange.ts` | `resolveParagraphSelectionRange()` | 根据当前位置计算整个段落选区。 | `ParagraphSelectionIntent.ts` |
