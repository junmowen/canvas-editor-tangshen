# Page Break Layout

`layout/` 存放分页符参与行内布局测量的业务规则。

## 位置说明

- 所属业务：`page-break`
- 所属层级：行内布局测量层 / worker 快照校验层
- 上游调度：`draw/layout/InlineElementLayout.ts`、`draw/layout/RowLayoutEngine.ts`、`render-backend/worker/*`
- 下游依赖：分页符元素类型

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `PageBreakElementLayout.ts` | 分页符可用宽度和默认高度测量 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `PageBreakElementLayout.ts` | `isPageBreakElement(element)` | 判断元素是否为分页符，供行布局、worker 快照命令和快照校验复用。 | `draw/layout/RowLayoutEngine.ts`、`render-backend/worker/PageRenderSnapshotRowElementCommands.ts`、`render-backend/worker/PageRenderSnapshotValidator.ts` |
| `PageBreakElementLayout.ts` | `measure(payload)` | 将分页符测量为占满可用宽度、使用默认字号高度的行内元素。 | `draw/layout/InlineElementLayout.ts` 的行内测量流程 |

## 维护规则

- 分页符测量规则留在本目录，不内联回 `draw/layout/InlineElementLayout.ts`。
