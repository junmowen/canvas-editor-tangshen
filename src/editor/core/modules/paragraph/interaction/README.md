# Paragraph Interaction 目录索引

`interaction/` 存放段落级键盘和编辑副作用。

## 位置说明

- 上游调用：`event/keyboard/intents/BackspaceIntent.ts`、`TabIntent.ts`、`event/pointer/intents/selection/SelectionWordRangeIntent.ts`、`event/pointer/intents/drag-drop/DragCommitMutationIntent.ts`
- 下游依赖：段落零宽元素、词选择文本白名单、普通文本和 Tab 元素类型
- 迁移目的：键盘和指针 intent 只表达交互意图，不直接判断段落业务元素类型。

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `ParagraphBackspaceInteraction.ts` | 退格时段落上下文继承 |
| `ParagraphIntentElementPolicy.ts` | 事件 intent 中的词选择、拖拽普通文本和 Tab 插入元素规则 |

## 函数说明

| 文件 | 函数 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `ParagraphBackspaceInteraction.ts` | `inheritRowFlexOnCollapsedZeroBackspace(payload)` | 退格命中零宽段落边界时继承前一个段落的 rowFlex | `BackspaceIntent` |
| `ParagraphIntentElementPolicy.ts` | `getParagraphWordSegmentValue(element)` | 词选择时把可参与分词的元素转成文本，非文本业务元素转成零宽占位 | `SelectionWordRangeIntent.getWordRangeBySegmenter()` |
| `ParagraphIntentElementPolicy.ts` | `isParagraphPlainTextDragElement(element)` | 判断拖拽提交时是否按普通文本元素重建 | `DragCommitMutationIntent.applyDragCommitMutation()` |
| `ParagraphIntentElementPolicy.ts` | `createParagraphTabElement(style)` | 创建继承当前样式的 Tab 插入元素 | `TabIntent.runTabIntent()` |

## 维护规则

- Backspace、Enter 等键盘触发的段落上下文继承规则放在这里。
- keyboard intent 只负责组织输入状态和调用段落策略，不直接判断零宽段落细节。
- pointer/keyboard intent 不直接散写段落文本、Tab 和词选择元素类型判断。
