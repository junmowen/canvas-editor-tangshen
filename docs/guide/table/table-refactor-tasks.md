# 表格与分页系统重构开发任务清单

> 关联设计文档：
> [table-refactor-plan.md](./table-refactor-plan.md)

本文档用于把重构方案拆成可执行的开发待办。  
默认前提：

- 允许破坏性更新
- 不保留过渡链路双轨
- 完成一个阶段后，旧补丁逻辑必须物理删除

---

## 阶段总览

| 阶段 | 目标 | 产出 | 优先级 |
| --- | --- | --- | --- |
| 阶段 0 | 建立基线与约束 | 回归矩阵、重构开关策略、风险清单 | P0 |
| 阶段 1 | 统一选区语义 | `SelectionSnapshot` / `SelectionProjectionService` | P0 |
| 阶段 2 | 拆分命中测试 | `TableHitTestService` | P0 |
| 阶段 3 | 拆分导航规则 | `TableNavigationService` | P0 |
| 阶段 4 | 布局快照化 | `TableLayoutSnapshot` / builder | P1 |
| 阶段 5 | 渲染与性能优化 | overlay 渲染、增量刷新 | P1 |
| 阶段 6 | 过渡链路删除与收口 | 删除补丁、清理重复逻辑 | P0 |

---

## 当前状态总览

截至 `2026-04-25`，当前阶段状态应按下面理解，而不再按历史周计划阅读：

| 阶段 | 当前状态 | 判断 |
| --- | --- | --- |
| 阶段 0 | 已完成 | 回归矩阵、固定白名单与删除约束已独立文档化。 |
| 阶段 1 | 已完成 | 统一选区投影主链已真实落地。 |
| 阶段 2 | 已完成 | 表格命中已收口到 `TableHitTestService` 单入口。 |
| 阶段 3 | 已完成 | 导航规则已集中到 `TableNavigationService` 并进入真实主链。 |
| 阶段 4 | 已完成 | snapshot builder / accessor / 关键索引都已进入真实主链并服务命中/导航/渲染。 |
| 阶段 5 | 已完成 | overlay、dirty、visible-only、overlay-only 和离屏导出已全部落地。 |
| 阶段 6 | 已完成 | 当前阶段定义下的过渡链路删除与主链收口任务已完成，后续仅剩持续优化。 |

### 当前阶段收束结论

- 当前阶段的目标已经达成：表格命中、导航、选区投影、分页渲染与事件主链都已经收口到单主链。
- 现阶段剩余事项更适合作为下一轮持续优化：
  - 继续按需压平 `Position.getPositionByXY()`、`CommandAdapt.getRangeContext()`、`RowRenderer` 等热点大方法内部层级。
  - 把固定回归集合进一步文档化成独立白名单。
  - 对少数仍然存在的历史命名或过渡公开面做温和收尾，而不是再以“阶段阻塞项”处理。

### 本轮新增完成项

- selection-start 域里的 `resolveExistingCaretAnchorIndex.ts` 与 `resolvePointerMouseDownIndex.ts` 已物理删除。
- `resolveSelectionStartState.ts` 与 `resolveTableSelectionStartState.ts` 现在直接承接 existing-caret anchor 与 pointer mousedown index 计算，不再额外跳转到单用 helper 文件。
- `Position.getSelectionPositionList()` 这层只剩单一调用方的公开薄壳也已物理删除，`CommandAdapt.getRangeContext()` 改为直接消费 `RangeManager.getSelectionContentRange()` 与 `position.getPositionList()`。
- `Control.getRange()` 这层只转发 `getEditBoundaryRange()` 的旧壳也已物理删除，控件域内部调用已切到显式编辑边界接口。
- `CommandAdapt` 内部 `getActivePublicStartIndex()/getActivePublicEndIndex()` 这两层私有薄壳也已物理删除，相关调用点已直接读取 `getActivePublicRange()` 的字段。
- `CommandAdapt.getActivePublicRange()/getActiveEditBoundaryRange()` 这两层私有 range 转发壳也已物理删除，相关内部调用点已直接消费公开 `getRange()` 或 `range.getEditBoundaryRange()`。
- `Draw` 中 `RowRenderer` 与 `PageRenderer` 已提升为 draw 级成员复用，`drawRow()/drawSelection()` 与分页渲染主链不再重复临时 `new` 渲染器对象。
- `Draw.drawRow()/drawSelection()` 这两层仅转发到 `RowRenderer` 单例的包装层也已物理删除，相关调用点已直接切到 `draw.getRowRenderer()`。
- `Control.getContainer()/getPosition()/getPreY()` 这三层只服务 popup / picker 宿主定位的包装接口也已物理删除，`SelectControl` 与 `DateControl` 已直接走 `control.getDraw()` 读取真实宿主对象。
- `Control.getElementList()` 这层跨域包装接口也已物理删除，`Control` 本体与 `CheckboxControl / RadioControl / TextControl / SelectControl / DateControl` 已统一直接消费 `draw.getObjectResolver().getElementList()` 或 `control.getDraw().getObjectResolver().getElementList()`。
- `Control.getEditBoundaryRange()` 这层控件域编辑边界转发壳也已物理删除，`Control` 本体与 `CheckboxControl / RadioControl / TextControl / SelectControl / DateControl` 已统一直接消费真实 `draw.getRange().getEditBoundaryRange()`。
- `RowRenderer` 内部 selection / 正文绘制中重复的 table 子单元格递归遍历也已并到同一条 `forEachTableCellPayload()` 路径，tableCellContext 组装不再维护两份。
- 对应 `npm run type:check`、`npm run lint` 与固定 `table-selection-nonpaged / table-pagination-input / table-pagination-merged / table-pagination-mock` 47 条回归再次单次全绿。

### 当前验证基线

- `npm run type:check`
- `npm run lint`
- `cypress/e2e/table/table-selection-nonpaged.cy.ts`
- `cypress/e2e/table/table-pagination-input.cy.ts`
- `cypress/e2e/table/table-pagination-merged.cy.ts`
- `cypress/e2e/table/table-pagination-mock.cy.ts`
- `cypress/e2e/table/table-pagination-multicell.cy.ts`
- `cypress/e2e/table/table-pagination-border.cy.ts`
- `cypress/e2e/table/table-pagination-adjacent-cell.cy.ts`
- `cypress/e2e/table/table-pagination-empty-last-row.cy.ts`

其中固定核心基线 `table-selection-nonpaged / table-pagination-input / table-pagination-merged / table-pagination-mock` 当前已重新确认 `57 / 57` 全绿。

---

## 阶段 0：建立基线与约束

### 目标

冻结现有正确行为，防止重构过程中“感觉没问题、实际上回归”。

### 待办

- [ ] 建立表格交互回归矩阵文档
- [ ] 明确必须通过的用例集合
- [ ] 标记允许临时波动的非核心行为
- [ ] 建立重构期间的文件改动白名单
- [ ] 明确过渡链路删除策略，禁止双轨长期共存

### 重点文件

- [table-refactor-plan.md](./table-refactor-plan.md)
- `table-pagination-input.cy.ts`
- `table-pagination-merged.cy.ts`
- `table-pagination-mock.cy.ts`

### 验收标准

- 核心分页表格回归用例列表固定
- 每个阶段结束后都能重复执行同一组验证

---

## 阶段 1：统一选区语义

### 目标

建立单一选区内部表示，消除 `RangeManager / CommandAdapt / RowRenderer` 三套语义并存。

### 新增模块

- `TableSelectionSnapshot.ts`
- `TableSelectionProjectionService.ts`

### 待办

- [ ] 定义 `SelectionBoundary`
- [ ] 定义 `SelectionSnapshot`
- [ ] 定义 `SelectionContentRange`
- [ ] 定义 `SelectionRenderRange`
- [ ] 定义 `SelectionPublicRange`
- [ ] 把 `RangeManager` 改成只持有 snapshot，不再解释 raw range
- [ ] 把 `getSelectionContentRange()` 下沉为 projection service 输出
- [ ] 把 `getRenderSelectionRange()` 下沉为 projection service 输出
- [ ] 把 `getPublicRange()` 下沉为 projection service 输出
- [ ] 把 `getPublicCursorPosition()` 下沉为 projection service 输出
- [x] 删除 `CommandAdapt` 中重复的 range/cursor 归一化逻辑
- [ ] 删除 `RowRenderer` 中对 raw range 的二次解释逻辑

### 当前迁移目标文件

- `RangeManager.ts`
- `CommandAdapt.ts`
- `RowRenderer.ts`
- `resolveSelectionContent.ts`

### 验收标准

- 复制、高亮、公开 `getRange()`、公开 `getCursorPosition()` 使用同一套投影结果
- 任何字符边界问题都能只在 selection projection 中定位

---

## 阶段 2：拆分命中测试

### 目标

把“页面坐标命中边界”从 `Position` 中彻底抽离，做到纯函数化、无副作用。

### 新增模块

- `TableHitTestService.ts`
- `TableHitTestTypes.ts`

### 待办

- [ ] 定义 `HitTestRequest`
- [ ] 定义 `HitTestResult`
- [ ] 定义 `HitBoundaryResult`
- [ ] 从 `Position.getPositionByXY()` 抽出表格命中逻辑
- [ ] 从 `resolveTableCellPositionByPagePoint()` 抽出字符盒命中逻辑
- [ ] 从 `resolveSelectionPointerPosition()` 去掉 fragment 特判补丁
- [ ] 从 `resolveSelectionBoundaryByPoint()` 改成调用 hit-test service
- [ ] 禁止 hit-test service 写 `positionContext`
- [ ] 禁止 hit-test service 直接改 cursor

### 当前进展

- `2026-04-16`：`resolveSelectionPointerPosition()` 中的分页 fragment / 空白单元格修正逻辑已下沉到 `TableHitTestService.resolvePointerPosition()`。
- `2026-04-16`：`resolveSelectionStartState()` 已改为优先复用 `TableHitTestService` 的表格命中结果，不再单独维护一套 cell-area override 补丁。
- `2026-04-16`：分页输入表格与 merged 分页表格 Cypress 回归已重新通过，可作为当前阶段继续推进的基线。
- `2026-04-16`：补齐了 collapsed caret 再拖选时的 anchor 复用，覆盖 non-paged / paged / merged 三类 existing-caret 拖选回归。
- `2026-04-17`：`click / mousemove / mouseup` 已直接调用 `TableHitTestService.resolve()`，`resolveSelectionBoundaryByPoint.ts` 空转发 wrapper 已物理删除，事件层不再保留额外一层命中转发。

### 当前迁移目标文件

- `Position.ts`
- `TableHitTestService.ts`
- `resolveSelectionPointerPosition.ts`
- `TableHitTestService.ts`

### 验收标准

- 点击命中逻辑与拖选命中逻辑共用同一服务
- later fragment 起点、merged、empty cell 的命中规则在一个地方维护

---

## 阶段 3：拆分导航规则

### 目标

把所有键盘导航和边界跳转规则统一到一个模块中，删除散落在 handler 中的 fragment 分支。

### 新增模块

- `TableNavigationService.ts`
- `TableNavigationTypes.ts`

### 待办

- [ ] 定义 `NavigationRequest`
- [ ] 定义 `NavigationResult`
- [ ] 统一 left / right
- [ ] 统一 up / down
- [ ] 统一 delete / backspace
- [ ] 统一 later fragment start 边界跳转
- [ ] 统一 merged cell 边界跳转
- [ ] 删除 keydown handler 中的表格专用推断逻辑

### 当前迁移目标文件

- `KeyboardNavigationIntent.ts`
- `VerticalNavigationIntent.ts`
- `DeleteIntent.ts`
- `BackspaceIntent.ts`
- `horizontalMove.ts`

### 当前进展

- `2026-04-17`：表格内 `up/down` 的边界导航、跨 fragment 跳转、跳出表格逻辑已下沉到 `TableNavigationService.resolveVerticalNavigation()`。
- `2026-04-17`：分页表格边界 `backspace` 的上一片段 / 上一页单元格跳转已下沉到 `TableNavigationService.resolveBackspaceNavigation()`。
- `2026-04-17`：`left/right` 在文档与表格边界上的切换判断已下沉到 `TableNavigationService.resolveHorizontalBoundaryNavigation()`，`delete` 的 fragment 后跳也已收口为导航服务接口。
- `2026-04-17`：正文 `up/down` 移动后进入表格单元格的规则已下沉到 `TableNavigationService.resolveVerticalEntryNavigation()`。
- `2026-04-17`：分页输入表格主回归已重新通过，可继续推进 `left/right/delete` 的进一步收口。

### 验收标准

- later fragment 起点左右上下 delete/backspace 行为统一
- 任何键盘问题不再需要同时改多个 handler

---

## 阶段 4：布局快照化

### 目标

把逻辑表格、布局结果、分页 fragment 的关系固定到只读快照中，运行期不再反复拼装。

### 新增模块

- `TableLayoutSnapshot.ts`
- `TableLayoutSnapshotBuilder.ts`

### 待办

- [ ] 定义逻辑单元格唯一键
- [ ] 定义 fragment slice 数据结构
- [ ] 定义 page -> fragment 索引
- [ ] 定义 logical cell -> slices 映射
- [ ] 定义 absolute boundary -> slice 映射
- [ ] 用 snapshot builder 替代散落在 paging/layout 中的临时推导
- [ ] 让 hit-test / navigation / render 全部只读 snapshot

### 当前迁移目标文件

- `TableFragmentFacade.ts`
- `TableFragmentRegistryAccessor.ts`
- `TableFragmentRegistry.ts`
- `TableLayoutEngine.ts`
- `TableFragmentSplitter.ts`

### 当前进展

- `2026-04-17`：快照已补充 `page -> table fragment positions` 索引，用于按页命中表格 fragment。
- `2026-04-17`：快照已补充 `fragmentTableId -> logicalTableId` 映射，减少运行期对 `sliceList` 的线性查找。
- `2026-04-17`：快照已补充 `logicalTableId -> logicalTableIndex` 映射，并用于 `CommandAdapt / RangeManager` 的表格索引定位。
- `2026-04-17`：快照已补充 `cellKey -> sliceStartIndexes` 索引，并用于 `CommandAdapt / RangeManager` 的当前 slice 定位。
- `2026-04-17`：快照已补充 `logical cell + fragment tr/td -> slice` 别名索引，用于消除 `resolveSliceByPositionContext()` / `resolveSliceByFragmentContext()` 中的备用线性查找。
- `2026-04-17`：快照已补充 `logical cell + pageNo -> slice` 索引，并用于 `RangeManager` 的当前 fragment 备用定位。
- `2026-04-17`：快照已补充 fragment 单元格边界索引，`resolveTableCellPositionByPagePoint()` 不再遍历 fragment 的 `tr/td` 二维结构。
- `2026-04-17`：`resolveTableCellPositionByPagePoint()` 已切到 snapshot 页级 fragment 索引，不再全量扫描 `getMainPositionList()`。
- `2026-04-17`：slice 已补充 `rowBands / firstVisibleOffset` 元数据，`resolveTableCellPositionByPagePoint()` 已改为先缩到当前 row band 再找字符盒。
- `2026-04-17`：`PageRenderer` 已先切当前页 `positionList`，`RowRenderer` 不再重复执行 `positionList.filter(pageNo)`。
- `2026-04-17`：`Position` 已补充 `pageNo + index -> position` 查找缓存，并用于 `resolveSelectionStartState()` 的 existing-caret 邻位查询与 `getPositionByXY()` 的控件定位。
- `2026-04-17`：`Position.getPositionByXY()` 主命中分支已改为先按 `y` 定位当前页 row band，再只扫描该行的 positions。
- `2026-04-17`：`Position.getPositionByXY()` 的页内兜底已统一基于 `pageRowBands`，不再依赖 `lastLetterList` 推断末行边界。
- `2026-04-17`：`Position.getPositionByXY()` 已重组为更明确的 `页内直接命中 / 页内行内兜底 / 页边界兜底` 三段式主流程，便于后续继续替换主链扫描点。
- `2026-04-17`：`Position.getPositionByXY()` 已使用 `pageRowBands` 做二分式 active row band 定位，主命中不再线性查找当前行带。
- `2026-04-17`：双击选词已改为优先使用 `hitTargetIndex` 定位真实命中字符，避免表格场景下误落到边界索引。
- `2026-04-17`：`TableHitTestService.resolveTableElementHit()` 已改为优先复用 `resolveTableCellPositionByPagePoint()` 的 snapshot 命中结果，`Position -> table` 主入口不再先走旧的 `tr/td/positionList` 递归扫描。
- `2026-04-17`：`TableHitTestService.resolveTableElementHit()` 中残留的 `td.positionList` / `lastLetterList` 备用扫描已删除，表格元素主命中链已只读 snapshot 命中结果。
- `2026-04-17`：`TableHitTestService.resolvePointerPosition()` 已改为 `table-first` 单路由，先走 snapshot 表格命中，再回退正文 `getPositionByXY()`，不再先取正文命中结果再用 `cellAreaPosition` 覆盖。
- `2026-04-17`：`resolveSelectionStartState()` 中表格专用的起点推导已抽到 `table/selection/resolveTableSelectionStartState.ts`，event utils 只保留 existing-caret 锚点与非表格分支。
- `2026-04-17`：`resolveSelectionStartState()` 中 existing-caret anchor helper 已抽到 `event/utils/resolveExistingCaretAnchorIndex.ts`，event utils 不再内嵌 merged/slice 约束计算。
- `2026-04-17`：selection start 剩余的“左右半区决定 `mouseDownIndex`”逻辑已抽为 `event/utils/resolvePointerMouseDownIndex.ts`，`resolveSelectionStartState.ts` 与 `resolveTableSelectionStartState.ts` 进一步退化为编排层。
- `2026-04-17`：`Position` 中已删除未再被主链消费的 `pageCursorIndexes / rowStart / rowCursorRange / lastLetter` 缓存及其公开 API，避免旧快取分支继续长期滞留。
- `2026-04-17`：nonpaged selection、pagination-input、merged、adjacent-cell、empty-last-row 回归均重新通过，可继续推进更多 snapshot 化替换与过渡链路删除。

### 验收标准

- 运行期不再依赖多处 `find/filter` 重新推导 fragment 关系
- hit-test、navigation、render 的输入统一为 snapshot

---

## 阶段 5：渲染与性能优化

### 目标

让拖选、光标移动、局部高亮走局部刷新，不再动辄全量 render。

### 新增模块

- `TableOverlayRenderer.ts`
- `RenderInvalidationManager.ts`

### 待办

- [x] 拆分 base canvas 与 overlay canvas
- [x] 选区高亮迁移到 overlay
- [x] 光标迁移到 overlay
- [x] table tool 迁移到 overlay
- [x] 拖选时只刷新相关页 overlay
- [x] 可见页渲染和全量页渲染分离
- [x] 引入 dirty 标记：
  - [x] layout dirty
  - [x] selection dirty
  - [x] overlay dirty
  - [x] visible pages dirty

### 当前迁移目标文件

- `Draw.ts`
- `PageRenderer.ts`
- `RowRenderer.ts`
- `RenderInvalidationManager.ts`
- `mousemove.ts`
- `mouseup.ts`

### 当前进展

- `2026-04-18`：`Draw.render()` 已补出显式 `pageRenderScope`，并接通 `PageRenderer.renderVisiblePages()`；分页模式下高频局部刷新路径已可以只重绘可见页与活动页，不再一律走全量页面立即重绘。
- `2026-04-18`：`dblclick / threeClick / mousemove / mouseup` 这组高频选区更新链路已切到 `pageRenderScope: 'visible'`，在不重算布局的前提下优先走可见页重绘。
- `2026-04-18`：分页页包装与 overlay canvas / ctx 基础设施已落地，`Draw / PageRenderer / RowRenderer` 已具备后续接入每页双层画布的代码基础；当前为保证主链稳定，选区高亮仍暂留 base canvas，overlay 尚未正式接入交互主链。
- `2026-04-18`：`npm run type:check`、`npm run lint` 与 `table-selection-nonpaged / table-pagination-input / table-pagination-merged / table-pagination-mock` 固定回归均已通过。
- `2026-04-18`：`left / right / updown / mousedown` 这组高频光标移动与点击落点路径也已切到 `pageRenderScope: 'visible'`，分页模式下的局部无布局重算刷新范围进一步收窄。
- `2026-04-18`：`selectAll`、checkbox/radio、group、高频表格行列选中以及 `tableTdBackgroundColor()/tableSelectAll()` 这组纯局部无布局重算操作也已切到 `pageRenderScope: 'visible'`，阶段 5 的 visible-only 主链覆盖面继续扩大。
- `2026-04-18`：命令层中无选区默认样式/超链接局部更新等 `isCompute: false` 分支也已接入 `pageRenderScope: 'visible'`，分页局部刷新已从事件链继续扩展到一批纯局部命令入口。
- `2026-04-18`：`setRange()/focus()/locationArea()/locationGroup()/locationControl()` 与 `Control.repaintControl()/initNextControl()` 这组纯局部定位/控件刷新路径也已切到 `pageRenderScope: 'visible'`，visible-only 刷新已经覆盖到命令层和控件层的局部定位主链。
- `2026-04-19`：命令层里更多 `isCompute: false` 的纯局部定位/样式分支也已接入 `pageRenderScope: 'visible'`，分页 visible-only 刷新覆盖面继续从控件层扩展回命令层的局部命令链。
- `2026-04-19`：`GlobalEvent` 可见性恢复、`mouseup` 无重排拖放回绘、`Zone/Area/ImageParticle` 的局部刷新，以及 badge 与表格边框色这组纯局部命令也已切到 `pageRenderScope: 'visible'`；目前保留全量刷新的主要只剩背景/水印、搜索导航、导出等天然全局路径。
- `2026-04-19`：`Draw.scheduleFrameRender()` 已升级为真正的帧级调度器，会对 `visible-only + 无布局重算` 的高频刷新做 RAF 合并，并在 `mouseup` / 滚动可见页刷新时同步 flush pending render；阶段 5 已开始从“覆盖更多局部入口”走向“为后续 dirty/invalidation 收口预留统一调度点”。
- `2026-04-20`：`RenderInvalidationManager.ts` 已正式落地，当前先接管 `visible pages dirty` 与 `scheduleFrameRender()/flushScheduledFrameRender()` 这条调度主链；`Draw` 已不再内联维护这组状态，后续剩余的 `layout/selection/overlay dirty` 可以继续沿同一模块扩展。
- `2026-04-20`：`TableOverlayRenderer.ts` 已正式接入 `PageRenderer`，当前已接管 overlay 页清理与 `selectionCtx` 分发；overlay canvas 也已真正接入 DOM，`RowRenderer` 的选区矩形已经切到 overlay 为权威输出，base 只在无 overlay 时兜底。对应的 Cypress 表格回归采样也已统一切到 composited page 结果，不再依赖旧的 base-canvas 假设。
- `2026-04-20`：`Draw` 现在又补出每页独立的 overlay DOM host，`Cursor` 的可视光标层与 `TableTool` 也已迁到页级 overlay host；对应的表格主回归 `table.cy.ts` 也已重新跑通，说明表格基础操作与分页选区主链都已适配新的页级交互宿主。
- `2026-04-20`：`Previewer` 的页内辅助层也已切到页级 overlay host，`resizerSelection` 与拖拽镜像不再挂在 editor container；在此基础上，图片全屏预览 modal 也已切到 editor 自己的 modal host，图片工具链已不再依赖 `document.body` 作为全局宿主。`image.cy.ts` 与表格核心回归均已通过。
- `2026-04-20`：`RowRenderer.drawSelection()`、`TableOverlayRenderer.renderVisibleSelectionOverlay()` 与 `RenderInvalidationManager` 已接通 selection-overlay 专用刷新路径；当前拖选高频帧会优先只清理并重绘相关页 overlay，不再回退到整页 visible render，因此 `selection dirty / overlay dirty / 相关页 overlay 刷新` 这三项已进入完成态。
- `2026-04-20`：搜索与水印/背景这批剩余全局点也已继续收口：`searchNavigatePre/Next` 不再触发整篇全量重绘，而是显式收口到“前一个命中页 + 当前命中页”的局部页集合；搜索首次输入关键词仍做全局 compute，但渲染范围已收窄到 visible-only；背景图/水印图异步加载回绘与水印增删命令也都已切到 visible-only。`search.cy.ts`、`watermark.cy.ts` 与分页表格主回归均已通过。
- `2026-04-20`：`CommandAdapt.search()` 现在也已不再触发布局重算：首次输入关键词会先直接执行全局搜索匹配计算，再走 `isCompute: false + pageRenderScope: 'visible'` 的可见页刷新；搜索链路当前保留的全局成本只剩匹配扫描本身。
- `2026-04-20`：`Draw.getDataURL()` 也已切到离屏导出路径：导出会在 detached page container 上渲染并于 finally 中恢复 live render state，不再复用实时页面 canvas / mode / pixel ratio 做全局导出；`print.cy.ts` 已重新对齐并通过。当前导出/打印链保留的全局性只剩导出本身的数据计算与整批页面生成，而不再影响 live 渲染宿主。
- `2026-04-20`：搜索高亮绘制本身也已切到 overlay 层：`PageRenderer` 与 selection-overlay 专用路径现在都会把 search highlight 画到 overlay canvas，而不再落在 base canvas 上。至此，搜索链路已同时脱离 base 渲染层、全量 render 链与全局宿主问题。
- `2026-04-20`：进一步地，`CommandAdapt.search()/searchNavigatePre()/searchNavigateNext()` 也已直接接入 overlay-only 刷新入口：搜索输入与导航不再触发 visible-only 整页重绘，而是通过 `RenderInvalidationManager` 直接刷新相关页 overlay。当前搜索链路保留的全局成本只剩匹配扫描本身。
- `2026-04-20`：`Search.compute()` 也已补出按页索引化缓存，`Search.render(pageNo)` 不再每页遍历整份 `searchMatchList`，而是只消费当前页 page map 切片；搜索链路当前剩余的全局成本已进一步收缩到匹配扫描与 page map 构建本身。
- `2026-04-20`：控件搜索高亮也已同步切到 overlay：`PageRenderer` 与 overlay-only 刷新路径都会把 `Control.renderHighlightList()` 画到 overlay canvas，而 `setControlHighlight()` 已改为“重算高亮命中 + overlay-only 刷新”。至此，控件高亮不再触发布局重算，也不再停留在 base 画布。
- `2026-04-20`：最后一个 pending 的 `layout dirty` 也已补齐成真实语义：`RenderInvalidationManager` 现在会在 `Draw.render(isCompute: true)` 前标记布局失效，并在完整渲染链路后清理；overlay-only 刷新路径会显式绕开 layout-dirty 状态，不再在布局无效时误走 overlay-only。至此，阶段 5 文档里列出的 4 类 dirty 标记已经全部进入完成态。
- `2026-04-20`：进一步地，控件搜索高亮内部也已补出按页索引化缓存，`ControlSearch.renderHighlightList(pageNo)` 不再每页遍历整份控件高亮结果，而是只消费当前页切片；控件高亮当前已同时完成 overlay 化、overlay-only 刷新化与按页消费化。

### 验收标准

- 拖选过程中不再全量布局
- 拖选时只刷新必要页
- 分页表格交互明显更流畅

---

## 阶段 6：过渡链路删除与收口

### 目标

删除所有过渡补丁与重复逻辑，防止新旧双轨长期共存。

### 待办

- [x] 删除 `CommandAdapt` 中旧的 range/cursor 二次解释
- [x] 删除 `RowRenderer` 中不再需要的补丁修复代码
- [x] 删除 `Position.getPositionByXY()` 中旧表格递归命中逻辑
- [x] 删除 keydown handlers 中旧 fragment 分支
- [ ] 删除 event utils 中不再需要的补丁型字段解释
- [x] 删除已废弃的旧测试与临时调试用例

### 当前重点删除文件

- `CommandAdapt.ts`
- `RowRenderer.ts`
- `Position.ts`
- `resolveSelectionStartState.ts`
- `resolveSelectionPointerPosition.ts`

### 当前进展

- `2026-04-17`：`Position` 中未再被主命中链消费的 `pageCursorIndexes / rowStart / rowCursorRange / lastLetter` 缓存与公开方法已删除，开始把阶段 4 期间残留的过渡 API 真正收口到阶段 6。
- `2026-04-17`：`TableHitTestService.resolveTableElementHit()` 中旧的 `td.positionList` 递归命中备用扫描已删除，`Position -> table` 的主点击命中不再保留旧扫描链。
- `2026-04-17`：`TableHitTestService.resolvePointerPosition()` 中“先正文命中、再 `cellAreaPosition` 覆盖”的过渡拼接已删除，表格拖选 / 点击命中已收口为 snapshot 表格优先路径。
- `2026-04-17`：`resolveSelectionStartState()` 中表格起点计算已搬到 `table/selection/resolveTableSelectionStartState.ts`，开始把 selection start 的表格补丁从 event utils 侧抽离。
- `2026-04-17`：未再被任何主链消费的 `resolveSelectionPointerPosition.ts` 空 wrapper 已删除，event utils 不再保留额外一层表格命中转发。
- `2026-04-17`：`getExistingCaretAnchorIndex()` 已抽到 `event/utils/resolveExistingCaretAnchorIndex.ts`，`resolveSelectionStartState.ts` 只保留 selection start 的组装与分发。
- `2026-04-17`：`click / mousemove / mouseup` 三条鼠标主链已直接接入 `TableHitTestService.resolve()`，`resolveSelectionBoundaryByPoint.ts` 空 wrapper 已删除，event utils 侧命中中转继续收口。
- `2026-04-17`：剩余的非表格 / 表格共用 `mouseDownIndex` 左右半区命中规则已抽到 `event/utils/resolvePointerMouseDownIndex.ts`，selection start 进一步去补丁化。
- `2026-04-17`：`CommandAdapt.getPositionContextByEvent()` 已改为复用 `getEventPagePoint + TableHitTestService.resolvePointerPosition()`，外部事件命中入口不再单独绕回 `Position.getPositionByXY()`。
- `2026-04-17`：`dragover` 已改为复用 `getEventPagePoint + TableHitTestService.resolvePointerPosition()`，拖拽过程中用于重定位光标/折叠选区的鼠标主链不再直接走 `adjustPositionContext()`。
- `2026-04-17`：`RowRenderer` 中 `repairInactiveFragmentGhostRow / selectionBoundaryCleanup / previousBoundaryRepair` 三段渲染补丁已物理删除，改为每行重绘前统一清理当前行绘制区，再只按 `getRenderSelectionRange()` 投影结果绘制选区。
- `2026-04-17`：`Position.getSelectionPositionList()` 已改为直接消费 `RangeManager.getSelectionContentRange()`，`CommandAdapt.getRangeContext()` 也已切到 `getRange()/getRangeText()/getCursorPosition()` 的公开语义，不再混用 raw range 与 public projection。
- `2026-04-17`：`RangeManager.getRangeRow()/getRangeRowElementList()/getRangeParagraph()/getRangeParagraphInfo()/getIsPointInRange()` 已改为统一消费公开投影后的 active range，公开行/段落/命中查询不再各自直接读取 raw `this.range`。
- `2026-04-17`：`CommandAdapt.getRangeContext()` 已改为优先使用投影后的选区元素与选区位置列表推导 `startElement/endElement/startPageNo/endPageNo` 等公开上下文，`CommandAdapt.title()` 在非折叠选区下也已改为直接消费 `RangeManager.getSelectionElementList()`，不再手工按 raw range 做 `slice(startIndex + 1, endIndex + 1)`。
- `2026-04-17`：`CommandAdapt.getHyperlinkRange()` 已改为优先从公开选区元素/公开光标/公开 range 推导超链接锚点，再按 `hyperlinkId` 向两侧扩展，不再把 raw `range.startIndex` 直接当成超链接识别入口。
- `2026-04-18`：`CommandAdapt` 已补出统一的公开选区锚点 helper，`cancelHyperlink()/editHyperlink()/separator()/replaceImageElement()/saveAsImageElement()/changeImageDisplay()/insertElementList()/insertControl()/insertTitle()` 这组只消费当前选区上下文的命令入口已切到公开投影锚点，不再各自直接解释 raw `this.range.getRange()`。
- `2026-04-18`：`CommandAdapt` 中无选区样式锚点的 `format/font/size/sizeAdd/sizeMinus/bold/italic/underline/strikeout/color/highlight` 以及 `title()/rowFlex()/rowMargin()/image()` 已继续切到公开投影锚点；当前文件内直接读取 raw `this.range.getRange()` 的调用已缩减到 3 处，基本只剩内部编辑边界型入口。
- `2026-04-18`：`backspace`、插入超链接、按当前光标删除控件这 3 个剩余入口已改为统一通过 `CommandAdapt` 内部的编辑边界 helper 读取 raw range，`CommandAdapt` 文件内不再保留裸的 `this.range.getRange()` 调用。
- `2026-04-18`：`RangeManager.getEditBoundaryRange()` 已落地，`ContextMenu / Draw / Control / TableOperate / TableParticle / ListParticle / DateParticle / Area / Group / GlobalEvent / CommandAdapt` 已统一切到显式的内部编辑边界接口；`npm run type:check`、`npm run lint` 与 `table-selection-nonpaged / table-pagination-input / table-pagination-merged / table-pagination-mock` 固定回归均已通过。
- `2026-04-18`：控件子类、分页渲染器以及 keydown / copy / cut / input / mousedown / mouseup / paste 等事件 handler 也已统一切到显式 `getEditBoundaryRange()`，仓库内部不再保留默认语义不明的 raw range 读取入口。
- `2026-04-20`：`RowRenderer.drawRow()` 中残留的旧内联选区绘制分支也已物理删除，当前选区矩形只剩 `drawSelection()` 单一路径负责；这意味着 `RowRenderer` 在选区层面已不再维持新旧双轨。
- `2026-04-20`：`resolveSelectionStartState` / `resolveTableSelectionStartState` 返回值里的 `collapseToIndex` 过渡字段也已物理删除，`mousedown` 初始化链改为直接消费现有 `tdValueIndex` 折叠光标，不再额外维护一条重复的补丁索引语义。
- `2026-04-20`：`mousedown` 中对 `position.adjustPositionContext()` 的重复备用分支也已物理删除，当前点击起点解析只剩 `resolveSelectionStartState()` 这一条主链负责，不再保留同一语义的二次兜底分支。
- `2026-04-20`：阶段 6 的测试侧旧假设也已开始同步清理：`cypress/e2e/tmp` 调试用例已物理删除，menu 级 spec 里残留的 `cy.get('canvas')` 老基线也已批量改成显式 `canvas[data-index]`，正式回归不再继续依赖 overlay 接入前的 DOM 结构假设。
- `2026-04-20`：`resolveSelectionStartState` / `resolveTableSelectionStartState` 返回值里的 `positionContext` 重复字段也已物理删除，`mousedown` 现已直接基于 `positionResult` 组装表格位置上下文；selection-start 返回结构又少了一层重复投影。
- `2026-04-20`：`ITableHitTestResult` 与 `resolveSelectionBoundary()` 之间的 `boundary.positionResult` 重复结构也已删除，`click / mousemove / mouseup` 等命中链统一直接消费外层 `positionResult`；命中结果数据结构进一步收薄。
- `2026-04-20`：`Position.adjustPositionContext()` 这层旧包装也已物理删除，非表格命中归一化统一收口到 `resolveAdjustedPointerPosition()`；`TableHitTestService.resolvePointerPosition()`、`click.ts` 与 selection-start 链已共同复用这一条轻量命中归一化主链，`Position` 本体不再保留只服务旧调用点的包装入口。
- `2026-04-20`：在此基础上，`resolveSelectionStartState()` 里原来“表格走 `TableHitTestService`、非表格再额外兜底 `resolveAdjustedPointerPosition()`”的双路判断也已删除，selection-start 现已直接复用 `TableHitTestService.resolvePointerPosition()` 单入口；`click.ts` 同步只吃同一条命中主链返回值，事件层的命中入口继续收口。
- `2026-04-20`：`updown.ts` 中残留的 later-fragment 边界特判也已下沉到 `TableNavigationService.resolveVerticalFragmentTransition()`，handler 不再直接内嵌这段分页表格 fragment 跳转判断；阶段 6 里“删 keydown 旧 fragment 分支”已开始实质推进。
- `2026-04-20`：`table/utils/createTablePositionContext.ts` 已落地并被 `TableNavigationService` 与 `resolveSelectionDragRange()` 共同复用，分页表格 `positionContext` 不再由导航链和拖选链各自手拼一套；同时 `resolveSelectionBoundary()` 已移除对 `Draw` 的假依赖，`RangeManager.getIsCanInput()/shrinkBoundary()` 也已切回显式 `getEditBoundaryRange()`。本轮 `npm run type:check`、`npm run lint` 与 `table-selection-nonpaged / table-pagination-input / table-pagination-merged / table-pagination-mock` 共 47 条回归再次通过。
- `2026-04-20`：`Position.getPositionByXY()` 中残留的 `TABLE -> TableHitTestService.resolveTableElementHit()` 旧递归命中入口也已物理删除，`Position` 现在只保留正文 / 浮动元素 / 页边界命中；表格命中正式只剩 `TableHitTestService` 单入口负责。对应的 `npm run type:check`、`npm run lint` 与固定 47 条表格回归再次单次全绿。
- `2026-04-20`：selection-start 返回结构也继续收薄：`resolveSelectionStartState()` / `resolveTableSelectionStartState()` 里原先散落的 `hitLineStartIndex / cursorDragAnchorIndex / preferDragAnchorOnCaretLine` 已并入统一 `cursorState`，`mousedown` 不再自己做这组三段视觉补丁字段的备用解释。对应 `npm run type:check`、`npm run lint` 与固定 47 条表格回归再次单次全绿。
- `2026-04-20`：`Cursor` 内部也已同步去散字段化：`hitLineStartIndex / dragAnchorIndex / preferDragAnchorOnCaretLine` 不再通过三组 getter/clear API 分散暴露，而是统一收口到 `cursor/CursorSelectionState.ts` 与 `Cursor.getSelectionStartCursorState()/clearSelectionStartCursorState()`；`CommandAdapt`、`resolveExistingCaretAnchorIndex()` 与 `Draw` 已全部切到新接口。与此同时，`resolvePointerBoundaryAtPosition.ts` 已统一正文命中与表格命中的“左半区回退一位 + 行首打标”规则，`Position` 与 `resolveTableCellPositionByPagePoint()` 不再各自维护一份半字符边界解释。对应 `npm run type:check`、`npm run lint` 与固定 47 条表格回归再次单次全绿。
- `2026-04-20`：在此基础上，`resolveSelectionBoundary()` 也已开始统一承接非表格的行首边界提示，`resolveSelectionStartState()` 不再直接回读 raw `positionResult.hitLineStartIndex` 来生成非表格 `cursorState`；命中结果里的这类补丁字段传播面进一步收窄到 boundary / cursor 两层。对应 `npm run type:check`、`npm run lint` 与固定 47 条表格回归再次单次全绿。
- `2026-04-20`：`TableHitTestService.resolveTableElementHit()` 与 `ITableElementHitTestRequest` 这层仅服务旧 `Position` 表格递归命中链的死入口也已物理删除；当前 `TableHitTestService` 只保留 `resolvePointerPosition()/resolve()` 这条仍被主链消费的命中入口。对应 `npm run type:check`、`npm run lint` 与固定 47 条表格回归再次单次全绿。
- `2026-04-20`：命中结果字段也继续收薄：`segmentStartIndex` 已从 `ICurrentPosition` 物理删除，fragment 起点判断改由 `resolveTableSelectionStartState()` 基于 snapshot 现算；`hitTargetIndex` 则已从 `ICurrentPosition` 退回到 `boundary + 表格 page-point 命中元信息` 两层。与此同时，`resolveTableCellPositionByPagePoint()` 已不再伪装成通用命中结果，而是只返回 `TableHitTestService` 内部消费的表格命中元信息；`resolveSelectionStartState()` 也已删除对 `resolveSelectionBoundary()` 的备用直调，只吃 `TableHitTestService.resolve()` 单入口输出。对应 `npm run type:check`、`npm run lint` 与固定 47 条表格回归再次单次全绿。
- `2026-04-20`：在此基础上，通用 `IPagePoint` 也已从表格命中 helper 中拆到 `event/utils/PagePointTypes.ts`，其余 range/selection/hittest 调用方不再为了一个通用 page-point 类型依赖表格命中文件；同时 `getTableFragmentByPagePoint()` 已回收进 `TableHitTestService`，`resolveSelectionBoundary.ts` 也已从 `event/utils` 挪回 `table/hittest`，命中相关实现继续向 service 同域收口。对应 `npm run type:check`、`npm run lint` 与固定 47 条表格回归再次单次全绿。
- `2026-04-20`：在此基础上，`resolveSelectionBoundary.ts` 这层单用 helper 也已继续收口：`IResolvedSelectionBoundary` 现已直接并入 `TableHitTestTypes.ts`，边界归一化实现则内联到 `TableHitTestService.resolve()` 旁边，独立 helper 文件已物理删除；命中域继续减少“一次转发、再一次包装”的层级。对应 `npm run type:check`、`npm run lint` 与固定 47 条表格回归再次单次全绿。
- `2026-04-20`：随后，`resolveAdjustedPointerPosition.ts` 这层只剩 `TableHitTestService` 单用的非表格命中归一化包装也已并回 `TableHitTestService` 内部，独立 helper 文件已删除；当前 `TableHitTestService` 已同时承接“表格 page-point 命中 + 非表格位置归一化 + 边界归一化”三段原先分散的命中主链逻辑。对应 `npm run type:check`、`npm run lint` 与固定 47 条表格回归再次单次全绿。
- `2026-04-20`：selection-start 侧的 helper 边界也继续调整：`resolveExistingCaretAnchorIndex.ts` 与 `resolvePointerMouseDownIndex.ts` 已从 `range/utils` 挪回 `event/utils`，这条只服务 selection-start 的事件链不再继续反向挂在 range 域；与此同时，`hitLineStartIndex` 也已从 `ICurrentPosition` 主类型移除，仅保留在命中域内部结果与 boundary / cursor state 中流动。对应 `npm run type:check`、`npm run lint` 与固定 47 条表格回归再次单次全绿。
- `2026-04-21`：在此基础上，`resolveTableCellPositionByPagePoint.ts` 这层也已整段并回 `TableHitTestService` 并物理删除；当前 `TableHitTestService` 已直接内联 `table fragment 定位 / cell 命中 / 非表格归一化 / boundary 归一化` 四段主链逻辑，命中域继续减少单用 helper 文件。对应 `npm run type:check`、`npm run lint` 与固定 47 条表格回归再次单次全绿。
- `2026-04-21`：随后，`TableHitTestService` 也已补出稳定的 `snapshotAccessor` 成员，不再在命中主链内反复临时 new accessor；同时 `resolveFragmentCellSlice()` 里对快照 map 的重复备用查找也已删除，改为直接信任 `TableLayoutSnapshotAccessor.resolveSliceByFragmentContext()`。这轮调整后固定 47 条表格回归仍然单次全绿。
- `2026-04-21`：继续收口后，`TableHitTestService.resolvePointerPosition()` 现已明确区分“内部扩展命中结果”和“对外公共命中结果”，`hitTargetIndex / hitLineStartIndex` 不再通过公共 `resolvePointerPosition()` 外泄；同时 `resolveTableCellPositionByPagePoint.ts` 已删除后的残余裸调用也已清理完毕，命中服务当前对外只暴露精简后的公共结构。固定 47 条表格回归再次单次全绿。
- `2026-04-21`：在此基础上，`TableHitTestService` 内部又继续删掉了两层单用实现：`resolveTableCellByPagePoint()` 已被内联进 `resolveTableCellPositionByPagePoint()`，而 `resolveTablePointerPositionByAnyPageLocalPoint()` 也已被内联回 `resolvePointerPositionInternal()`；同时 `resolveSnapshotTableElementHit()` 不再二次查询 fragment slice，而是直接消费前一步 page-point 命中带回来的 `activeSlice`。对应 `npm run type:check`、`npm run lint` 与固定 47 条表格回归再次单次全绿。
- `2026-04-21`：在此基础上，`Draw` 也已开始持有 `TableHitTestService` 单例，`CommandAdapt` 与各条鼠标/selection-start 链不再各自 `new TableHitTestService(draw)`；同时 `TableLayoutSnapshotAccessor` 也已提升为 `Draw` 级单例并被 `CommandAdapt / RangeManager / TableNavigationService / TableSelectionProjectionService / TableHitTestService / TableOperate / RowRenderer / TableLayoutSnapshotStateSync` 及 selection/event helper 共用。当前命中与快照访问两条主链都已从“多处临时实例化”收口到 draw 级单例。固定 47 条表格回归再次单次全绿。
- `2026-04-21`：随后，`Draw` 也已开始持有 `TableNavigationService` 单例，keydown 主链不再各自 `new TableNavigationService(draw)`；同时 `RangeManager / CommandAdapt / TableOperate / RowRenderer / TableNavigationService / TableSelectionProjectionService / TableLayoutSnapshotStateSync` 这批模块里的本地 snapshot accessor 持有继续删除，而 `TableHitTestService` 也已删除本地 `snapshotAccessor` 字段，改为直接通过 `draw.getServices().tableLayoutSnapshotAccessor` 取用 draw 级单例。固定 47 条表格回归再次单次全绿。
- `2026-04-21`：在此基础上，`TableLayoutSnapshotStore.ts` 也已整段并回 `Draw` 并删除文件；快照的 `version / snapshot cache / sync logical table state` 现在都直接由 `Draw` 私有方法维护。与此同时，`TableNavigationService.resolveAdjacentCellNavigation()`、`resolveBoundaryTableEntry()`、`resolveDeleteNavigationIndex()`、`resolveNextFragmentStartIndex()` 与 `resolveEntryCellPositionIndex()` 这批只剩单用或薄转发的导航 helper 也已继续物理收口，`RangeManager` 里 `getLogicalCellSliceList()`、`resolveActiveTableSlice()` 这层壳也已删除。固定 47 条表格回归再次单次全绿。
- `2026-04-21`：随后，`TableSelectionProjectionService.ts` 也已整段并回 `RangeManager` 并删除文件，selection projection 不再由额外 service 对象承接；与此同时，`TableHitTestService` 对外公共入口现已只剩 `resolve()`，而 `TableNavigationService` 里 `resolveSiblingLogicalCell()` 及 fragment 前后跳转两段单用 slice helper 也已继续内联收口。对应 `npm run type:check`、`npm run lint` 与固定 47 条表格回归再次单次全绿。
- `2026-04-21`：继续往下，`TableNavigationService.createInTableNavigationResult()` 与 `resolveVerticalSiblingLogicalCell()` 也已继续内联删除，导航主链里“命中边界 -> 目标单元格 -> 结果组装”这条路径再少了两层中转；`RangeManager.getTextLikeSelection()` 这类已无消费面的公开壳层也已物理删除。对应 `npm run type:check`、`npm run lint` 与固定 47 条表格回归再次单次全绿。
- `2026-04-21`：继续往下，`RangeManager.getProjectedActiveRange()` 这层只剩 4 处消费的公开薄壳也已物理删除，相关行/段落/命中判断现在直接消费 `getPublicRange() + getSelectionContentRange()`；与此同时，`TableNavigationService.getLogicalCellSliceList()` 与顶部逻辑 cell 类型壳也已删除，fragment 跳转与相邻单元格导航直接就地读取 snapshot cell slices。对应 `npm run type:check`、`npm run lint` 与固定 `table-selection-nonpaged / table-pagination-input / table-pagination-merged / table-pagination-mock` 47 条回归再次单次全绿。
- `2026-04-21`：继续往下，事件层两层纯消费壳 `applyPositionResultContext.ts` 与 `applyResolvedSelectionRange.ts` 也已物理删除；`click / drag / mousedown / mousemove / mouseup` 这组主链现已直接写入 `position.setPositionContext(...)` 与 `rangeManager.setRange(...)`，不再额外保留只做字段转发的 event utils 文件。对应 `npm run type:check`、`npm run lint` 与固定 `table-selection-nonpaged / table-pagination-input / table-pagination-merged / table-pagination-mock` 47 条回归再次单次全绿。
- `2026-04-24`：`TableOverlayRenderer` 也已继续从“模块已存在”推进到“draw 级统一宿主”：`Draw` 现已持有唯一的 overlay renderer，`PageRenderer` 与 `RenderInvalidationManager` 不再各自 `new TableOverlayRenderer(draw)`；阶段 5/6 当前已经开始继续清理渲染宿主层的重复实例化壳。
- `2026-04-24`：事件层 `applyPositionResultContext.ts` 这层只做字段转发的薄壳也已物理删除，`click / drag / mousedown` 已直接写入 `position.setPositionContext(...)`；阶段 6 当前继续沿“删无语义 event utils 壳层”推进。
- `2026-04-24`：事件层 `applyResolvedSelectionRange.ts` 这层只做 `rangeManager.setRange(...)` 转发的薄壳也已物理删除，`mousemove / mouseup` 已直接写入编辑边界；阶段 6 当前继续从“删命中写入壳”推进到“删选区写入壳”。
- `2026-04-24`：`PageRenderer.renderVisiblePages()` 与 `TableOverlayRenderer.renderVisibleOverlay()` 里原先各自维护的一份“相关页集合”合并规则也已收口到 `Draw.resolveVisibleRenderPageNos()`；阶段 6 当前开始继续清理分页渲染主链内部的重复页裁剪逻辑，而不只是删 event 壳层。
- `2026-04-24`：`PageRenderer` 与 `TableOverlayRenderer` 里原先各自执行的 `positionList.filter(pageNo)` 页级切片也已收口到 `Position.getMainPositionListByPage()`；阶段 6 当前继续从“删渲染链重复规则”推进到“删渲染链重复数据切片”。
- `2026-04-24`：`resolvePointerMouseDownIndex.ts` 这层只剩两处消费的薄 helper 也已内联进 `resolveSelectionStartState.ts` 与 `resolveTableSelectionStartState.ts` 并物理删除；阶段 6 当前继续沿“删 event/utils 只读短 helper 壳层”推进。
- `2026-04-24`：`getEventPagePoint.ts` 也已从 `event/utils` 收口到 `Draw.getEventPagePoint()` 宿主接口，`command / event handlers / debug` 不再通过独立 helper 反向读取 draw 状态；阶段 6 当前继续把“跨域共享但本质依赖 draw 宿主”的工具能力收回到统一宿主边界。
- `2026-04-24`：`resolvePointerBoundaryAtPosition.ts` 这层“正文命中 + 表格命中”共用的边界解释规则已从 `event/utils` 迁回 `position/utils`；这说明当前阶段 6 不只是删除薄壳，也在持续把仍需保留的共享规则迁回更准确的职责目录。
- `2026-04-24`：`resolveExistingCaretAnchorIndex.ts` 内部原先分散的 `snapshot slice / merged-cell / multi-slice / min-max boundary` 查询也已收口成单一 table-caret 上下文，不再在同一函数里重复做多次 table 状态读取；阶段 6 当前继续从“删壳”推进到“压平重 helper 内部的重复上下文读取”。
- `2026-04-24`：`CommandAdapt.getActivePublicRange()/getActiveEditBoundaryRange()` 这两层内部 range 读取壳也已物理删除，命令层内部调用点已直接消费公开 `getRange()` 或 `this.range.getEditBoundaryRange()`；阶段 6 当前继续把“主干类内部的中间读取壳”压平到真实宿主接口。
- `2026-04-24`：`RowRenderer.drawSelection()` 里原先仍保留的一段 `rowPositionOffset + slice` 手写循环也已回收为统一 `forEachRowPositionSlice()` 路径；阶段 6 当前继续从“删对象壳 / 删 helper 壳”推进到“删主干类内部的重复局部循环”。
- `2026-04-24`：`RowRenderer.drawRow()` 里重复展开的 `payload.selectionCtx || ctx` 也已收口成单一局部 `selectionCtx`；阶段 6 当前继续沿“删主干类内部重复中间值展开”推进，而不引入新语义。
- `2026-04-24`：`RowRenderer.drawSelection()` 里反复展开的 `this.draw.getRange()` 与 `this.draw.getServices().tableLayoutSnapshotAccessor` 读取也已收口成单一局部引用；阶段 6 当前继续沿“删主干类内部重复宿主读取”推进。
- `2026-04-24`：`RowRenderer.drawRow()` 里原先对 `rowPositionList[0]` 的三处重复读取也已收口成单一局部 `rowStartPosition`；阶段 6 当前继续沿“删主干类内部重复局部取值”推进。
- `2026-04-24`：`RowRenderer.drawRow()` 里反复展开的 `this.draw.getTextParticle()` 也已收口成单一局部 `textParticle`；阶段 6 当前继续沿“删主干类内部重复宿主读取”推进。
- `2026-04-24`：`RowRenderer.drawRow()` 里反复展开的 `this.draw.getControl()` 也已收口成单一局部 `control`；阶段 6 当前继续沿“删主干类内部重复宿主读取”推进。
- `2026-04-24`：`RowRenderer.drawRow()` 里反复展开的 `this.draw.getUnderline()` 与 `this.draw.getStrikeout()` 也已收口成单一局部引用；阶段 6 当前继续沿“删主干类内部重复宿主读取”推进。
- `2026-04-24`：`RowRenderer.drawRow()` 里反复展开的 `getOptions()/getMode()/isDesignMode()` 也已收口成局部 `options / mode / isDesignMode`；阶段 6 当前继续沿“删主干类内部重复宿主读取”推进。
- `2026-04-24`：`RowRenderer.drawRow()` 中 `Group / TableParticle / ListParticle / LineBreakParticle / ImageParticle / LaTexParticle / HyperlinkParticle / SuperscriptParticle / SubscriptParticle` 这一组高频 getter 也已收口成局部引用；阶段 6 当前继续批量压平渲染主链内部的重复宿主读取，而不是继续保留散点 getter 展开。
- `2026-04-25`：`RowRenderer.drawRow()` 中零散残留的 `SeparatorParticle / PageBreakParticle / CheckboxParticle / RadioParticle / BlockParticle` 也已继续收口成局部引用；与此同时，`drawSelection()` 中重复读取的 `rangeMinWidth` 也已收口为单一局部常量。阶段 6 当前继续把渲染主链内部的散点 getter 与常量读取批量压平。
- `2026-04-25`：`RowRenderer.drawRow()` 中零散残留的 `getElementSize()/getElementFont()` 与 `snapshotAccessor.isSameLogicalTable()` 读取也已继续收口到局部引用；阶段 6 当前继续把渲染主链内部仍然散落的宿主方法读取压平。
- `2026-04-25`：`RowRenderer.drawSelection()` 中对 `this.draw.getCoordinate()` 的散点读取，以及 `drawRow()` 中对 `getElementRowMargin()` 的重复读取也已收口成局部引用；阶段 6 当前继续把渲染主链内部的散点宿主读取压平成单一局部上下文。
- `2026-04-25`：`RowRenderer.drawFragmentCellTopBorder()` 与 `drawRow()` 中零散残留的 `snapshotAccessor / rangeManager` 读取也已继续收口成局部引用；阶段 6 当前继续把渲染主链内部的散点宿主读取压平成单一局部上下文。
- `2026-04-25`：`Position.getPositionLookupKey()` 这层只做键拼接的单用途壳也已删除，lookup map 构建与读取现已直接内联使用 ``${pageNo}_${index}``；阶段 6 当前继续从“删重复宿主读取”推进到“删 position 基础设施里的单用途小壳”。
- `2026-04-25`：`Position.getPageRowBands()` 这层只剩内部消费的查表壳也已删除，页内 row-band 读取现在直接基于 `getPageRowBandsLookupMap(...).get(pageNo)` 内联完成；阶段 6 当前继续从“删 lookup 小壳”推进到“删 position 基础设施里的内部查表壳层”。
- `2026-04-25`：`Position.getSelectionPositionList()` 这层只剩命令层单处消费的公开薄壳也已删除，`CommandAdapt.getRangeContext()` 已直接基于 `RangeManager.getSelectionContentRange()` 与 `position.getPositionList()` 组装选区位置列表；阶段 6 当前继续把 `Position` 中只服务单一上层的公开包装方法收回到消费点。
- `2026-04-25`：`Position.getMainPositionList()` 这层已无消费面的公开壳也已删除；阶段 6 当前继续把 `Position` 中“历史上为过渡保留、当前已无真实消费”的公开读取面物理收口。
- `2026-04-25`：`Position.getOriginalMainPositionList()` 这层与 `getMainPositionList()` 完全同值的公开壳也已删除，`CommandAdapt / WorkerManager / Area / LineNumber` 已统一改为直接消费 `getMainPositionList()`；阶段 6 当前继续把 `Position` 中重复语义的公开读取面物理收口。
- `2026-04-25`：`CommandAdapt.getCursorPosition()` 中重复读取的 `getEditBoundaryRange()` 与 `getOriginalElementList()` 也已收口成局部上下文，命令层这条高频公开读取入口又少了一层重复宿主访问。
- `2026-04-25`：`CommandAdapt.getRangeContext()` 中重复展开的 `getCursorPosition()` 读取也已收口成单一局部 `cursorPosition`；阶段 6 当前继续沿“压平命令层高频公开读取入口内部的重复公开读取”推进。
- `2026-04-25`：`CommandAdapt.getRangeContext()` 中对 `draw.getCursor().getSelectionStartCursorState()` 的散点读取也已收口成局部 `selectionStartCursorState`；阶段 6 当前继续把命令层高频公开读取入口内部的重复宿主访问压平成单一局部上下文。
- `2026-04-25`：`RowRenderer` 顶部 helper `forEachTableCellPayload()/drawFragmentCellTopBorder()/drawHighlight()` 里的零散 `draw.get...()` 宿主读取也已继续收口成局部上下文；阶段 6 当前继续从“主渲染路径收口”推进到“渲染 helper 内部收口”。
- `2026-04-25`：`CommandAdapt.resolveSelectionPositionList()` 这层单行转发壳也已物理删除，`getRangeContext()` 已直接消费 `position.getSelectionPositionList()`；阶段 6 当前继续把命令层内部只剩一处消费的中间读取壳压平到真实宿主接口。
- `2026-04-25`：`Position.getActivePageRowBand()` 这层只剩内部单处消费的壳也已删除，页内 active row band 的二分查找已内联回 `getPositionByXY()` 主链；阶段 6 当前继续从“删 helper 壳”推进到“删 position 主链内部的单用方法层”。
- `2026-04-25`：`resolveExistingCaretAnchorIndex.ts` 这层只剩 `resolveSelectionStartState.ts` 单处消费的 selection-start helper 也已并回主文件并物理删除；existing-caret anchor 计算现在直接与 selection-start 命中结果同地维护，事件起点链又少了一层文件跳转。对应 `npm run type:check` 已通过。
- `2026-04-25`：`Position.resolveRowBoundaryPosition()` 这层只被页边界兜底逻辑单处消费，也已内联删除；`Position` 页边界主链继续减少一层内部方法跳转。对应 `npm run type:check` 已通过。
- `2026-04-25`：页内行带兜底 helper 只被 `getPositionByXY()` 单处消费，也已内联删除；`Position` 主命中链继续减少一层内部方法跳转。对应 `npm run type:check` 已通过。
- `2026-04-25`：页边界兜底 helper 只被 `getPositionByXY()` 单处消费，也已内联删除；`Position.getPositionByXY()` 周边最外层的页内/页边界中转层已继续压平。对应 `npm run type:check`、`npm run lint` 已通过。
- `2026-04-25`：拖选主链里 `mousemove / mouseup -> resolveSelectionDragRange()` 也已补齐 `dragAnchorSource` 透传，同时 `resolveTableSelectionStartState()` 不再为 fresh direct-drag 硬塞 pointer anchor；分页 mock 场景里“直接按下右拖不松手时首字符丢失、复制与高亮不一致”的回归已修复。对应固定基线 `table-selection-nonpaged / table-pagination-input / table-pagination-merged / table-pagination-mock` 共 `57 / 57` 已重新跑通。
- `2026-04-25`：`CommandAdapt.getRangeContext()` 也已继续拆出边界元素、位置解析、range rect 组装与标题信息回溯这 4 段局部 helper，命令层高频公开读取入口继续从“大方法堆逻辑”向“编排层 + 局部组装函数”收口。对应 `npm run type:check`、`npm run lint` 已通过。
- `2026-04-25`：`RowRenderer.drawSelection()` 也已继续把“跨行列表格选区裁决”和“普通选区矩形绘制”拆成局部 helper，选区绘制主链继续从“混合裁决 + 混合绘制”向更明确的编排层收口。对应固定核心基线 `57 / 57` 已重新跑通。
- `2026-04-25`：`RowRenderer.drawRow()` 也已继续把逐元素绘制分发与跨行列表格 range queue 收成局部 helper，渲染主链继续从“单方法混合分发 + 混合收尾”向“编排层 + 局部渲染函数”收口。对应 `npm run type:check`、`npm run lint` 与固定核心基线 `57 / 57` 已重新跑通。
- `2026-04-26`：`RowRenderer.drawRow()` 的逐元素绘制主循环已进一步收口到 `renderRowElement()`，而跨行列表格 range queue 也已统一收口到 `enqueueTableRangePaint()`；渲染主链当前已开始继续从“主循环内直接分发全部粒度”转向“主循环只编排、局部 helper 负责渲染细节”。对应 `npm run type:check`、`npm run lint` 与固定核心基线 `57 / 57` 已再次跑通。
- `2026-04-26`：`Position.resolvePageDirectHit()` 这层只被 `getPositionByXY()` 单处消费的正文 direct-hit helper 也已内联删除；`Position` 当前剩余主命中热点进一步收敛到单入口本体。对应 `npm run type:check`、`npm run lint` 与固定核心基线 `57 / 57` 已重新确认。

### 验收标准

- 表格核心规则只有一个来源
- 没有旧补丁长期残留
- 新增功能时不需要跨三个层级同时修

---

## 每阶段固定回归用例

以下用例每阶段结束后都必须跑：

- `table-pagination-input.cy.ts`
- `table-pagination-merged.cy.ts`
- `table-pagination-mock.cy.ts`

建议每阶段至少覆盖以下行为：

- later fragment 起点点击
- 先点击再拖
- 直接按住拖
- 从左向右托选
- 从右向左托选
- merged 跨页
- same-char 再拖
- 跨页 delete / backspace / 上下左右
- 上方片段选中时下方不得被带亮

---

## 第一批开发顺序建议

### 第一周

- [ ] 建立 `TableSelectionSnapshot`
- [ ] 建立 `TableSelectionProjectionService`
- [x] 完成 `RangeManager` 收口
- [x] 完成 `CommandAdapt` 对接
- [x] 完成 `RowRenderer` 对接

### 第二周

- [ ] 建立 `TableHitTestService`
- [ ] 抽离 `Position.getPositionByXY()` 表格命中逻辑
- [ ] 让点击、拖选初始化统一走 hit-test service

### 第三周

- [ ] 建立 `TableNavigationService`
- [ ] 抽离 left/right/updown/delete/backspace
- [ ] 收掉 later fragment / merged / empty cell 的导航规则

### 第四周

- [ ] 建立 `TableLayoutSnapshot`
- [ ] 引入 snapshot builder
- [ ] 让 hit-test / navigation / render 全部切到 snapshot

### 第五周

- [ ] overlay 化选区渲染
- [ ] overlay 化光标
- [ ] overlay 化 table tool
- [ ] 引入增量刷新

### 第六周

- [ ] 删除旧补丁链路
- [ ] 删除旧分支
- [ ] 删除临时过渡逻辑
- [ ] 清理遗留调试代码

---

## 每个阶段的完成定义

### Done 判定

- [ ] 所有核心回归用例通过
- [ ] 没有新增过渡链路补丁
- [ ] 新逻辑有单一入口
- [ ] 旧逻辑已物理删除或明确标记下一阶段删除
- [ ] 文档同步更新

---

## 明确禁止事项

- [ ] 禁止继续在 `CommandAdapt` 中增加新的选区补丁逻辑
- [ ] 禁止继续在 `RowRenderer` 中加入新的“猜测性修补”代码
- [ ] 禁止继续在多个 keydown handler 中复制 fragment 跳转规则
- [ ] 禁止保留新旧两套表格导航逻辑长期并存
- [ ] 禁止在 hit-test 阶段直接写全局上下文

---

## 推荐的阶段性提交边界

建议按以下边界提交，而不是一次性大爆炸：

- 提交 1：选区投影服务落地
- 提交 2：命中测试抽离
- 提交 3：键盘导航抽离
- 提交 4：布局快照化
- 提交 5：overlay 与增量渲染
- 提交 6：过渡链路删除

---

## 最终产出要求

重构完成后应满足：

- 表格选区语义唯一
- 表格命中测试唯一
- 表格导航规则唯一
- 渲染层只画，不修业务
- 复制、高亮、公开 API 完全一致
- later fragment / merged / 普通单元格行为统一
- 拖选性能不再依赖全量 render
## 2026-04-22 状态补充

- 新完成：
  - 修复 later paged fragment 首行字符盒点击被误判为 line-start caret，`up` 导航恢复稳定。
  - 修复 paged / mock / nonpaged 三类 same-char re-drag 起始锚点不一致问题。
  - fixed-set 回归重新收敛到 `47 / 47` 全绿。
- 当前阶段 6 的真实剩余工作收束为：
  - 继续删除 event / command / position / renderer 内仍然只做转发或历史过渡命名的壳层。
  - 在保持固定回归集全绿的前提下，继续压平主链内部重复逻辑。
  - 文档随每一轮主链收口同步更新，不再保留与真实状态脱节的“历史进行时”描述。

### 2026-04-22 第二轮新增完成项

- [x] 修复分页多单元格 later-page 第二列点击后 cursor / input / up 导航错位
- [x] 修复分页 `TableTool` 仍锚定首页 fragment 的问题
- [x] 修复整表选择的跨行列高亮在真实渲染链中被递归 cell 清空的问题
- [x] 修复 later paged fragment 首行字符所在单元格 top border 不可见
- [x] 新增 `table-pagination-multicell.cy.ts`
- [x] 新增 `table-pagination-border.cy.ts`
- [x] 扩充 `table.cy.ts` 的整表选择高亮断言

### 2026-04-22 第三轮新增完成项

- [x] 以真实 `mock.ts` 中文分页单元格补齐 later fragment start `↑ / ↓` 导航
- [x] 修复跨页边界 `↓` 落点优先级
- [x] 恢复 `table-pagination-input.cy.ts` 的 inner-line-start `↑` 回上一页场景
- [x] 扩充 `table-pagination-mock.cy.ts` 的真实 `mock.ts` 上下移回归

### 2026-04-22 第四轮新增完成项

- [x] 统一 `updown.ts` 中 table vertical navigation 的进入条件
- [x] 修复多单元格分页场景跨单元格 `down` 直接落到下一个单元格首行
- [x] 固定分页表格回归组重新跑通：
  - `table-pagination-input`
  - `table-pagination-mock`
  - `table-pagination-multicell`
  - `table-pagination-border`
  - `table-pagination-merged`
  - `table-pagination-adjacent-cell`
  - `table-pagination-empty-last-row`

### 2026-04-24 新增完成项

- [x] 修复普通文字“点击后从同一字符盒再次拖选”时的左右边界错位
- [x] 明确普通文字 `caret line` 与 `character box` 的拖选语义分界：
  - 点 `caret line` 继续走 existing-caret 语义
  - 点 `character box` 回到 direct-hit 语义
- [x] 新增并跑通普通文字回归：
  - `plain-text-selection.cy.ts`
  - direct drag
  - drag from caret line
  - drag again from the same character box after click
- [x] 重新验证非分页表格单元格文字拖选回归 `table-selection-nonpaged.cy.ts`

### 2026-04-25 新增完成项

- [x] 将 `resolveExistingCaretAnchorIndex.ts` 并回 `resolveSelectionStartState.ts`
- [x] 删除 selection-start 链上的单用 helper 文件 `resolveExistingCaretAnchorIndex.ts`
- [x] 重新执行 `npm run type:check`
- [x] 将 `Position.resolveRowBoundaryPosition()` 内联回页边界兜底主链
- [x] 将页内行带兜底 helper 内联回 `getPositionByXY()` 主链
- [x] 将页边界兜底 helper 内联回 `getPositionByXY()` 主链
- [x] 修复 fresh direct-drag 下 table selection 首字符丢失问题
- [x] 重新执行 `npm run lint`
- [x] 重新执行固定基线：
  - `table-selection-nonpaged`
  - `table-pagination-input`
  - `table-pagination-merged`
  - `table-pagination-mock`
- [x] 将 `CommandAdapt.getRangeContext()` 拆出局部组装 helper
- [x] 将 `RowRenderer.drawSelection()` 拆出跨行列 / 普通选区局部 helper
- [x] 将 `RowRenderer.drawRow()` 拆出逐元素分发与 range queue 局部 helper
- [x] 将 `RowRenderer.drawRow()` 主循环继续收口到 `renderRowElement()` 编排结构
- [x] 将 `Position.resolvePageDirectHit()` 内联回 `getPositionByXY()` 主链
