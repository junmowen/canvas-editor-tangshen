# 大粘贴事务指标和用例补齐

### 14.3 第二阶段：大粘贴事务指标和用例补齐

目标：当前后台大粘贴已经能防卡死和保证读取前收敛，下一步要把事务状态、耗时和边界打断行为沉淀为稳定协议。

当前进度：

1. `asyncInsert` stats 已扩展事务状态、完成 / 取消 / flush / 失败原因、首批同步耗时、后台批次总耗时、最终 layout 耗时、最大单批耗时和最终页数。
2. 后台事务状态机已覆盖 `idle -> active -> flushing -> completed | canceled | failed`；后台批次、flush 批次和最终 layout 抛错都会记录 `failed` 并清理 timer。
3. `getValue()`、`getOriginValue()`、导出图片、打印、命令 undo / redo、键盘 undo / redo、搜索、HTML / Text 导出已透传 flush reason，便于定位读取前同步收敛来源。
4. `setValue()`、直接 `spliceElementList()`、继续普通插入、append 已记录不同 cancel reason，旧事务取消后不会继续写入新文档。
5. `thousand-pages-editing` 已补状态机和指标断言，覆盖大粘贴完成、getValue / search / HTML / Text / image export / save / undo / redo 前 flush、setValue / splice / typing 取消和 Unicode 边界。
6. 已补大粘贴同步回退统计：低于阈值、后台批次自身、表格上下文、控件上下文分别可观测；表格单元格和激活控件内大粘贴保持同步回退，不启动后台主文档事务。
7. 已补后台批次异常恢复用例：后台批次抛错后记录 `status = failed`、`lastErrorReason`，清空 active transaction / pending batch，并保留首批耗时指标。
8. 已补页眉 / 页脚大粘贴同步接管统计：非正文区域不会误启动后台主文档事务，分别记录 `headerSyncRecoveryCount`、`footerSyncRecoveryCount`。
9. 已补导出图片像素断言：导出前 flush 后，导出的页面不仅有页数，还必须包含正文墨迹像素。
10. 已补失败后恢复一致性：后台批次失败并恢复原插入入口后，继续输入和 `getValue()` 能读取一致数据。

第二阶段完成状态：

1. 后台大粘贴事务状态机、读取前 flush、取消、失败、同步回退和关键耗时指标已闭环。
2. 正文、表格单元格、控件、页眉、页脚的大粘贴策略均有可观测统计和回归用例。
3. 保存、搜索、HTML / Text / Image 导出、undo / redo 和 `getValue()` 都已验证读取前收敛完整数据。

实施顺序：

1. 扩展 `asyncInsert` stats：补首批同步耗时、后台总耗时、最终 layout 耗时、最大单任务耗时、最终页数、最后一次 flush 原因。
2. 明确后台事务状态机：`idle -> active -> flushing -> completed | canceled | failed`，并区分用户取消、文档替换取消、读取前 flush、undo/redo 前 flush。
3. 补浏览器用例：后台粘贴未完成时 redo、滚动到中间页、搜索、保存事件 payload、导出图片像素。
4. 补嵌套域用例：表格单元格、控件、页眉页脚内大粘贴。第一版明确这些路径保持同步回退，并有可观测统计。
5. 增加异常恢复策略：后台批次抛错时必须取消事务、清 timer、保留已提交数据一致性，并在 stats 中记录失败原因。

验收标准：

1. 后台粘贴任意时刻调用 `getValue()`、保存、导出、打印、undo、redo 都读取完整收敛数据。
2. 用户继续输入、`setValue()`、直接 `spliceElementList()` 后，旧事务不能再写入新文档。
3. 事务指标能判断卡顿发生在首批、后台批次还是最终 layout。
4. Unicode 边界用例继续通过，已覆盖复杂 ZWJ emoji、肤色修饰符、区域旗帜、tag sequence 和组合音标文本。
