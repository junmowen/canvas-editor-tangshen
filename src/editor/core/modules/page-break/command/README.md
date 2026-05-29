# Page Break Command 目录索引

`command/` 存放分页符命令复用规则。

## 位置说明

- 所属业务：`page-break`
- 所属层级：命令适配业务规则层
- 上游调度：`command/CommandAdaptMedia.ts`
- 下游依赖：分页符元素常量

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `PageBreakCommandPolicy.ts` | 分页符文档元素创建策略 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `PageBreakCommandPolicy.ts` | `createPageBreakElement()` | 创建可插入文档的分页符元素，值使用换行占位。 | `command/CommandAdaptMedia.ts` 的 `executePageBreak()` |

## 维护规则

- 分页符元素创建规则放在这里。
