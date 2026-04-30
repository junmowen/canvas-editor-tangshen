# `Draw.ts` 模块化拆解方案

## 背景

## 当前状态

截至本轮重构，以下模块已经落地并接入 `Draw`：

1. `PageCanvasHost`
2. `DrawLayoutPipeline`
3. `PagePartitioner`
4. `DrawRenderPipeline`
5. `DrawPostRenderEffects`
6. `DrawMutationService`
7. `DrawExportService`
8. `DrawViewState`
9. `DrawDataAccess`
10. `DrawHistoryBridge`
11. `DrawPageSetupService`
12. `DrawValueService`
13. `DrawCursorService`
14. `DrawRuntime`
15. `DrawViewportService`
16. `DrawExportStateService`
17. `DrawComponentRegistry`
18. `DrawServiceRegistry`
19. `DrawStateQueryService`
20. `DrawMetricsService`
21. `DrawRenderFacadeService`
22. `DrawPainterService`
23. `DrawLifecycleService`

这意味着 `Draw.ts` 最重的几条职责链已经被拆开：

- page/canvas DOM 生命周期
- layout / pagination 计算
- render 分发
- render 后副作用
- 文档写操作
- 导出 / print mode

当前 [Draw.ts](/D:/canvas-editor/src/editor/core/draw/Draw.ts) 已经收缩到约 `718` 行。

当前 `Draw` 仍保留较多 getter 和部分运行时状态，主要是为了兼容现有依赖，避免一次性把整个编辑器外围模块全部改穿。

## 外围清理进展

内部模块化基本完成后，当前已经开始反向清理外围依赖，目标是减少外部模块对 `draw.getXxx()` 的直接耦合。

第一批已完成的低风险模块包括：

1. `GlobalEvent`
2. `ContextMenu`
3. `CommandAdapt` 的构造阶段依赖缓存
4. `Cursor` 的构造阶段依赖缓存
5. `CursorAgent`
6. `Zone`
7. `ZoneTip`
8. `Previewer`
9. `PageBorder`
10. `PageNumber`
11. `Background`
12. `Margin`
13. `Placeholder`
14. `LineNumber`
15. `ImageParticle`
16. `HyperlinkParticle`
17. `Shortcut`
18. `CanvasEvent`
19. `WorkerManager`
20. 运行期事件处理器：
   `mousedown` / `mousemove` / `backspace` / `delete`
21. 运行期事件处理器：
   `left` / `right` / `updown` / `click` / `mouseup`
22. 运行期事件处理器：
   `drag` / `cut` / `input` / `paste`
23. 运行期工具：
   `resolveSelectionStartState`
22. 内部 service 直连 registry：
   `DrawRenderPipeline` / `DrawRenderFacadeService` / `DrawLayoutPipeline`
23. 内部 service 直连 registry：
   `DrawPostRenderEffects` / `DrawViewportService` / `DrawExportStateService` / `DrawHistoryBridge`
24. 内部 service 直连 registry：
   `DrawStateQueryService` / `DrawMetricsService` / `DrawDataAccess` / `DrawExportService` / `DrawPageSetupService`
25. 内部 service 直连 registry：
   `DrawMutationService` / `DrawValueService` / `DrawCursorService`

这一阶段的原则是：

1. 优先迁移构造时缓存的稳定依赖
2. 优先改为读取 `draw.getComponents()` / `draw.getServices()` / `draw.getRuntime()`
3. 暂不大规模修改复杂业务方法内部的调用路径

这样可以先压低 `draw.getXxx()` 的高频入口，而不一次性把业务风险拉满。

## 已开始退役的 Facade Getter

在外围依赖迁移之后，已经有第一批 facade getter 被实际删除：

1. `getModalHost()`
2. `getPageContainer()`
3. `getCanvasEvent()`
4. `getWorkerManager()`

随后第二批也已删除：

5. `getGlobalEvent()`
6. `getTableOperate()`

第三批已删除：

7. `getOverlayPage()`
8. `getPageOverlayHost()`
9. `getPageOverlayHostList()`
10. `getPrintModeData()`
11. `getRuntimeRowList()`

第四批已删除：

12. `getVisiblePageNoList()`
13. `getIntersectionPageNo()`
14. `getRenderCount()`
15. `getCtx()`
16. `getCtxList()`
17. `getOverlayCtxList()`

第五批已删除：

18. `getTableNavigationService()`

第六批已删除：

19. `getContainer()`

## 已解决的保留型 Getter

此前一度被当作“必须保留的 bootstrap 稳定器”的 facade getter：

1. `getI18n()`
2. `getPreviewer()`
3. `getTableTool()`

已经通过构造注入和运行期迁移被真正清空并删除。

因此第七批已删除：

20. `getI18n()`
21. `getPreviewer()`
22. `getTableTool()`

第八批已删除：

23. `getPageRenderer()`
24. `getRenderInvalidationManager()`
25. `getTableLayoutSnapshotBuilder()`
26. `getDataAccess()`
27. `getRowLayoutEngine()`

第九批已删除：

28. `getMainHeight()`
29. `getCanvasWidth()`
30. `getCanvasHeight()`
31. `getPageNumberBottom()`
32. `getMarginIndicatorSize()`
33. `getHighlightMarginHeight()`
34. `getElementSize()`
35. `getElementRowMargin()`

这说明当前重构已经从“只拆内部结构”进入到“开始缩小 facade 表面积”的阶段。

## 当前真实结构

当前 `Draw` 内部已经基本变成三层持有者：

1. `runtime`
2. `components`
3. `services`

可以把它理解成：

- `DrawRuntime`: 持有运行时主状态
- `DrawComponentRegistry`: 持有重型组件实例
- `DrawServiceRegistry`: 持有流程型 service / pipeline / bridge
- `Draw`: 只负责 facade、兼容 getter 和少量 glue

当前这已经可以视为阶段性完成结构，而不是中间态。

## 当前继续推进方向

在 facade 表面积持续缩小之后，当前重构重点已经开始转向：

1. 让内部 service 之间更多直接依赖 `runtime/components/services`
2. 减少内部流程型 service 再次通过 `Draw` facade 兜一圈
3. 把 `Draw` 进一步收缩为真正的薄门面

这一阶段已经开始落地的代表模块：

- `DrawRenderPipeline`
- `DrawRenderFacadeService`
- `DrawLayoutPipeline`
- `DrawPostRenderEffects`
- `DrawViewportService`
- `DrawExportStateService`
- `DrawHistoryBridge`

它们已经在逐步改成直接读取 registry，而不是继续透过大量 `draw.getXxx()` 间接访问。

## 最终边界

## A. 最终保留的正式 Facade API

这类入口仍然承担主编辑器门面职责，当前建议作为长期保留接口：

1. 模式与状态：
   `getMode()` / `setMode()` / `isReadonly()` / `isDisabled()` / `isDesignMode()` / `isPrintMode()`
2. 尺寸与页面：
   `getWidth()` / `getHeight()` / `getInnerWidth()` / `getMargins()` / `getPageGap()` / `getPageNo()` / `setPageNo()` / `getPage()` / `getPageList()` / `getPageCount()`
3. 数据与值：
   `getValue()` / `getOriginValue()` / `setValue()` / `setEditorData()` / `getElementList()` / `getOriginalElementList()` / `getOriginalMainElementList()`
4. 编辑入口：
   `insertElementList()` / `appendElementList()` / `spliceElementList()`
5. 渲染入口：
   `render()` / `scheduleFrameRender()` / `flushScheduledFrameRender()` / `refreshVisibleOverlay()` / `refreshVisiblePagesIfNeeded()`
6. 导出与打印：
   `getDataURL()` / `setPrintData()` / `clearPrintData()`
7. 生命周期：
   `destroy()` / `clearSideEffect()`

这些入口已经接近“最终门面”。

## B. 当前仍保留的内部桥接入口

这类 getter 主要仍然服务于内部模块协作，短期可保留，但不建议对外扩散新依赖：

1. `getRuntime()`
2. `getComponents()`
3. `getServices()`
4. `getPageCanvasHost()`
5. `getTableLayoutSnapshotAccessor()`
6. `getTableLayoutSnapshot()`
7. `getViewState()`
8. `getOptions()`
9. `getRange()`
10. `getPosition()`

这些更接近内部接线板，而不是业务 API。

## C. 后续可选退役候选

如果后续还要继续减 `Draw` 表面积，可以优先观察这些入口：

1. `getWordLikeReg()`
2. `getTableRowList()` / `getOriginalRowList()` / `getRowList()`
3. `getLayoutMainElementList()`
4. `getPainterStyle()` / `getPainterOptions()` / `setPainterStyle()` / `setDefaultRange()`
5. 一组纯组件代理：
   `getBackground()` / `getMargin()` / `getPageNumber()` / `getLineNumber()` / `getPageBorder()` / `getBadge()` 等

这些不一定需要当前轮次继续处理，但已经可以列入下一阶段候选。

## D. 收官判断

当前更合理的判断不是“还有没有 getter 能删”，而是：

1. `Draw` 是否已经从 2000+ 行降到可维护区间：是
2. render / layout / mutation / export / lifecycle 是否已完成分层：是
3. 构造期 bootstrap 风险是否被显式识别并建立约束：是
4. 外围模块是否已经开始反向依赖 registry 而不是一味走 facade：是

基于以上四点，这一轮重构已经达到可交付的阶段性完成态。

## 收官审计

当前 `Draw` 上剩余 getter 可以按三类理解：

### A. 核心 facade，短期应保留

这些入口仍然承担编辑器主门面职责，短期不建议继续删除：

1. `getMode()`
2. `getOptions()`
3. `getPageNo()`
4. `getPage()`
5. `getPageList()`
6. `getPageCount()`
7. `getWidth()` / `getHeight()` / `getInnerWidth()` / `getMargins()` / `getPageGap()`
8. `getValue()` / `getOriginValue()`
9. `getElementList()` / `getOriginalElementList()` / `getOriginalMainElementList()`
10. `getRange()` / `getPosition()`

这些不是简单的内部过渡接口，而是仍然被大量外部模块和运行期逻辑消费。

### B. 内部过渡入口，继续收口

这些 getter 主要已经是给内部模块过渡使用，应继续通过 registry 直连逐步削减：

1. `getTableLayoutSnapshotAccessor()`
2. `getTableOverlayRenderer()`
3. `getSearch()`
4. `getControl()`
5. `getHeader()` / `getFooter()`
6. `getTableParticle()` / `getImageParticle()` / `getHyperlinkParticle()` / `getDateParticle()`

### C. 下一批可退役候选

从当前调用分布看，下面这些已经进入下一批退役候选：

1. `getWordLikeReg()`
2. `getTableRowList()` / `getOriginalRowList()` / `getRowList()`
3. `getLayoutMainElementList()`
4. `getPainterStyle()` / `getPainterOptions()` / `setPainterStyle()` / `setDefaultRange()`
5. `getTableOverlayRenderer()`
6. 一组调用量极低的纯组件代理 getter

这批的共同点是：

- 要么调用量已经很低
- 要么主要只剩内部模块消费
- 要么已经可以由 `runtime/components/services/pageCanvasHost` 直接替代

### D. 当前不建议优先再删的入口

这些入口虽然看起来也是 getter，但当前仍处于高频路径，不建议继续优先拿它们开刀：

1. `getPosition()`
2. `getRange()`
3. `getOptions()`
4. `getElementList()`
5. `getOriginalElementList()`
6. `getPageCanvasHost()`
7. `getComponents()`
8. `getServices()`
9. `getRuntime()`

它们更像当前架构的基础接线板，短期继续删收益不高，风险更高。

## 构造期约束

这一轮重构还暴露了一个非常关键的工程事实：  
`Draw` 的很多子对象在构造函数内会立即通过 `draw.getXxx()` 反查其它对象。

这意味着不能简单假设：

1. `this.components = new DrawComponentRegistry(...)` 之前没人会访问 `components`
2. `this.services = new DrawServiceRegistry(...)` 之后赋值就立刻全局可见

实际上，像下面这些链路都已经证明会发生构造期反查：

- `PageCanvasHost` 构造时会调用 `draw.getWidth()` / `draw.getHeight()`
- `Zone` 构造时会调用 `draw.getI18n()`
- `RangeManager` 构造时会调用 `draw.getPosition()` / `draw.getHistoryManager()`
- `TableOperate` 构造时会调用 `draw.getTableTool()` / `draw.getTableParticle()`
- `GlobalEvent` 构造时会调用 `draw.getPreviewer()` / `draw.getControl()` / `draw.getDateParticle()` 等

因此，当前代码已经引入一套明确的 bootstrap 规则：

1. 构造早期会被访问的基础状态优先从 `runtime` / `viewState` 直接兜底
2. 构造中存在互相反查的重型对象，需要先写入 bootstrap 引用
3. facade getter 必须允许：
   - 优先读取正式 `components`
   - 退回读取 bootstrap 对象

这个约束是当前架构成立的前提，后续继续重构时不能破坏。

补充一条非常重要的执行规则：

1. 处于 `DrawComponentRegistry` 构造链上的模块
   例如 `Zone`、`RangeManager`、`Placeholder`、`TableOperate`、`GlobalEvent`
   不应直接读取 `draw.getComponents()`
2. 这些模块必须继续通过 bootstrap-safe 的 facade getter 访问依赖
3. 只有在 `components` 已稳定就绪之后创建或运行的模块，才适合改成直接读 `draw.getComponents()`

否则就会重新引入构造期空引用回归。

`Draw.ts` 最初约 `2076` 行，已经不是单纯的“绘制类”，而是编辑器运行时的聚合内核。它同时承担了以下职责：

1. 运行时状态容器
2. DOM / Canvas 生命周期管理
3. 文档布局与分页编排
4. 渲染调度与脏区刷新
5. 编辑数据读写
6. 导出态切换
7. 光标、选区、历史、事件回调编排
8. 各类粒子 / frame / observer / service 的依赖装配

这导致几个直接问题：

1. 任意改动都容易牵一发而动全身
2. `render()` 成为绝对热点方法，难以验证副作用边界
3. `setValue` / `insertElementList` / `spliceElementList` 同时操作数据、选区、渲染、历史
4. 页面 DOM、Canvas 尺寸、分页计算、可见页渲染互相交织
5. `Draw` 暴露了大量 getter，外围模块几乎把它当 service locator 使用

结论很明确：这个文件应该被拆成“运行时协调器 + 若干明确子系统”，而不是继续在 `Draw` 内部追加方法。

---

## 现状拆解

## 1. 当前职责分布

### A. 运行时装配与依赖注入

构造函数中完成了大量对象初始化与注册：

- frame: `Header` / `Footer` / `Margin` / `Background` / `PageNumber` / `LineNumber` / `PageBorder` / `Watermark` / `Placeholder` / `Badge`
- particle: `TextParticle` / `ImageParticle` / `TableParticle` / `DateParticle` / `ListParticle` 等
- manager / service: `HistoryManager` / `RangeManager` / `Position` / `WorkerManager` / `RenderInvalidationManager`
- observer / event: `ScrollObserver` / `SelectionObserver` / `MouseObserver` / `CanvasEvent` / `GlobalEvent`

问题：

- 构造函数承担了装配根、初始化顺序控制、事件注册、首次渲染启动四类职责
- 任一依赖调整都需要改 `Draw` 构造函数

### B. 配置与运行时状态访问

从 `getWidth()` 到 `getControl()`，`Draw` 内存在大量 getter。它们本质上覆盖了：

- 页面配置读取
- 当前页 DOM 读取
- 主文档 / 页眉 / 页脚 / 表格上下文数据读取
- 渲染器 / observer / 粒子访问

问题：

- `Draw` 已经成为全局上下文对象
- 子模块对 `Draw` 的访问没有边界，后续拆分会被双向耦合拖住

### C. 编辑数据写操作

核心入口：

- `insertElementList()`
- `appendElementList()`
- `spliceElementList()`
- `setValue()`
- `setEditorData()`

这些方法同时处理：

- 数据格式化
- 控件内写入与普通写入分流
- 列表修正
- 删除规则校验
- 选区更新
- 渲染触发
- 历史提交

问题：

- “文档变更”没有独立抽象
- 写操作和 UI 副作用耦合过深

### D. 页面 / Canvas / Overlay DOM 生命周期

相关方法：

- `_wrapContainer()`
- `_formatContainer()`
- `_createModalHost()`
- `_createPageContainer()`
- `_createPageWrapper()`
- `_createPageOverlayHost()`
- `_createLayerCanvas()`
- `_createPage()`
- `setPageScale()`
- `setPageDevicePixel()`
- `setPaperSize()`
- `setPaperDirection()`
- `setPageMode()`

问题：

- 页面 DOM 创建、Canvas dpr 更新、模式切换尺寸变更散落在多个方法
- 同一段“重设 page/canvas/overlay/wrapper 尺寸”的逻辑重复出现多次

### E. 布局与分页

相关方法：

- `computeRowList()`
- `_computePageList()`
- `render()` 内部的 header/footer compute、rowList 计算、pageRowList 计算、position 计算、area 计算

问题：

- 行布局虽然已由 `RowLayoutEngine` 接手，但分页逻辑仍留在 `Draw`
- `render()` 里既做布局，又做后处理，又做副作用恢复

### F. 渲染调度

相关方法：

- `scheduleFrameRender()`
- `flushScheduledFrameRender()`
- `refreshVisibleOverlay()`
- `_lazyRender()`
- `_immediateRender()`
- `_visiblePageRender()`
- `refreshVisiblePagesIfNeeded()`
- `render()`

问题：

- `Draw.render()` 兼具“布局编排器 + 渲染入口 + 提交后副作用调度器”
- 渲染模式分支很多：懒渲染、可见页渲染、立即渲染、overlay 刷新

### G. 导出与打印模式

相关方法：

- `setPrintData()`
- `clearPrintData()`
- `_getExportData()`
- `_captureExportRenderState()`
- `_restoreExportRenderState()`
- `getDataURL()`

问题：

- 导出通过“暂时篡改整个 Draw 运行时状态”完成
- 可工作，但维护成本高，异常恢复和状态一致性风险大

### H. 历史、光标、清理

相关方法：

- `setCursor()`
- `submitHistory()`
- `clearSideEffect()`
- `destroy()`

问题：

- 历史快照依赖 `Draw` 当前完整状态
- 销毁逻辑没有统一生命周期管理器

---

## 2. 当前最应该拆的三个耦合中心

### 第一优先级：`render()`

`render()` 同时负责：

1. 取消计划中的帧渲染
2. layout dirty 标记
3. header/footer compute
4. rowList 计算
5. pageRowList 计算
6. position compute
7. table snapshot build
8. area/search/control highlight compute
9. page DOM 补齐 / 删除
10. 渲染模式分发
11. cursor 恢复
12. history 提交
13. listener/eventBus 回调

这说明它不是“一个方法太长”，而是“一个 use case 聚合了多个子系统”。

### 第二优先级：文档变更入口

`insertElementList()` / `appendElementList()` / `spliceElementList()` / `setValue()` 实际上是在实现“文档命令”。  
但现在没有 `DocumentMutationService` 或 `Command` 层，导致：

- 数据规则和 UI 副作用混在一起
- 很难单测“改数据但不渲染”的场景

### 第三优先级：页面 DOM / 尺寸管理

页面、overlay、wrapper、dpr、scale、page mode 的操作高度重复，应抽成独立基础设施层，否则后续分页/可见区优化都仍会卡在 `Draw`。

---

## 目标架构

## 总体原则

拆分目标不是把一个大类切成很多“工具类”，而是建立明确的运行时分层：

1. `Draw` 退化为门面与协调器
2. 纯状态与纯计算从 `Draw` 剥离
3. DOM / Canvas 基础设施独立
4. 文档写操作独立为 mutation 层
5. 渲染编排独立为 pipeline 层

建议最终结构如下：

```text
draw/
  Draw.ts                       // 对外门面，尽量薄
  runtime/
    DrawRuntime.ts              // 运行时聚合状态
    DrawDependencyRegistry.ts   // 依赖装配
  dom/
    PageCanvasHost.ts           // 页面 DOM/canvas 生命周期
    PageCanvasScaler.ts         // scale/dpr/size 更新
  data/
    DrawDataAccess.ts           // header/main/footer/table 上下文读取
    DrawMutationService.ts      // insert/append/splice/setValue
    DrawExportService.ts        // print/export/dataURL
  layout/
    DrawLayoutPipeline.ts       // header/footer/row/page/position/area/search
    PagePartitioner.ts          // 从 rowList -> pageRowList
  render/
    DrawRenderPipeline.ts       // immediate/lazy/visible 渲染分发
    DrawPostRenderEffects.ts    // cursor/history/callback/control/tableTool
  state/
    DrawViewState.ts            // pageNo/visiblePageNoList/intersectionPageNo
    DrawRenderState.ts          // renderCount/layout cache/snapshot version
  history/
    DrawHistoryBridge.ts        // 提交历史与恢复渲染
```

---

## 模块边界设计

## 1. `DrawRuntime` 或 `DrawContext`

### 职责

- 保存运行时共享对象引用
- 作为内部模块协作上下文
- 限制直接暴露给子模块的能力边界

### 应包含

- `options`
- `listener`
- `eventBus`
- `override`
- `header/footer/control/range/position/...` 等核心依赖
- 只保留最少量共享状态

### 不应包含

- 大量对外 getter
- DOM 创建逻辑
- 写操作逻辑

### 价值

- 后续模块不再直接依赖整个 `Draw`
- 可以逐步把 `new Xxx(this)` 改为 `new Xxx(runtime)`

---

## 2. `PageCanvasHost`

### 职责

- 管理 `container / modalHost / pageContainer`
- 管理 `pageWrapperList / pageList / overlayPageList / pageOverlayHostList`
- 创建和删除页面 DOM
- 初始化 canvas context
- 提供批量 resize / rescale / reset dpr 能力

### 应收拢的方法

- `_wrapContainer()`
- `_formatContainer()`
- `_createModalHost()`
- `_createPageContainer()`
- `_createPageWrapper()`
- `_createPageOverlayHost()`
- `_createLayerCanvas()`
- `_createPage()`
- `_initPageContext()`

### 继续下沉的重复逻辑

以下几类重复代码应统一为一个入口：

- 更新 base canvas 尺寸
- 更新 overlay canvas 尺寸
- 更新 overlay host 尺寸
- 更新 wrapper 尺寸
- 根据 dpr 重新初始化 context

建议接口：

```ts
pageCanvasHost.ensurePageCount(count: number): void
pageCanvasHost.resizeAllPages(): void
pageCanvasHost.resizeContinuousPage(height: number): void
pageCanvasHost.getPageCanvases(): HTMLCanvasElement[]
```

---

## 3. `DrawViewState`

### 职责

- 管理页面级 UI 状态
- 负责状态变化时的 listener / eventBus 通知

### 应承接的字段

- `pageNo`
- `visiblePageNoList`
- `intersectionPageNo`
- `pagePixelRatio`
- `renderCount`

### 应承接的方法

- `getVisiblePageNoList()` / `setVisiblePageNoList()`
- `getIntersectionPageNo()` / `setIntersectionPageNo()`
- `getPageNo()` / `setPageNo()`
- `getRenderCount()`
- `getPagePixelRatio()` / `setPagePixelRatio()`

### 价值

- 消除 `Draw` 中大量机械 getter/setter
- 让可见页状态与文档数据状态分离

---

## 4. `DrawDataAccess`

### 职责

- 统一处理 header / main / footer / table cell 场景下的数据读取
- 统一“当前激活上下文”的解析

### 应收拢的方法

- `getOriginalElementList()`
- `getElementList()`
- `getMainElementList()`
- `getHeaderElementList()`
- `getFooterElementList()`
- `getTableElementList()`
- `getTd()`
- `getOriginalRowList()`
- `getRowList()`
- `getTableRowList()`

### 价值

- 避免每个模块都重复判断 zone / table context
- 这是后续削减 getter 数量的关键切口

---

## 5. `DrawMutationService`

### 职责

- 负责所有文档写操作
- 明确区分“数据变更”和“渲染/历史副作用”

### 应收拢的方法

- `insertElementList()`
- `appendElementList()`
- `spliceElementList()`
- `setValue()`
- `setEditorData()`

### 推荐拆成两层

#### A. 纯 mutation 层

只返回结果，不直接 render：

```ts
type MutationResult = {
  curIndex?: number
  contentChanged: boolean
  requiresCompute: boolean
  shouldSubmitHistory: boolean
}
```

#### B. orchestration 层

负责在 mutation 后调用：

- `range.setRange`
- `render(...)`
- `history` 处理

### 价值

- 后续可以做批处理写操作
- 能单测删除规则、列表修正、控件写入分流

---

## 6. `PagePartitioner`

### 职责

- 专门负责 `rowList -> pageRowList`
- 处理连续页和分页模式差异
- 处理表格跨页 fragment

### 应收拢的方法

- `_computePageList()`

### 这个模块特别重要的原因

目前 `_computePageList()` 里混了：

- 纯分页算法
- 连续页高度调整
- DOM page 高度更新
- 超页数裁剪 `elementList`

这四件事不应该放在一起。

### 建议再拆两段

1. `PagePartitioner.partitionRows(rowList, options) => PagePartitionResult`
2. `PageCanvasHost.applyContinuousHeight(height)`

其中 `partitionRows` 不应该直接改 DOM，也尽量不要直接裁剪 `elementList`。  
如果必须裁剪，应通过明确结果返回：

```ts
type PagePartitionResult = {
  pageRowList: IRow[][]
  truncatedMainElementEndIndex?: number
  continuousHeight?: number
}
```

---

## 7. `DrawLayoutPipeline`

### 职责

把 `render()` 中“计算阶段”的逻辑完整接走。

### 建议包含的步骤

1. 更新 `tableLayoutSnapshotVersion`
2. 清空浮动定位缓存
3. 计算 header/footer
4. 计算 `rowList`
5. 计算 `pageRowList`
6. 生成 `layoutElementList`
7. 计算 `positionList`
8. 重建 table snapshot
9. 计算 `area`
10. 计算 `search`
11. 计算 control highlight

### 建议接口

```ts
layoutPipeline.compute({
  isPagingMode,
  isPrintMode,
  elementList
}): LayoutResult
```

### `LayoutResult` 至少包含

- `rowList`
- `pageRowList`
- `layoutElementList`
- `tableLayoutSnapshot`
- `pageCount`
- `continuousPageHeight?`

---

## 8. `DrawRenderPipeline`

### 职责

- 根据渲染策略决定走 lazy / visible / immediate
- 处理 `RenderInvalidationManager` 状态流转
- 管理页面数量与页面渲染入口

### 应接手的方法

- `_lazyRender()`
- `_immediateRender()`
- `_visiblePageRender()`
- `refreshVisiblePagesIfNeeded()`
- `refreshVisibleOverlay()`
- `scheduleFrameRender()`
- `flushScheduledFrameRender()`

### 注意点

现在 `renderInvalidationManager` 的 clear/mark 调用散布在 `Draw.render()` 中。  
应把这些 dirty flag 转换逻辑封装到 pipeline 内部，不要让 `Draw` 手工控制每个标志位。

---

## 9. `DrawPostRenderEffects`

### 职责

统一处理“渲染完成后”的副作用。

### 应收拢的内容

- `setCursor()`
- `submitHistory()`
- `range.setRangeStyle()`
- `control.reAwakeControl()`
- `tableTool.render()`
- `zone.drawZoneIndicator()`
- `pageSizeChange` 回调
- `contentChange` 回调

### 为什么必须单独拆

`render()` 现在的难点不是计算本身，而是“算完之后还有很多条件副作用”。  
拆出 post-render 层后，`render()` 才可能简化为：

```ts
layoutResult = layoutPipeline.compute(...)
renderPipeline.render(layoutResult, payload)
postRenderEffects.run(payload, layoutResult)
```

---

## 10. `DrawExportService`

### 职责

- 管理打印态和导出态
- 避免导出逻辑直接污染主运行时

### 应收拢的方法

- `setPrintData()`
- `clearPrintData()`
- `_getExportData()`
- `_captureExportRenderState()`
- `_restoreExportRenderState()`
- `getDataURL()`

### 中期优化方向

最理想的方式不是“改写当前 `Draw` 再恢复”，而是：

1. 创建独立 export runtime
2. 使用独立 page host 做离屏渲染
3. 导出结束后直接销毁 export runtime

这样主编辑器状态完全不被触碰。

---

## `Draw.ts` 最终应保留什么

`Draw` 作为对外类，最终建议只保留以下内容：

1. 对外公开 API 门面
2. 子系统实例装配
3. 少量兼容性 getter
4. `render()` 的高层协调调用
5. `destroy()`

理想状态下，`Draw.ts` 应控制在 `300~500` 行，而不是 2000+ 行。

---

## 推荐的拆分顺序

## Phase 1: 先做“无行为变化”的基础拆分

目标：先降低文件体积和重复代码，不改业务路径。

### 1. 抽 `PageCanvasHost`

优先级最高，原因：

- 风险低
- 重复代码多
- 对后续分页和渲染优化帮助最大

第一步迁移：

- 所有 page/canvas/overlay/wrapper 列表字段迁移到 host
- `_createPage*` / `_initPageContext` 全部迁移
- `setPageScale` / `setPageDevicePixel` / `setPaperSize` / `setPaperDirection` 内的尺寸调整逻辑改为调用 host

### 2. 抽 `DrawViewState`

迁移：

- `pageNo`
- `visiblePageNoList`
- `intersectionPageNo`
- `pagePixelRatio`
- `renderCount`

收益：

- 先砍掉一批机械访问器

### 3. 抽 `DrawDataAccess`

迁移：

- element / row / td / header / footer / table context 读取逻辑

收益：

- 后续 mutation、layout、history 都能依赖统一访问层

---

## Phase 2: 把 `render()` 切成三段

### 1. `DrawLayoutPipeline`

把所有 compute 逻辑从 `render()` 拆出去。

### 2. `DrawRenderPipeline`

把页面创建/裁剪、lazy/visible/immediate 分发拆出去。

### 3. `DrawPostRenderEffects`

把 cursor/history/callback/control/tableTool/zone indicator 拆出去。

完成这一阶段后，`Draw.render()` 就不再是 180+ 行的中心方法。

---

## Phase 3: 重构数据写入口

### 拆 `DrawMutationService`

建议把当前写入流程标准化为：

1. 校验上下文
2. 规范化 payload
3. 执行 mutation
4. 返回 mutation result
5. orchestration 层决定是否 render/history

这一阶段完成后：

- 所有编辑命令都有统一入口
- 以后做事务、批量操作、撤销优化会容易很多

---

## Phase 4: 拆导出与历史桥接

### 1. `DrawExportService`

处理打印模式和离屏导出。

### 2. `DrawHistoryBridge`

把 `submitHistory()` 中“恢复状态并 render”的桥接逻辑独立出来。

---

## 具体落地建议

## 建议不要一开始就做的事情

### 不建议立即做完整 DI 改造

`new Xxx(this)` 很多，但第一阶段不要试图一次性改成完整依赖注入。  
先让新模块仍依赖 `Draw` 或窄化版 `runtime`，逐步收口。

### 不建议先删 getter

getter 太多，但它们是兼容层。  
第一阶段可以保留，由 `Draw` 转发到新模块；等外围代码迁移后再删除。

### 不建议先动 observer / particle 体系

它们数量多、依赖分散，不是当前主战场。  
现在最大的问题是 `Draw` 自己太厚，不是粒子类太多。

---

## 第一阶段可直接执行的文件拆分清单

建议先新增这些文件：

```text
src/editor/core/draw/dom/PageCanvasHost.ts
src/editor/core/draw/state/DrawViewState.ts
src/editor/core/draw/data/DrawDataAccess.ts
src/editor/core/draw/layout/PagePartitioner.ts
src/editor/core/draw/layout/DrawLayoutPipeline.ts
src/editor/core/draw/render/DrawRenderPipeline.ts
src/editor/core/draw/render/DrawPostRenderEffects.ts
src/editor/core/draw/data/DrawMutationService.ts
src/editor/core/draw/data/DrawExportService.ts
```

建议第一批真正迁移代码的顺序：

1. `PageCanvasHost`
2. `DrawViewState`
3. `DrawDataAccess`
4. `PagePartitioner`
5. `DrawLayoutPipeline`
6. `DrawRenderPipeline`
7. `DrawPostRenderEffects`
8. `DrawMutationService`
9. `DrawExportService`

---

## 风险点与规避策略

## 1. 历史记录回放依赖当前隐式状态

风险：

- `submitHistory()` 依赖 `zone/pageNo/positionContext/range/header/footer/main`

规避：

- 先建立 `DrawSnapshot` 类型
- 历史只依赖快照结构，不直接依赖 `Draw` 字段集合

## 2. 表格跨页与可见页渲染容易回归

风险：

- `_computePageList()` 与表格 fragment 行逻辑耦合

规避：

- 给 `PagePartitioner` 单独补回归测试
- 至少覆盖：普通段落、分页符、跨页表格、最大页数截断、连续页高度调整

## 3. DOM host 和 render pipeline 的职责边界不清

风险：

- 可能出现“哪里都能改 pageList”的老问题复发

规避：

- `pageList` 等数组不要再由 `Draw` 直接暴露可写引用
- 通过 host 提供只读访问器或受控方法

## 4. 对外 API 兼容风险

风险：

- 外部代码可能大量依赖 `draw.getXxx()`

规避：

- `Draw` 继续保留兼容方法
- 内部先迁移实现，不急着改对外接口

---

## 一个现实可执行的最小方案

如果希望先用最小代价把维护成本打下来，我建议只做下面 3 步：

1. 抽 `PageCanvasHost`
2. 抽 `DrawLayoutPipeline`
3. 抽 `DrawMutationService`

只做这三步，就能解决当前 70% 的维护痛点：

- 页面 DOM 与尺寸更新不再四处重复
- `render()` 大幅瘦身
- 文档写操作有统一边界

这是最有性价比的一版。

---

## 建议的验收标准

完成拆分后，至少满足以下标准：

1. `Draw.ts` 下降到 `500` 行以内
2. `render()` 主体控制在 `40~60` 行
3. 不再出现 4 处以上重复的 page/canvas resize 代码
4. `insert/append/splice/setValue` 不再直接混写所有副作用
5. `rowList -> pageRowList` 算法不再直接操作 DOM

---

## 最终判断

这个文件不是“再整理一下就行”，而是已经到了必须分层的程度。  
最合理的拆法不是按“方法数量平均分文件”，而是按运行时职责切成：

- DOM Host
- 视图状态
- 数据访问
- 文档变更
- 布局管线
- 渲染管线
- 渲染后副作用
- 导出服务

按这个顺序推进，既能控制风险，也能在每个阶段都看到 `Draw.ts` 明显变薄。
