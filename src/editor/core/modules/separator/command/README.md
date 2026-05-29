# Separator Command 目录索引

`command/` 存放分隔符命令复用规则。

## 位置说明

- 所属业务：`separator`
- 所属层级：命令适配业务规则层
- 上游调度：`command/CommandAdaptMedia.ts`
- 下游依赖：分隔符元素类型、换行占位和零宽行头判断

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `SeparatorCommandPolicy.ts` | 分隔符线型更新、元素创建和行头替换判断 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `SeparatorCommandPolicy.ts` | `applySeparatorDashArray(element, dashArray)` | 当前元素为分隔符时更新线型，并返回未命中、未变化或已更新状态。 | `command/CommandAdaptMedia.ts` 的 `executeSeparator()` |
| `SeparatorCommandPolicy.ts` | `createSeparatorElement(dashArray)` | 创建可插入文档的分隔符元素。 | `command/CommandAdaptMedia.ts` 的 `executeSeparator()` |
| `SeparatorCommandPolicy.ts` | `shouldReplaceParagraphStartWithSeparator(payload)` | 判断非文档起点的零宽行头元素是否应被分隔符替换。 | `command/CommandAdaptMedia.ts` 的 `executeSeparator()` |

## 维护规则

- 分隔符元素创建、dashArray 更新和零宽行头替换判断放在这里。
