# 2026-05-16 运行时修复与大粘贴事务

已完成：

1. 已新增 `ChunkPatchAlgorithms`，抽离 `patchArraySegment()`、`getRowsHeight()`、`shiftRowsAfterPatch()` 等公共算法，避免页级 rebalance、运行时 patch 和后续 chunk 模块继续复制数组替换 / 行平移逻辑。
2. `patchArraySegment()` 已改为先删除再按 8192 分片插入，避免超大粘贴时 `Array.splice(...items)` 触发参数数量或调用栈上限。
3. 已新增 `AsyncPageRebalanceQueue`，页级异步传播队列统一按 `version:pageNo` 去重和刷新，避免旧布局版本的异步任务串到新文档状态。
4. `AsyncPageRebalanceQueue` 已补充 `clearPending()`，完整 layout 已覆盖派生状态时只清空待处理页，不重置统计计数，便于压测继续观察本场景的传播行为。
5. 已新增 `ChunkDebugLogger`，通过 `window.__CANVAS_EDITOR_CHUNK_DEBUG__` 开关输出 chunk 管线日志；日志对象构造前先判断开关，避免默认路径产生额外对象分配。
6. 页级 rebalance 的表格场景已避免从表格尾页内部继续异步单页传播；跨页表格父窗口同步完成后，从表格结束页之后继续传播或停止，修复三四页重复表格 fragment 的问题。
7. 表格窗口不再缓存页级 chunk 布局结果，避免父表格 fragment、td 子 chunk 和页 chunk 使用不同生命周期的缓存导致重复表格或旧 bounds。
8. 表格 chunk 同步不再回退到完整 `layoutElementList` 重建；当前仍使用局部 `patchLayoutStateWindow()` 替换受影响窗口，避免表格附近输入每次都扫描整篇布局元素。
9. 页数变化时会整体失效 base bitmap 缓存，避免新增 / 删除页后旧 bitmap 在点击、选区刷新或异步传播后覆盖新页面内容；失效只清缓存，不强制渲染所有页。
10. 大量复制到数百页时，已改为“首批快速响应 + 后台静默写入剩余批次 + 最后一轮完整 layout 收敛派生状态”的策略。页级 chunk 仍服务普通输入和小批粘贴，大粘贴不再依赖一页一页的异步传播链来修正 200 页后的 `pageRowList` / `positionList`。
11. 大粘贴判断从单纯 `payload.length` 改为按原始文本体量估算；单个超长文本元素也会进入异步分批，修复复制内容推到约 16 页时浏览器同步卡死的问题。
12. 单个超长文本元素在格式化前按原始字符串切片成小批次，不再首帧对整段文本执行 `splitText()` / `Intl.Segmenter`，避免粘贴开始阶段被全文 grapheme 分词卡住。
13. 后台批次按预先切好的批次推进，既限制元素数量，也限制单批原始文本量，防止后续队列重新把多个 500 字片段合并成大批同步格式化。
14. 后台静默批次只更新正文数据、范围和逻辑光标，不反复触发 chunk layout；最后一批统一触发完整 layout，保证最终 `layoutElementList`、`pageRowList`、`positionList` 和 chunk 索引一致。
15. 大粘贴最终完整 layout 前会清理页级异步 rebalance pending 队列，避免旧异步页窗口在完整布局之后继续写回过期页数据。
16. 已新增大粘贴后台事务对象：每次大粘贴都有独立事务 id、剩余批次、完成批次、启动时间、原始体量和计时器，后台批次通过事务 id 防止递归批次重新启动新事务。
17. `setValue()`、`appendElementList()` 和新的非事务输入会取消仍在后台推进的大粘贴事务，避免旧 timer 在文档替换或用户继续编辑后继续把过期批次写入新状态。
18. `Draw.getRenderBackendStats().asyncInsert` 已暴露大粘贴事务统计，包括 active、pendingBatchCount、completedBatchCount、rawWeight、elapsedMs、startedCount、completedCount、canceledCount、最近完成耗时和最大批次数。
19. 长文本分批已补充轻量 Unicode 边界修正：只检查切点附近，避免切开 UTF-16 surrogate pair、组合音标、变体选择符、零宽连接符、emoji 肤色修饰符、区域旗帜 regional indicator 组合和 tag sequence，不回退到全文 `Intl.Segmenter`。
20. `spliceElementList()` 外部直接删除 / 替换也会取消后台大粘贴事务；`insertElementList()` 内部批次通过内部锁跳过取消，避免后台事务被自身静默批次误取消。
21. `asyncInsert` 统计已补充最近取消事务的总批次数、已完成批次数和原始输入体量，便于判断用户打断发生在后台粘贴的哪个阶段。
