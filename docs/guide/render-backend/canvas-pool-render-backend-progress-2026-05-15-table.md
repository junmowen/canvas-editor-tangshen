# 2026-05-15 表格输入与父子 chunk 边界

已完成（续）：

15. 15. 表格单元格输入已从主文档页级 chunk 管线隔离：表格内的 `curIndex` 是 td 局部索引，不能命中主文档 `DocumentChunkIndex` 后再写回 `layoutElementList` / `pageRowList`，否则会把单元格文本扁平化为主文档普通段落并打散表格边框。`ChunkPatchGuard` 同步拒绝 `positionContext.isTable`，表格输入先进入表格专属路径。
16. 已新增 `TableCellChunkIndex` 作为表格单元格子 chunk 索引：父 chunk 仍是主文档页 / 表格 fragment，子 chunk 以逻辑 td 为独立索引空间，优先按 `td.rowList` 切分，超长行按固定阈值硬切片；表格输入后在最新完整布局结果上标记命中的 td 子 chunk，统计通过 `Draw.getRenderBackendStats().tableCellChunk` 暴露。
17. 表格输入当前已暂停 `TableCellChunkDistributor` 的手写 fragment 容量分发，原因是原非 chunk 表格分页本身正确，子 chunk 不应该重新发明“一页单元格能放多少内容”的并行算法。
18. 已新增 `TableLocalRelayoutPipeline`：当前表格输入会先尝试表格级局部重分页，定位当前逻辑表在 `pageRowList` / 表格快照中的 fragment 范围，复用原表格分页器重算该逻辑表，然后局部替换 runtime row、pageRowList、layoutElementList、positionList、表格快照和 `TableCellChunkIndex`。
19. `TableLocalRelayoutPipeline` 第一版只接管安全边界明确的尾部表格场景：表格 fragment 可从快照稳定定位、表格结束于旧页窗口尾部、逻辑表在 runtime rowList 尾部。安全边界不满足时仍回退完整 layout，保证分页正确性优先。
20. 带真实上方正文的表格暂不走 `TableLocalRelayoutPipeline`，因为这类场景必须由“页 chunk -> 表格 chunk -> tr/td chunk”同一个父子窗口一起重排，不能只重排表格自己。当前先回退完整 layout，避免出现父页下移但表格/td 子 chunk 未同步下移的变形。
21. 下一阶段表格优化方向继续扩大父子窗口重排：支持表格前后同页正文整体下移、多表连续页窗口、非尾部表格和复杂 rowspan / repeat header 组合；但仍必须复用原 `TableLayoutEngine` / `TableFragmentSplitter`，禁止继续扩展手写 td 容量估算。
22. `Position.setCursorLogicalIndex()` 已改为按当前编辑上下文读取 positionList：表格内使用 td 局部 positionList，避免把 td 局部索引误读成主文档第一页 position，修复点击表格后首次输入整篇文档跳回第一页的问题。
23. 页码绘制区域已纳入正文外边距计算，表格子 chunk 的页内安全底边同时避开正文底边、页脚实际区域和页码文本区域，避免局部撑开后覆盖“第 N 页/共 N 页”和页脚内容。
24. 表格单元格递归绘制已增加 td bounds 硬裁剪：即使局部 fragment 几何存在历史误差，文字、选区和高亮也不能画出当前单元格边界。该裁剪只是视觉安全网，不能替代表格分页正确性；分页正确性必须来自原表格分页器。
25. 页级 chunk rebalance 已向渲染层返回完整受影响页集合；父页 chunk 推动表格下移时，旧表格页和新表格页会一起失效、加入 visible 额外渲染队列并重绘，避免旧表格边框残留。
26. 表格旧边框残留已补充浏览器级像素测试：输入前读取旧边框深色像素，输入推动表格下移后再次采样旧位置，要求深色像素显著下降。
27. 表格所在页窗口的主文档输入当前走表格感知父子窗口 relayout；只有表格距离当前页超过窗口上限或无法用近邻窗口覆盖时，才保留完整 layout 正确性回退。后续继续收紧方向是把窗口上限从固定页数改成基于表格 fragment 数量和输入影响范围的动态预算。
