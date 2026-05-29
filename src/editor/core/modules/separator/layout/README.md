# Separator Layout

`layout/` 存放分隔符参与行内布局测量的业务规则。

## 位置说明

- 所属业务：`separator`
- 所属层级：行内布局测量层 / worker 快照校验层
- 上游调度：`draw/layout/InlineElementLayout.ts`、`draw/layout/RowLayoutEngine.ts`、`render-backend/worker/*`
- 下游依赖：分隔符元素类型和分隔符线宽配置

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `SeparatorElementLayout.ts` | 分隔符可用宽度、线宽和基线测量 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `SeparatorElementLayout.ts` | `isSeparatorElement(element)` | 判断元素是否为分隔符，供行布局和 worker 快照命令复用。 | `draw/layout/RowLayoutEngine.ts`、`render-backend/worker/PageRenderSnapshotRowElementCommands.ts`、`render-backend/worker/PageRenderSnapshotValidator.ts` |
| `SeparatorElementLayout.ts` | `constructor(draw)` | 注入 `Draw` 运行时，用于读取分隔符线宽配置。 | `draw/layout/InlineElementLayout.ts` 构造函数 |
| `SeparatorElementLayout.ts` | `measure(payload)` | 将分隔符测量为占满可用宽度的行内元素，并按行距修正 ascent / descent。 | `draw/layout/InlineElementLayout.ts` 的行内测量流程 |

## 维护规则

- 分隔符测量规则留在本目录，不内联回 `draw/layout/InlineElementLayout.ts`。
