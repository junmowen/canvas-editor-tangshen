# 2026-05-16 阶段结束边界与后续专题

本阶段结束状态：

1. 三四页重复表格、旧表格边框残留、表格输入错误命中主文档 chunk、正文推动表格迁移后父子 chunk 不同步等问题，已经用表格感知页窗口、表格范围索引、td 子 chunk 索引、表格局部重分页和渲染 surface 清理组合修复。
2. 大粘贴浏览器卡死问题已经从同步首帧处理改为后台事务分批：首批快速响应，后台静默写入，读取 / 保存 / 导出 / undo / redo 前同步收敛，文档替换、直接 splice 和继续输入会取消旧事务。
3. 普通输入、小范围跨页 overflow / gap refill 继续走页级 chunk rebalance；表格附近输入走表格感知父子窗口；大范围复制不再依赖逐页异步传播链保证最终一致性。
4. 表格同步仍以原 `TableLayoutEngine` / `TableFragmentSplitter` 为唯一分页真相；旧 `TableCellChunkDistributor` 这类手写 td 容量估算不再继续扩展。
5. 核心堆叠文件已经完成阶段性拆分：
   - `DrawMutationService` 拆出 `DrawInsertBatcher`、`AsyncInsertTransactionManager`、`ProgrammaticTypingBatcher`。
   - `PageChunkRebalancePatcher` 拆出 `PageChunkRebalanceStats`、`PageChunkWindowPlanner`、`PageChunkRuntimePatcher`。
   - `TableCellChunkIndex` 拆出 `TableCellChunkBuilder`、`TableCellChunkStats`。
   - `TableChunkRangeIndex` 拆出 `TableChunkRangeBuilder`、`TableChunkRangeStats`。
   - `TableLocalRelayoutPipeline` 拆出 `TableLocalRelayoutTypes`、`TableLocalRelayoutStats`、`TableLocalRelayoutTargetResolver`、`TableLocalRelayoutMeasurer`、`TableLocalRelayoutRuntimePatcher`。
   - `RowRenderer` 拆出 `RowTableRenderHelper`。
   - `PageRenderer` 拆出 `PageBitmapCacheController`、`TypingPreviewRenderer`、`PageContentPainter`。
   - `DrawRenderFacadeService` 拆出 `DrawRenderSurfaceInvalidator`、`TypingPatchCoordinator`、`TableTypingRenderHelper`、`DrawRenderFinalizeService`。
6. 本阶段的正确性和性能基线以浏览器回归为准：`issue-table-typing-chunk-isolation.cy.ts` 当前 10 个表格专项用例通过，`thousand-pages-editing.cy.ts` 当前 9 个大文档 / 大粘贴用例通过，`npm run type:check` 通过。
7. Cypress 在 Windows 上偶发 screenshots 目录清理 warning，当前不影响退出码和测试结果；后续可以单独治理测试产物清理策略。

本阶段不再继续追加的内容：

1. 不在本阶段替换正文主数据结构。当前正文仍是大数组，靠前插入仍有 `Array.splice` 尾部搬移成本；piece-table、rope 或 chunk-local buffer 进入后续独立数据结构专题。
2. 不在本阶段把大粘贴最终完整 layout 改成可让步增量 layout。当前最后一轮完整 layout 作为正确性收敛点保留；增量分页 / worker 分页进入后续独立排版调度专题。
3. 不在本阶段把页级 rebalance 升级为完整 dirty page range planner。当前近邻窗口服务普通输入和小范围跨页搬移，大范围复制由后台事务和最终完整 layout 收敛；确定性 dirty range planner 进入后续独立算法专题。
4. 不在本阶段继续扩大表格局部重分页安全边界。当前非尾部表格、多表连续、复杂 rowspan、repeat header、表格前后同页正文组合仍允许回退完整 layout；后续再按真实模板逐项扩展。
5. 不在本阶段接入 OffscreenCanvas worker、WebGL 图片管线或 DOM / SVG block 主链。当前这些仍是 capability / engine 占位，后续进入渲染引擎专题。
6. 不在本阶段继续拆分 `DrawRenderFacadeService` 三条主流程或 `RowRenderer` 普通元素 dispatcher。主要互相影响的表格、页渲染、surface、patch 决策和统计职责已经拆出；剩余拆分可在后续低风险重构中继续推进。

后续独立专题：

1. **正文数据结构专题**：设计 piece-table / rope / chunk-local buffer，目标是让靠前编辑不再依赖整篇数组搬移。
2. **dirty page range planner 专题**：把页级 rebalance 的“边界变化后传播下一页”升级为“按编辑影响范围生成确定性 dirty page range”。
3. **大粘贴事务专题**：补切换编辑域、异常恢复、重做、搜索、导出图片像素、保存事件 payload 和产品反馈策略；补首批同步耗时、后台总耗时、最终 layout 耗时、最大单任务耗时、批次数、原始体量、最终页数和 pending 时长指标。
4. **Unicode 分批专题**：扩展复杂 ZWJ emoji、非拉丁组合文字、输入法组合文本、中英文混排和换行边界用例，确认分批格式化结果和一次性格式化一致。
5. **嵌套编辑域专题**：确认表格单元格、控件、页眉页脚、批注 / 区域的大粘贴策略，是复用后台事务、局部事务，还是保持同步回退。
6. **真实模板压测专题**：使用包含水印、页眉页脚、页码、跨页表格、控件、图片和长段落的门诊病历模板，验证当前算法在业务模板上的稳定性和缓存回落。
7. **渲染引擎专题**：接入 OffscreenCanvas worker 绘制、WebGL 图片预览 / 缩放、DOM / SVG block 调度，并补可视化 debug 面板展示每页 engine、bitmap 命中、chunk dirty、异步队列和后台粘贴进度。

结论：

本轮 “chunk 算法抽离、表格同步与大粘贴防卡死” 到此阶段性结束。当前代码已经从“功能继续堆在大文件里”收敛为多个可独立维护的算法、索引、运行时写回、渲染 helper 和事务模块；后续工作不再继续在本节追加，而应按上面的独立专题分别立项推进。
