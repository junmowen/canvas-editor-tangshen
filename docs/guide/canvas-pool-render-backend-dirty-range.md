# Dirty Page Range Planner

### 14.1 推进原则

1. **先补可观测性，再改核心算法**：dirty range、后台事务和渲染缓存都必须先有指标，否则无法判断优化是否真的减少同步长任务。
2. **先固定业务基线，再扩大能力边界**：必须先使用真实门诊病历模板验证水印、页眉页脚、页码、跨页表格、控件和长段落组合，再扩大表格局部重分页安全边界。
3. **先局部替换，再替换底层结构**：正文主数据结构仍是大数组，不能直接大规模切换为 piece-table / rope；应先加适配层和双写 / 对比能力。
4. **保持单一布局真相**：表格仍以 `TableLayoutEngine` / `TableFragmentSplitter` 为唯一分页真相；任何表格 chunk 优化只能复用这套结果，不能重新实现 td 容量估算。
5. **每个专题必须可回滚**：新增 planner、事务指标或 worker 绘制入口都要有开关、统计和回退路径，避免把性能优化变成正确性风险。

### 14.2 第一阶段：dirty page range planner

目标：替代页级 rebalance 的“边界变化后传播下一页”经验式推进，让输入影响范围变成可解释、可统计、可测试的 page range。

当前进度：

1. 已新增 `DirtyPageRangePlanner`，按页级 rebalance 上下文、窗口测量结果和 `TableChunkRangeIndex` 旁路输出 dirty range。
2. 已接入 `PageChunkRebalancePatcher` debug 日志和 `chunkLayout` stats，记录最近 range、最大 range、原因、表格范围命中和 planner 未覆盖实际影响页次数。
3. 已补 `dirtyRangeLastMissingActualPageNoList`、实际影响页起止等诊断字段，用于接管前定位 planner 漏页。
4. 已修复表格迁移时 dirty range 被旧页数裁剪的问题；planner 现在允许覆盖 rebalance 已知的新增 / 迁移页。
5. 已让 planner 接管普通页级 rebalance 的异步传播起点：当 dirty range 覆盖实际影响页时，从 `dirtyRangePlan.endPageNo + 1` 继续传播，避免重复调度已经覆盖的窗口。
6. 已保留回退路径：如果 planner 输出没有覆盖 `affectedPageNoList`，立即回退旧的尾页边界传播起点，并记录 `dirtyRangeScheduleFallbackCount`。
7. 已通过 overflow / gap refill 回归断言，确认 `dirtyRangeMissActualCount = 0`、`dirtyRangeScheduleTakeoverCount > 0`，普通文本跨页传播不再依赖经验式起点。
8. 已通过表格输入 chunk 隔离回归和 1000 页编辑性能回归，确认 planner 接管后没有引入重复表格、旧边框残留或同步性能退化。

第一阶段完成状态：

1. dirty range planner 已从旁路统计推进到异步传播起点接管。
2. overflow / gap refill / 表格推动下移均已有回归覆盖，planner 不能漏实际影响页。
3. 回退统计已接入 stats，后续真实模板压测如果出现漏页，可以直接定位是 planner 输出还是运行时写回问题。

实施顺序：

1. 新增 `DirtyPageRangePlanner`，输入为编辑锚点、插入 / 删除数量、当前页 chunk、表格范围索引和旧页数，输出为 `{ startPageNo, endPageNo, reason, includesTableRange }`。
2. 先只在 debug / stats 中旁路计算，不参与真实写回；记录 planner 输出和当前 `PageChunkRebalancePatcher` 实际影响页集合的差异。
3. 当差异稳定后，让普通文本输入继续走现有页级 rebalance，但异步传播起点改由 planner 输出，而不是只看尾页边界变化。
4. 表格附近输入使用 `TableChunkRangeIndex` 扩大 range：窗口必须覆盖旧表格父范围、承接页和表格后首个正文页。
5. 大粘贴仍保留后台事务 + 最终完整 layout 收敛，不纳入 planner 第一版，避免一次性扩大风险面。

验收标准：

1. 普通 1000 页输入、粘贴、删除仍保持局部路径；大粘贴单独走后台事务和最终完整 layout 收敛。
2. 跨页 overflow / gap refill 用例中，planner 输出 range 覆盖最终受影响页集合，并接管异步传播起点。
3. 表格推动下移用例中，planner 输出 range 覆盖旧表格页、新表格页和承接页。
4. `getRenderBackendStats()` 已增加 dirty range 统计：最近 range、最大 range、planner 与实际影响页差异、表格 range 命中次数、接管次数和回退次数。
