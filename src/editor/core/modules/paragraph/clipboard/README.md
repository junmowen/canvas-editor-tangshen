# Paragraph Clipboard 目录索引

`clipboard/` 存放段落边界相关的粘贴清洗规则。

## 位置说明

- 所属业务：`paragraph`
- 所属层级：剪贴板清洗策略层
- 上游调度：`event/clipboard/pasteClipboardCommon.ts`
- 下游依赖：标题、列表和段落边界元素规则

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `normalizeStructuredPasteElements.ts` | 结构化粘贴时清洗标题、列表和换行边界元素 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `normalizeStructuredPasteElements.ts` | `normalizeStructuredPasteElements(elementList)` | 规范化结构化粘贴元素，拆解不应继承的段落上下文。 | `event/clipboard/pasteClipboardCommon.ts` |

## 维护规则

- 标题、列表锚点下的虚拟元素拆解和换行边界处理放在这里。
- event clipboard 只负责调用粘贴清洗和最终插入，不直接判断 `titleId` / `listId`。
