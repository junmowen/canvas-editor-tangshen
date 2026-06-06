# 2026-05-16 模块拆分与验证结果

已完成（续）：

22. 22. 新增 1000 页性能回归覆盖九类场景：普通大文档输入 / 粘贴 / 删除、2400 行复制生成大量页面后中间页完整、单个长文本元素扩展到 16 页以上不冻结、后台大粘贴未完成时 `setValue()` 取消旧事务且不污染新文档、后台大粘贴未完成时直接 `spliceElementList()` 取消旧事务、后台大粘贴未完成时继续输入取消旧事务且尾部旧批次不再写入、后台大粘贴未完成时 `getValue()` 先同步收敛再读取完整数据、后台大粘贴未完成时 undo 先同步收敛为完整历史记录再撤销、Unicode 组合字符 / 区域旗帜 / tag sequence 跨批次边界后仍保持完整。
23. 大粘贴后台事务队列已从“每批解构复制剩余数组”改为 `nextBatchIndex` 游标推进，避免批次数较多时产生额外 O(n²) 队列复制成本。
24. `getValue()`、`getOriginValue()`、`getValueAsync()`、`getHTML()`、`getText()`、`getDataURL()`、打印模式数据切换和 Ctrl+S 保存链路在读取文档前会同步 `flushAsyncInsertTransaction()`，避免保存、导出、打印或 HTML/Text 读取到半截后台粘贴数据。
25. 命令层 `executeUndo()` / `executeRedo()` 和键盘 Ctrl+Z / Ctrl+Y 会先同步收敛后台大粘贴事务，再进入历史栈；undo 不再撤到半提交状态，也不会留下旧 timer 继续写入。
26. 已开始拆分功能堆叠文件：`DrawMutationService` 只保留正文写操作编排，大粘贴分批 / Unicode 安全边界抽到 `DrawInsertBatcher`，后台事务状态机抽到 `AsyncInsertTransactionManager`，程序化连续输入合并抽到 `ProgrammaticTypingBatcher`。
27. `PageChunkRebalancePatcher` 的统计字段和队列统计汇总已抽到 `PageChunkRebalanceStats`；窗口大小、插入量估算、异步窗口和表格感知测量边界已抽到 `PageChunkWindowPlanner`；运行时 `rowList` / `pageRowList` / `positionList` / `layoutElementList` 写回、表格派生索引同步和窗口 chunk cache 已抽到 `PageChunkRuntimePatcher`。patcher 当前只保留窗口测量编排、异步传播决策和可见页刷新。
28. `TableCellChunkIndex` 已继续拆分：td row / hard-slice / table snapshot slice 构建抽到 `TableCellChunkBuilder`，版本、重建耗时、dirty 命中统计抽到 `TableCellChunkStats`；索引类只保留 rebuild、lookup、markDirty 和当前 td context 解析。
29. 页级 chunk rebalance 的表格感知窗口已修正：当当前窗口覆盖表格父范围时，测量结束索引不再按插入量估算截短，必须把旧窗口尾部表格逻辑元素纳入重新测量，避免“旧表格页被删除但新窗口没有表格 fragment”导致快照丢失和旧边框残留。
30. `TableChunkRangeIndex` 已拆分：fragment 父范围收集、td cell slice 范围收集和 child chunk 引用构建抽到 `TableChunkRangeBuilder`；版本、重建耗时、最近 lookup 命中信息抽到 `TableChunkRangeStats`；索引类只保留 rebuild、页码 lookup 表和对外查询 API。
31. `TableLocalRelayoutPipeline` 已拆成编排器：patch result、runtime range、measure result、stats 类型抽到 `TableLocalRelayoutTypes`；尝试次数、成功 / 失败计数、耗时和运行时范围扫描统计抽到 `TableLocalRelayoutStats`；当前表格命中、旧 fragment 范围解析和安全边界判断抽到 `TableLocalRelayoutTargetResolver`；单表 computeRowList、分页和坐标 normalize 抽到 `TableLocalRelayoutMeasurer`；runtime row / pageRow / layoutElement / position / 快照 / chunk 索引写回抽到 `TableLocalRelayoutRuntimePatcher`。pipeline 当前只保留“解析目标 -> 测量 -> 写回 -> 返回影响页”的编排。
32. `RowRenderer` 的表格绘制特例已拆出 `RowTableRenderHelper`：td 递归 payload 展开、表格单元格 clip/restore、跨行列选择按 cell bounds 渲染、later fragment 首行 top border 补绘、跨行列表格 range 延迟绘制队列都从主行渲染器移出。`RowRenderer` 当前保留行切片、普通 highlight / selection、逐元素绘制分发和行尾粒子 flush。
33. `PageRenderer` 已拆成页渲染调度器：base bitmap cache 延迟写入、版本校验、恢复和取消队列抽到 `PageBitmapCacheController`；输入态 chunk / line preview、局部测量、局部绘制和统计抽到 `TypingPreviewRenderer`；单页 base 内容绘制、浮动元素、清屏、页眉页脚、水印、搜索和行绘制顺序抽到 `PageContentPainter`。`PageRenderer` 当前保留 public facade、单页调度、lazy/immediate/visible 页遍历。
34. `DrawRenderFacadeService` 已继续拆分：局部 patch 后的 base / overlay bitmap 失效、表格迁移旧页清理和额外可见页重绘抽到 `DrawRenderSurfaceInvalidator`；chunk patch / line 回退 决策和 debug 日志抽到 `TypingPatchCoordinator`；表格输入的 td 子 chunk dirty 命中和当前逻辑表页码解析抽到 `TableTypingRenderHelper`；通用 image observer 清理、cursor 恢复、pageCount 更新、render pipeline 调用、history 提交和 postRenderEffects 调度抽到 `DrawRenderFinalizeService`。门面当前保留三条主流程编排：普通 render、主文档 typing、表格 typing。

验证结果：

1. `npm run type:check` 通过。
2. `npx cypress run --spec cypress/e2e/performance/thousand-pages-editing.cy.ts` 通过，当前覆盖 9 个浏览器级性能用例。
3. `npx cypress run --spec cypress/e2e/issues/issue-table-typing-chunk-isolation.cy.ts` 通过，当前覆盖 10 个表格输入、td 子 chunk 和正文推动表格移动后的旧边框清理用例。
4. 该 Cypress 运行中仍可能出现 Cypress 清理旧 screenshots 目录失败的 warning；该 warning 不影响测试退出码和用例结果。
