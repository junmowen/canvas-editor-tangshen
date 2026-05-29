# Richtext Render 目录索引

`render/` 存放富文本装饰参与行绘制时的业务编排。

## 位置说明

- 上游调用：`draw/render/RowRenderer.ts`、`render-backend/worker/PageRenderSnapshotTextStyleCommands.ts`、`PageRenderSnapshotTextDecorationCommands.ts`、`PageRenderSnapshotValidator.ts`
- 下游依赖：超链接、上下标、rowFlex、文本装饰和文本类型白名单
- 迁移目的：行渲染和 worker 快照只调用富文本策略，不直接散写上下标、超链接和文本装饰判断。

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `RowHighlightRenderer.ts` | 行内文本高亮、源文档高亮和控件高亮合并绘制 |
| `RowTextDecorationRenderer.ts` | 行内下划线、控件下划线和删除线的分段 record 与最终 flush 规则 |
| `ScriptRowRenderer.ts` | 上标 / 下标行内绘制分发 |
| `WorkerSnapshotTextStylePolicy.ts` | worker 快照文本颜色、上下标偏移和独立绘制判断 |

## 函数说明

| 文件 | 函数 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `WorkerSnapshotTextStylePolicy.ts` | `resolveWorkerSnapshotTextFillStyle(payload)` | 解析 worker 文本颜色，超链接无显式颜色时使用默认超链接色 | `PageRenderSnapshotTextStyleCommands.resolveTextPaintStyle()` |
| `WorkerSnapshotTextStylePolicy.ts` | `resolveWorkerSnapshotInlineTextOffsetY(element)` | 解析上标/下标在 worker 文本基线上的纵向偏移 | `PageRenderSnapshotTextStyleCommands.resolveInlineTextOffsetY()` |
| `WorkerSnapshotTextStylePolicy.ts` | `shouldDrawWorkerSnapshotStandaloneText(element)` | 判断元素是否不能参与连续文本合并，需要单独绘制 | `PageRenderSnapshotTextStyleCommands.shouldDrawStandaloneText()` |
| `WorkerSnapshotTextStylePolicy.ts` | `shouldUseWorkerSnapshotHyperlinkUnderline(element)` | 判断超链接是否应使用默认下划线 | `PageRenderSnapshotTextDecorationCommands.pushTextDecorationCommands()` |
| `WorkerSnapshotTextStylePolicy.ts` | `shouldOffsetWorkerSnapshotSubscriptDecoration(element)` | 判断文本装饰是否需要下标偏移 | `PageRenderSnapshotTextDecorationCommands.pushTextDecorationCommands()` |
| `WorkerSnapshotTextStylePolicy.ts` | `isWorkerSnapshotStrikeoutTextElement(element)` | 判断元素是否可绘制删除线 | `PageRenderSnapshotTextDecorationCommands.pushTextDecorationCommands()` |
| `WorkerSnapshotTextStylePolicy.ts` | `isWorkerSnapshotTextElement(element)` | 判断元素是否是 worker 快照支持的文本元素 | `PageRenderSnapshotValidator.assertElementSupported()` |

## 维护规则

- 富文本高亮、文本装饰和上下标的行级绘制规则留在本目录。
- `draw/render/RowRenderer.ts` 只保留行绘制调度，不内联高亮业务细节。
- worker 快照中的富文本颜色、上下标偏移和文本装饰判断留在本目录。
