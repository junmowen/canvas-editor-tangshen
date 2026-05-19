# 迁移当前推进状态：输入、chunk 与表格

以下承接 [迁移当前推进状态：资源、surface、缓存、统计基座](./canvas-pool-render-backend-migration-status-foundation.md) 的 7.0 当前推进状态。

38. 38. `PageRenderer` 已将可视 base 页 bitmap 写入改为 160ms 按页延迟合并，连续输入时只保留最后一次 `createImageBitmap`，避免缓存 set/delete 抖动拖慢输入。
39. `CanvasPool` 默认空闲上限已收紧为全局 8、base / overlay 单层 2，减少多页滚动后大 canvas backing store 长期占用。
40. `RangeManager.getRangeParagraph()` / `getRangeRow()` 已增加 positionList 与 elementList 双边界校验，双击取词遇到表格分页逻辑索引或过期位置映射时返回 null，不再读取 `undefined.value`。
41. 输入、中文合成、删除、回车、剪切等高频编辑路径已标记 `isTyping`，统一走可视范围非 lazy 刷新，并在输入态 500ms 内禁止 base bitmap 写入，避免输入时反复 `createImageBitmap` 和重建 lazy observer。
42. `DrawMutationService.insertElementList()` 已接入输入态优化，粘贴和程序化批量插入同样走可视范围非 lazy 刷新与历史防抖，避免快速复制 / 粘贴在高页数文档下触发全页 lazy 重建。
43. `DrawRenderFacadeService` 已删除输入态 idle 整篇 layout 回放；连续输入、粘贴、删除不再每个字符同步执行整篇 `layoutPipeline.compute()`，也不再把整篇 layout 放到后台兜底。
44. `Position.setCursorLogicalIndex()` 已补齐输入态 chunk patch 前的逻辑光标索引同步，避免快速输入后立刻 Backspace / Delete / Enter / Cut 时继续读取旧 `cursorPosition.index`。
45. `DrawLayoutPipeline` 已新增布局阶段耗时统计，并通过 `getRenderBackendStats().layout` 暴露整篇布局总耗时、行布局、分页、位置列表、表格快照和高亮阶段耗时，用于继续拆解 1000 页输入后的后台重算瓶颈。
46. `CommandAdapt.backspace()` 已接入输入态可视刷新与逻辑光标同步，修复命令层快速删除每次都同步触发整篇 layout 的性能回退；收紧后的 1000 页性能用例要求 20 字输入、200 字粘贴、10 次删除均小于 500ms，且同步编辑窗口内 `layout.computeCount` 为 0。
47. 已新增 `DocumentChunkIndex`，把正文按自然段落和超长段落硬切片维护 chunk 索引；完整 layout 后重建页码覆盖，输入态只标记命中 chunk 及相邻 chunk，为段落级布局缓存、视口虚拟化和后台分页提供脏范围基础。
48. 已移除输入态 DOM 乐观预览层，避免 DOM 文本覆盖旧 canvas 导致叠字；输入态即时反馈改为 `PageRenderer.renderTypingChunkPreview()` 的 canvas chunk 真实局部重绘。正式写回主路径改为页级 chunk rebalance：当前页重新排版后，页尾多出的行进入下一页，当前页删除后的缺口由下一页开头行补回。
49. `Draw.getRenderBackendStats().typingPreview` 已暴露输入态局部重绘统计，包括尝试次数、chunk 命中、单行命中、失败次数和最近失败原因；1000 页性能用例已要求输入/粘贴/删除同步窗口内有真实 canvas 局部重绘命中。
50. `DocumentChunkIndex` 已增加 chunk 布局缓存，按 chunk、索引范围、页码、起点、宽度和内容签名缓存 rowList / positionList / 高度；`renderTypingChunkPreview()` 优先复用缓存，未命中才测量并写入，统计包含缓存数量、命中、未命中、写入、清理和命中率。
51. `DrawMutationService.spliceElementList()` 已将批量插入从逐元素 `splice` 改为分片批量插入，粘贴 200 字符在 1000 页性能用例中不再反复移动整篇元素数组，避免靠前位置粘贴产生同步长任务。
52. `ChunkLayoutPipeline` 已接管输入态首版局部布局写回，普通正文、单页内且高度不扩散的 chunk 会直接 patch `rowList` / `pageRowList` / `positionList`，点击别处时不再依赖整篇 layout 回放。
53. 输入态 idle 整篇回放已完全删除，不保留兜底；复杂页不再因为同页存在 separator / table / image 就提前拒绝页级 patch，而是交给 `PageChunkRebalancePatcher` 按页窗口重排。
54. chunk layout 已模块化：`ChunkPatchGuard` 负责安全边界和命中上下文，`PageChunkRebalancePatcher` 负责页级窗口重平衡，`ChunkLayoutMeasurer` / `ChunkRuntimePatcher` 保留给非页级 chunk，`ChunkLayoutStats` 负责统计，`ChunkLayoutPipeline` 只做编排，避免跨页、表格、分页传播能力继续堆在同一个文件里。
55. 表格输入已从“完整 layout 正确性兜底”继续推进到表格级局部重分页第一版：新增 `TableLocalRelayoutPipeline`，复用原 `TableLayoutEngine` / `TableFragmentSplitter` 重算受影响逻辑表，再替换运行时 table fragment 页窗口。旧 `TableCellChunkDistributor` 的手写单元格容量估算仍保持暂停，避免产生第二套分页规则。
56. 已补齐父子 chunk 一致性底线：页 chunk 窗口 rebalance 如果包含表格 fragment，必须同步推进表格快照版本，并重建 `TableCellChunkIndex`。td 子 chunk 现在优先来自分页后的 table slice，记录 `pageNo`、`fragmentTableId`、`fragmentTrId`、`fragmentTdId`，避免父页下移后子孙 chunk 仍指向旧页旧 bounds。
57. 页 chunk 窗口同步进一步收紧为“旧窗口或新窗口任一包含表格 fragment，都必须刷新表格子孙索引”。这样表格被父页窗口移出当前页时，也不会留下旧表格快照和旧 td bounds。
58. 表格输入回退完整 layout 时，会记录 layout 前后的逻辑表覆盖页，并失效/清理这些页的 base canvas，避免旧表格边框残留在旧页画布上。
59. 页级 chunk rebalance 已把旧窗口页和新窗口页作为 `affectedPageNoList` 返回渲染入口；正文输入推动表格整体下移时，渲染层会同时失效并重绘旧表格页和新表格页，避免父页 chunk 移动后旧边框线继续留在 base canvas。
60. 已新增浏览器级像素回归：构造“正文推动表格下移”场景，输入前采样旧表格顶部边框，输入后断言旧位置深色像素显著下降，直接覆盖用户反馈的“表格完整下移但旧边框线残留”问题。
61. 修正表格窗口正确性策略：同步页级 rebalance 不再固定 2 页，也不再遇到表格就整篇 layout；当前实现为表格感知父子窗口，普通文本仍 2 页，近邻存在表格时扩展到该逻辑表旧 fragment 结束页并多带 1 页承接溢出，最多 8 页。这样在同一事务里提交 page chunk、table fragment、td 子 chunk 和渲染清理，避免“父页 chunk 已移动，但表格 / tr / td 子孙 chunk 仍等异步传播”的中间态。
62. 表格迁移清理链路已覆盖 base、overlay 和表格工具 DOM；`TableTool.dispose()` 同步移除拖拽辅助线 `anchorLine`，避免非 canvas DOM 线条残留。
63. 已新增 `TableChunkRangeIndex`，把逻辑表的 `startPageNo`、`startRowNo`、`endPageNo`、`endRowNo`、全局行号、fragment 范围和 cell slice 子范围统一缓存为只读父子 chunk 索引。页 chunk 现在可以直接知道“表从哪页哪行开始，到哪页哪行结束”，不再靠输入时扫描整篇元素流临时判断。
64. 页级 rebalance 已改为读取 `TableChunkRangeIndex` 解析表格感知窗口，并删除“传播窗口后方存在表格就回退完整 layout”的整篇扫描兜底。普通大文档输入不会再因为远处有表格触发同步整篇判断；近邻表格则按父子窗口一次性提交 page/table/td 范围同步。
65. `Draw.getRenderBackendStats()` 已增加 `tableChunkRange` 统计，暴露表格父范围数量、fragment 范围数量、cell 子范围数量、最近构建耗时、构建原因和最近查询命中的表格页跨度，用于压测时确认父子 chunk 范围没有退化成整表/整篇重算。
