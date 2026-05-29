# 2026-05-15 chunk 输入运行时修复

已完成：

1. `ChunkPatchGuard` 支持根据本次插入数量扩展测量范围，避免新输入内容被旧 `chunk.endIndex` 截断。
2. `ChunkRuntimePatcher` 改为使用旧范围删除、新范围写入，并同步修正后续 `row.startIndex`、`row.rowIndex`、`position.index`、当前页 `position.rowNo` 和纵向坐标。
3. `DocumentChunkIndex` 在局部 patch 成功后平移后续 chunk 索引，保证连续输入命中最新 chunk 边界。
4. 普通段落扩高不再直接失败；正式 patch 成功后会补绘当前可见页，避免输入内容视觉上消失。
5. 输入态 bitmap 缓存失效从全页改为当前页 base 层，避免高页数文档每个字符遍历所有页面缓存版本。
6. 程序化连续单字符输入增加轻量合并批次，减少大文档前部输入时反复移动正文大数组尾部。
7. chunk 管线增加 guard / measure / runtime patch 分段耗时统计，后续性能问题可以直接定位阶段。
8. 新增浏览器级回归：输入后点击不丢内容、连续 chunk 输入后段落布局和 `position.index` 稳定。
9. 新增 `PageChunkRebalancePatcher`：以当前页和下一页作为同步窗口，重新计算窗口内页级 chunk 数据，并写回 `rowList`、`pageRowList`、`layoutElementList`、`positionList` 和页级 chunk cache。当前页新增几行时，末尾行自然进入下一个 chunk；当前页删除几行时，下一个 chunk 开头行自然补回当前页。
10. `DocumentChunkIndex.rebuildPageChunks()` 已按 `pageRowList` 快速重建页级 chunk，不再为了页 rebalance 扫描整篇 positionList；当前页会保留 dirty 标记，供后续远邻页异步同步队列继续消费。
11. `PageChunkRebalancePatcher` 已增加异步邻近页传播队列：同步窗口只处理当前页 + 下一页；如果窗口尾页边界变化，就把新窗口尾页加入 `setTimeout(0)` 队列，后续按“尾页 + 下一页”继续合并，每轮最多处理 3 个页窗口。
12. 页级 rebalance 传播判断已修正为同时观察“窗口页数变化”和“尾页边界变化”：长插入导致当前窗口从 2 页扩成 3 页时，会从新窗口尾页继续和旧下一页合并；连续删除导致当前页缺口时，会从当前尾页继续向后补行。
13. `Draw.getRenderBackendStats().chunkLayout` 已补充页级 rebalance 指标：同步 patch 次数、异步 patch 次数、传播调度次数、边界传播次数、异步队列当前 pending、pending 峰值和最近异步页码。
14. `TypingLinePatchPipeline` 仅保留为非页级 chunk 的窄兜底，不再作为复杂页输入主路径。
