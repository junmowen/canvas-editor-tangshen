# Draw Layout Chunk 目录说明

`layout/chunk/` 存放局部布局 patch 能力，用于减少打字、删除和分页变化时的整篇重排成本。

## 位置说明

- 所属层级：公共绘制层 / 增量布局层
- 上游调用：`draw/layout/ChunkLayoutPipeline.ts`、`draw/render/TypingPatchCoordinator.ts`
- 下游依赖：`RowLayoutEngine`、`PagePartitioner`、`Position`

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `ChunkPatchGuard.ts` | 判断当前修改是否满足局部 patch 条件。 |
| `ChunkLayoutMeasurer.ts` | 对 dirty chunk 重新测量行和 position。 |
| `ChunkRuntimePatcher.ts` | 将测量结果写回运行时 row、position 和 chunk 边界。 |
| `TypingLinePatchPipeline.ts` | 光标附近单行打字 patch。 |
| `PageChunkRebalancePatcher.ts` | 跨页 chunk 重新平衡。 |
| `PageChunkRuntimePatcher.ts` | 分页 rebalance 后写回运行时结构。 |
| `PageChunkWindowPlanner.ts` | 计算同步和异步 rebalance 窗口。 |
| `DirtyPageRangePlanner.ts` | 规划受影响页范围。 |
| `AsyncPageRebalanceQueue.ts` | 异步分页 rebalance 队列。 |
| `ChunkPatchAlgorithms.ts` | 数组片段替换和行位移通用算法。 |
| `ChunkLayoutStats.ts` / `PageChunkRebalanceStats.ts` | 记录局部布局和分页 rebalance 统计。 |
| `ChunkDebugLogger.ts` | chunk 调试日志开关和输出。 |
| `ChunkLayoutTypes.ts` / `PageChunkRebalanceTypes.ts` | patch 和 rebalance 类型定义。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `ChunkPatchGuard.ts` | `resolveContext()` | 校验 dirty 范围并生成 patch 上下文。 | `ChunkLayoutPipeline.ts` |
| `ChunkLayoutMeasurer.ts` | `measure(context)` | 重测 dirty chunk 的行、position 和高度。 | `ChunkLayoutPipeline.ts` |
| `ChunkRuntimePatcher.ts` | `patch()` | 将局部测量结果写回 element、row、position。 | `ChunkLayoutPipeline.ts` |
| `TypingLinePatchPipeline.ts` | `patchAroundCursor()` | 尝试只重排光标附近一行。 | `TypingPatchCoordinator.ts` |
| `PageChunkRebalancePatcher.ts` | `patch()` | 处理分页 chunk 的同步 / 异步 rebalance。 | `ChunkLayoutPipeline.ts` |
| `PageChunkRuntimePatcher.ts` | `patch()` / `getOldWindowPageRows()` / `hasTableRows()` | 写回分页窗口并判断表格行影响。 | `PageChunkRebalancePatcher.ts` |
| `PageChunkWindowPlanner.ts` | `resolveSyncWindowSize()` / `resolveAsyncWindowSize()` | 计算 rebalance 需要测量的页窗口。 | `PageChunkRebalancePatcher.ts` |
| `DirtyPageRangePlanner.ts` | `plan()` | 生成受影响页范围计划。 | `PageChunkRebalancePatcher.ts` |
| `AsyncPageRebalanceQueue.ts` | `schedule()` / `clearPending()` / `getStats()` | 调度和观察异步 rebalance。 | `PageChunkRebalancePatcher.ts` |
| `ChunkPatchAlgorithms.ts` | `patchArraySegment()` / `getRowsHeight()` / `shiftRowsAfterPatch()` | 提供 patch 数组和行偏移的基础算法。 | `ChunkRuntimePatcher.ts`、`TypingLinePatchPipeline.ts` |
| `ChunkDebugLogger.ts` | `isChunkDebugEnabled()` / `logChunkDebug()` | 控制 chunk debug 日志输出。 | chunk patch 各阶段 |
