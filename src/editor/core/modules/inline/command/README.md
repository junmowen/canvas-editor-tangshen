# Inline Command 目录索引

`command/` 存放超链接、日期等内联元素命令复用规则。

## 位置说明

- 所属业务：`inline`
- 所属层级：命令适配业务规则层
- 上游调度：`command/CommandAdaptMedia.ts`
- 下游依赖：文档元素列表和超链接 id

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `HyperlinkCommandPolicy.ts` | 超链接元素构造、范围解析、取消和地址更新策略 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `HyperlinkCommandPolicy.ts` | `createHyperlinkElementList(payload, hyperlinkId)` | 根据文本片段列表创建同一 `hyperlinkId` 下的超链接元素列表。 | `command/CommandAdaptMedia.ts` 的 `executeHyperlink()` |
| `HyperlinkCommandPolicy.ts` | `resolveHyperlinkRangeFromCandidates(payload)` | 从候选元素中定位超链接，并向左右扩展得到完整超链接范围。 | `command/CommandAdaptMedia.ts` 的超链接范围解析流程 |
| `HyperlinkCommandPolicy.ts` | `clearHyperlinkAttrs(elementList, leftIndex, rightIndex)` | 清除指定范围内元素的超链接属性，保留原文本内容。 | `command/CommandAdaptMedia.ts` 的取消超链接流程 |
| `HyperlinkCommandPolicy.ts` | `updateHyperlinkUrl(elementList, leftIndex, rightIndex, url)` | 更新指定超链接范围内元素的链接地址。 | `command/CommandAdaptMedia.ts` 的更新超链接流程 |

## 维护规则

- 超链接元素构造、范围解析、取消和编辑属性变更放在这里。
- command 适配层只负责组织上下文、调用内联命令规则并触发渲染。
