# 正文数据结构预研

### 14.5 第四阶段：正文数据结构预研

目标：为替换大数组正文做预研和适配层，不在没有可回滚方案前直接替换主链路。

状态：已完成本阶段收口。当前建立数组 store 适配层和 `shadow-write` mirror replay 验证，不切换主链路数据结构。

当前进度：

1. 已新增 `DocumentTextStore` 接口草案和 `ArrayDocumentTextStore` 数组适配实现。
2. `DrawRuntime` 已把正文主数组托管到数组 store，但 `getOriginalMainElementList()` 仍返回同一个数组引用，现有输入、布局、历史和导出链路不切换数据结构。
3. `Draw.getRenderBackendStats().documentTextStore` 已暴露当前 store 类型、版本、长度、操作次数、旧数组写入次数和最近操作窗口，用于后续 piece-table / rope mirror 对比。
4. `DrawMutationService.spliceElementList()` 已对主文档数组的外部写入记录 `external-splice`，只旁路统计，不接管删除规则、表格单元格或控件内部列表。
5. `resetRenderBackendStats()` 已同步重置 document text store 的观测计数和 mirror 快照计数，但不修改正文数据和当前版本。
6. 已新增只读 mirror 快照协议，当前先用数组抽样签名校验长度和代表性内容，后续 piece-table / rope mirror 可以替换签名来源并复用同一统计口径。
7. mirror 已从单纯快照推进到轻量 replay：store API 写入、外部插入、外部删除和整篇 `replace-all` 都会携带轻量签名，mirror 使用独立签名列表增量重放。
8. 旧数组删除已记录实际删除元素的原始索引和签名，保留现有删除规则不变，同时让 mirror 能校验并重放普通删除、选区删除以及删除规则过滤后的非连续删除。
9. 撤销 / 重做通过历史快照恢复整篇正文时，`replaceMainElementList()` 走 `replace-all` replay，mirror 不再只依赖快照刷新。
10. `documentTextStore` 统计已补充 `mirrorReplayCount`、`mirrorReplayMismatchCount`、`mirrorReplaySkippedCount` 和 `mirrorLastReplayReason`，用于区分已重放操作、重放不一致和快照回退。
11. 真实门诊模板压测已增加正文 store 长度一致性、外部写入统计、mirror 快照断言、普通输入 replay、大粘贴 replay、删除 replay、撤销 replay 和重做 replay 断言，确保数组适配层不改变文档主数据规模。
12. `documentTextStore` 已补 `mirrorMode = shadow-write` 和 `mirrorHealthy`，把 piece-table / rope 前置试点从“只读 replay 描述”收口为明确的旁路写入健康度信号。

实施顺序：

1. 已完成：新增 `DocumentTextStore` 接口草案，先适配当前数组实现，提供 `slice`、`splice`、`insert`、`delete`、`toElementList` 和版本号。
2. 已完成：在大粘贴事务和普通输入路径旁路记录操作日志，评估 piece-table / rope 所需 API 是否完整。
3. 已完成：做 `shadow-write` mirror。当前数组仍为真相，mirror 已能重放 store API 写入、外部插入、外部删除和整篇替换操作，普通输入、大粘贴、删除、撤销、重做路径均进入压测断言。
4. 本阶段不切换 piece-table / rope，也不接管所有输入写路径；下一阶段若继续正文数据结构替换，应把 piece-table / rope 替换为第二个 shadow mirror 实现，并以 `mirrorHealthy` 作为能否扩大写路径的准入条件。

验收标准：

1. 已验收：mirror 长度和抽样签名与当前数组输出一致，`mirrorReplayMismatchCount` 为 0。
2. 已验收：普通输入、大粘贴、删除、撤销、重做都能重放到 mirror，门诊模板压测断言 `mirrorReplaySkippedCount` 为 0。
3. 已验收：新 store 不改变数组引用语义，不破坏现有 `position.index`、chunk index 和历史栈恢复路径；当前所有主链路仍以原数组为真相。
4. 已验收：`mirrorMode` 固定为 `shadow-write`，`mirrorHealthy` 为 true，后续真实 piece-table / rope mirror 可以复用相同统计口径接入。
