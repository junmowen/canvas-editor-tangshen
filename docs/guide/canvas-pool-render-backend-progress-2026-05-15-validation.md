# 2026-05-15 验证结果与后续方向

验证结果：

1. `npm run type:check` 通过。
2. `npm run lint` 通过。
3. `npm run encoding:check` 通过。
4. Cypress 浏览器级测试通过：
   - `cypress/e2e/performance/thousand-pages-editing.cy.ts`
   - `cypress/e2e/performance/typing-click-flush.cy.ts`
   - `cypress/e2e/issues/issue-catalog-position-miss.cy.ts`
   - `cypress/e2e/editor.cy.ts`
   - `cypress/e2e/render-backend/canvas-render-backend.cy.ts`
5. 上述关键 Cypress 套件共 17 个浏览器级用例通过；其中 `typing-click-flush.cy.ts` 已覆盖输入后等待 bitmap 缓存窗口、点击别处、点回输入处，以及复杂页直接走页级 chunk rebalance 的像素可见性。
6. 新增浏览器级用例覆盖两类跨页传播：长插入跨多页 overflow、连续退格跨页 gap refill。两个用例都要求异步 rebalance 发生、队列最终清空、`layout.computeCount` 仍为 0、`position.index` 连续稳定。
7. 新增 `cypress/e2e/issues/issue-table-typing-chunk-isolation.cy.ts`，当前定位为表格输入原分页正确性基线：覆盖跨页表格单元格输入后表格元素和表格行仍存在、单元格文本不被扁平化写入主文档、主文档 chunk patch 不参与表格输入。
8. 表格专项用例保留 `tableCellChunk` 脏标记断言，用于确认 td 子 chunk 索引仍能记录命中范围；`TableCellChunkPipeline.patchSuccessCount` 不再作为目标，因为旧手写分发器已经停用。
9. `issue-table-typing-chunk-isolation.cy.ts` 已扩展到 8 个用例并通过，新增像素断言覆盖“正文输入推动表格下移后旧表格边框不残留”。
10. 本轮重新验证：`issue-table-typing-chunk-isolation.cy.ts` 8/8 通过，`thousand-pages-editing.cy.ts` 1/1 通过；无表格 1000 页输入仍保留 chunk 路径，近邻表格由父子窗口 patch 接管，不再默认整篇 layout。
9. 20+ 页尾部大表输入用例已要求命中 `tableLocalRelayout.patchSuccessCount` 且 `layout.computeCount = 0`，确认大表输入优先走表格级局部重分页而不是整篇 layout。
10. 新增父子 chunk 一致性回归：当表格上方存在真实正文时，局部表格重分页不接管，必须回退完整 layout，保证表格作为父页窗口的一部分自然整体下移，不允许只移动页 chunk 而保留旧表格/td 子 chunk 坐标。
11. 表格 fragment 边界回归：在第一页单元格 slice 尾部插入足够长文本，要求每个 fragment 的字符 `positionList` 都不越过对应单元格 bounds，防止文字穿出页脚或覆盖下一页页眉。
12. 表格退格回归：在第一页单元格 slice 内退格后，要求逻辑 td 文本减少、主文档 chunk patch 不参与、所有字符仍在单元格 bounds 内。
13. 尾页溢出追加 fragment 回归：在最后一个 cell slice 尾部插入长文本，要求逻辑 td 保留完整新增内容、`pageRowList.length` 增加、cell slice 数增加，并且新增 fragment 内字符仍不越界。
14. 非第一页表格输入光标回归：在 20+ 页表格 cell 的非第一页 fragment 内输入后，要求 `cursorPosition.pageNo` 保持在当前 fragment 页，防止输入代理 focus 把滚动位置带回第一页。
15. 表格 fragment 边界回归已增加页码/页脚安全区断言：所有受测 cell bounds 底边必须位于页码文本和页脚绘制区域之上。

后续方向：

1. 当前正文主数据仍是大数组，靠前位置逐字符插入的根本复杂度仍是 `Array.splice` 的尾部搬移。
2. 程序化连续输入合并只是短期收益，商业级长期方案应继续推进 piece-table / rope / chunk-local buffer，让编辑写入不再依赖整篇数组搬移。
3. chunk layout pipeline 需要继续保持模块化边界：guard、measure、runtime patch、stats、chunk index 不混写，避免后续分页传播、跨页 chunk 和表格 chunk 互相干扰。
4. 表格、页眉页脚、控件内部文本等嵌套编辑域必须拥有独立 chunk 域和独立索引空间；禁止把嵌套域局部索引用于主文档页级 chunk patch。
5. 下一步不再扩展 `TableCellChunkDistributor` 这类手写 fragment 分发器；继续做父子 chunk 窗口重排，让页 chunk、表格 chunk、tr/td chunk 在同一次布局结果里同步移动和失效，并把局部重分页内部耗时继续拆分到行布局、fragment 拆分、位置计算和快照重建四段。
