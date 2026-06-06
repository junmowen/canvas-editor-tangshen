# Paragraph Layout

`layout/` 存放段落基础元素参与行内布局测量的业务规则。

## 位置说明

- 上游调用：`draw/layout/InlineElementLayout.ts`、`RowLayoutEngine.ts`、`DrawLayoutPipeline.ts`、`Position.ts`、`draw/particle/TextParticle.ts`、`render-backend/worker/PageRenderSnapshotRowElementCommands.ts`
- 下游依赖：Tab、普通文本、rowFlex、局部 patch 白名单、连续单词和标点判断
- 迁移目的：布局、position、文本粒子和 worker 快照只调用段落策略，不直接散写段落元素类型和 rowFlex 规则。

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `TabElementLayout.ts` | Tab 元素识别、行内占位尺寸和基线测量 |
| `ParagraphRowLayoutPolicy.ts` | 普通文本识别、零宽段落断行、段落缩进、rowFlex 均分和位置偏移规则 |
| `ParagraphPatchLayoutPolicy.ts` | 单段落局部 patch 的不安全业务元素边界判断和输入态文本 patch 白名单 |
| `ParagraphTextMeasurePolicy.ts` | 连续单词测量和标点测量的段落元素判断 |

## 函数说明

| 文件 | 函数 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `TabElementLayout.ts` | `isTabElement(element)` | 判断元素是否为 Tab | `TabElementLayout.measure()`、`PageRenderSnapshotRowElementCommands.pushRowElementCommands()` |
| `TabElementLayout.ts` | `TabElementLayout.measure(payload)` | 测量 Tab 的行内宽高和基线 | `InlineElementLayout.measureElement()` |
| `ParagraphRowLayoutPolicy.ts` | `isPlainTextElement(element)` | 判断元素是否是普通文本 | `RowLayoutEngine`、`DrawInsertBatcher` 等段落布局/插入流程 |
| `ParagraphRowLayoutPolicy.ts` | `shouldBreakAtZeroParagraphElement(element)` | 判断零宽段落是否需要断行 | `RowLayoutEngine` |
| `ParagraphRowLayoutPolicy.ts` | `shouldApplyRowFlexSpacing(payload)` | 判断两端对齐 rowFlex 是否参与间距分配 | `RowLayoutEngine` |
| `ParagraphRowLayoutPolicy.ts` | `normalizeParagraphIndent(value, scale)` | 把段落缩进值归一化为非负布局像素值 | `ParagraphRowLayoutPolicy` |
| `ParagraphRowLayoutPolicy.ts` | `resolveParagraphOffsetX(payload)` | 计算段落当前行的左侧缩进偏移 | `RowLayoutEngine` |
| `ParagraphRowLayoutPolicy.ts` | `resolveParagraphRightIndent(payload)` | 计算段落右缩进占用的行宽 | `RowLayoutEngine` |
| `ParagraphRowLayoutPolicy.ts` | `resolveRowFlexOffsetX(payload)` | 解析 rowFlex 对 position 的横向偏移 | `Position` |
| `ParagraphPatchLayoutPolicy.ts` | `isPatchableTextElement(element)` | 判断输入态局部 patch 是否可处理该文本元素 | `ChunkPatchGuard`、`TypingLinePatchPipeline`、`TypingPreviewRenderer`、`PageChunkRuntimePatcher` |
| `ParagraphPatchLayoutPolicy.ts` | `isUnsafeParagraphPatchElement(element)` | 判断段落局部 patch 是否遇到不安全业务元素 | `DrawLayoutPipeline` |
| `ParagraphTextMeasurePolicy.ts` | `isParagraphWordMeasureElement(payload)` | 判断元素是否可参与连续单词测量 | `TextParticle.measureWord()` |
| `ParagraphTextMeasurePolicy.ts` | `isParagraphPunctuationElement(element)` | 判断元素是否是需要单独测量的标点 | `TextParticle.measurePunctuationWidth()` |

## 维护规则

- 段落基础格式元素的测量规则留在本目录，不内联回 `draw/layout/InlineElementLayout.ts`。
- 段落断行、段落缩进和 rowFlex 策略留在本目录，不内联回 `draw/layout/RowLayoutEngine.ts`。
- 单段落局部 patch 的安全边界判断留在本目录，不内联回 `draw/layout/DrawLayoutPipeline.ts`。
- 文本粒子只负责 canvas 测量，连续单词和标点判断留在本目录。
