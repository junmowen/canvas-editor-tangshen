# Draw Layout 目录说明

`layout/` 是 draw 层的布局核心，负责将元素流计算为行、分页、position、chunk 索引和表格布局快照。

## 位置说明

- 所属层级：公共绘制层 / 布局计算层
- 上游调用：`Draw.ts`、`DrawMutationService`、渲染管线
- 下游依赖：`position/**`、table 布局、chunk patch
- 子目录：`chunk/`

## 文件说明

| 文件 / 目录 | 职责 |
| --- | --- |
| `RowLayoutEngine.ts` | 元素流到 rowList 的主布局引擎。 |
| `DrawLayoutPipeline.ts` | 整体布局编排，串联行布局、分页、position 和快照。 |
| `PagePartitioner.ts` | 将 rowList 切分为 pageRowList。 |
| `DrawMetricsService.ts` | 纸张、边距、行高、字体和元素尺寸计算。 |
| `InlineElementLayout.ts` | 内联元素测量。 |
| `DocumentChunkIndex.ts` / `ChunkLayoutCache.ts` / `ChunkLayoutPipeline.ts` | 文档 chunk 索引、缓存和增量布局管线。 |
| `ChunkDataTypes.ts` | chunk 布局相关类型。 |
| `chunk/` | 打字行 patch、分页 rebalance、dirty range 和运行时 patch。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `RowLayoutEngine.ts` | `computeRowList(payload)` | 计算正文或表格上下文的 rowList。 | `Draw.computeRowList()`、chunk measure |
| `RowLayoutEngine.ts` | `getTableLayoutEngine()` | 暴露表格布局引擎。 | table 布局和局部重排 |
| `DrawLayoutPipeline.ts` | `compute(layoutPatch?)` | 编排整篇或增量布局，输出页面、行、position 和快照。 | `DrawRenderFacadeService.ts`、`Draw.ts` |
| `DrawLayoutPipeline.ts` | `getStats()` / `resetStats()` | 读取或重置布局统计。 | 调试和性能统计 |
| `PagePartitioner.ts` | `partitionRows(rowList, mainElementList)` | 将行列表按页面高度切成分页结构。 | `DrawLayoutPipeline.ts` |
| `DrawMetricsService.ts` | `getWidth()` / `getHeight()` / `getMargins()` / `getElementSize()` | 读取页面尺寸和测量元素。 | layout、render、position |
| `InlineElementLayout.ts` | `measure(payload)` | 测量内联元素占位和行内尺寸。 | `RowLayoutEngine.ts` |
| `DocumentChunkIndex.ts` | `build()` / `getStats()` / `resetStats()` | 构建并统计文档 chunk 索引。 | `ChunkLayoutPipeline.ts`、局部布局 |
| `ChunkLayoutCache.ts` | `get()` / `set()` / `clear()` | 缓存 chunk 测量结果。 | `ChunkLayoutPipeline.ts` |
| `ChunkLayoutPipeline.ts` | `patch()` / `getStats()` / `resetStats()` | 尝试对局部修改执行 chunk patch。 | `DrawLayoutPipeline.ts`、输入链路 |
