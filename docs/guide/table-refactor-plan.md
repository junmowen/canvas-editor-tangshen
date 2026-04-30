# 表格与分页选区系统重构方案

## 1. 背景

当前表格系统已经具备以下能力：

- 逻辑表格与分页 fragment
- 跨页单元格渲染
- 表格内文字选区
- 合并单元格跨页选区
- 鼠标点击、拖选、键盘导航、复制

但在实际维护中，系统暴露出明显的结构性问题：

- 选区语义分散，边界解释不统一
- 命中测试、分页映射、渲染修补相互耦合
- 鼠标与键盘对同一行为存在多套规则
- 表格分页后，逻辑单元格、布局片段、页面字符盒之间缺少单一事实来源
- 拖选、移动光标、跨页导航时存在较高的全量计算成本
- Bug 往往表现为“多一个字符 / 少一个字符 / 错页高亮 / 同步不一致”，且修复后容易从别处分叉

本方案的目标不是继续修补现有链路，而是对表格、分页、选区、导航、渲染进行破坏性重构，建立一套长期可维护的架构。

---

## 当前状态摘要

截至 `2026-04-21`，当前实现与本方案的关系可以直接收束为：

| 阶段 | 当前判断 | 说明 |
| --- | --- | --- |
| 阶段 1 | 已完成 | 统一选区投影主链已落地，`RangeManager / CommandAdapt / RowRenderer` 已围绕同一套公开投影与内部编辑边界收口。 |
| 阶段 2 | 已完成 | `TableHitTestService` 已成为唯一真实表格命中入口，旧 `Position -> table` 递归命中已物理删除。 |
| 阶段 3 | 已完成 | `TableNavigationService` 已承接并稳定覆盖主导航规则。 |
| 阶段 4 | 已完成 | snapshot accessor / builder / page-fragment / logical-cell / slice 索引都已进入真实主链。 |
| 阶段 5 | 已完成 | overlay、per-page host、visible-only、dirty/invalidation、overlay-only highlight、离屏导出都已落地。 |
| 阶段 6 | 已完成 | 当前阶段定义下的旧链路删除与主链收口任务已完成。 |

### 当前结论

1. 当前没有发生架构方向偏离。
2. 当前主要问题不是路线错误，而是状态信息需要从“流水账”收束成“阶段判断”。
3. 当前阶段已从“搭主干 + 删旧壳”收束到“主链稳定、进入持续优化”的状态。

### 当前阶段后的剩余项

- 后续仍可继续削薄 `Position / CommandAdapt / RowRenderer` 这类热点大方法的内部层级。
- 后续仍可继续把回归白名单独立文档化，避免阶段日志和验证清单耦合。
- 这些事项当前不再构成阶段性阻塞，更适合作为下一轮持续优化处理。
- `2026-04-21`：`Position.getSelectionPositionList()` 这层只剩单一消费面的公开薄壳也已删除，`CommandAdapt.getRangeContext()` 现已直接基于 `RangeManager.getSelectionContentRange()` 与 `position.getPositionList()` 组装选区位置上下文；`Position` 不再继续持有只服务命令层上下文拼装的跨域包装方法。对应 `npm run type:check`、`npm run lint` 与固定 47 条表格回归再次单次全绿。
- `2026-04-21`：`Control.getRange()` 这层仅转发 `getEditBoundaryRange()` 的旧壳也已删除，控件域内部相关调用已直接切到显式编辑边界接口；控件主链不再额外保留一层“旧 range 名称兼容壳”。对应 `npm run type:check`、`npm run lint` 与固定 47 条表格回归再次单次全绿。
- `2026-04-21`：随后，`CommandAdapt.getActivePublicRange()/getActiveEditBoundaryRange()` 这两层私有 range 转发壳也已继续删除，内部调用点已直接改为消费公开 `getRange()` 或 `range.getEditBoundaryRange()`；命令层内部的 range 读取路径进一步压平。对应 `npm run type:check`、`npm run lint` 与固定 47 条表格回归再次单次全绿。
- `2026-04-21`：`Draw` 里 `drawRow()/drawSelection()` 与 `_lazyRender()/_immediateRender()/_visiblePageRender()` 这几条渲染主链也已继续宿主化：`RowRenderer` 与 `PageRenderer` 不再每次临时 `new`，而是提升为 draw 级成员复用；渲染主链继续朝“draw 统一宿主 + 更少临时对象”收口。对应 `npm run type:check`、`npm run lint` 与固定 47 条表格回归再次单次全绿。
- `2026-04-21`：控件域中 `Control.getContainer()/getPosition()/getPreY()` 这三层只服务 popup / picker 宿主定位的包装接口也已删除，`SelectControl` 与 `DateControl` 已改为直接消费 `control.getDraw()` 下的真实宿主对象；控件子域继续减少“Control 再转发一层”的旧包装。对应 `npm run type:check`、`npm run lint` 与固定 47 条表格回归再次单次全绿。
- `2026-04-21`：继续往下，`Control.getElementList()` 这层跨域包装接口也已物理删除，`Control` 本体与 `CheckboxControl / RadioControl / TextControl / SelectControl / DateControl` 已统一直接消费 `draw.getElementList()` 或 `control.getDraw().getElementList()`；控件域对“Control 帮子类转发 elementList”的历史壳层继续出清。对应 `npm run type:check`、`npm run lint` 与固定表格回归复跑通过；期间出现过一次 `canvas[data-index]` 的 `beforeEach` 环境波动，重跑受影响 spec 后恢复全绿。
- `2026-04-21`：`RowRenderer` 内部 selection / 正文绘制里重复的 table 子单元格递归遍历也已收成同一条 `forEachTableCellPayload()` 路径，表格子单元格 payload 组装不再在 `drawSelection()` 与 `drawRow()` 中各自维护一份；渲染主链内部重复逻辑继续下降。对应 `npm run type:check`、`npm run lint` 与固定 47 条表格回归再次单次全绿。
- `2026-04-21`：继续往下，`RowRenderer` 中 `drawHighlight()/drawSelection()/drawRow()` 三处各自维护的 row-position 切片循环也已收成同一条 `forEachRowPositionSlice()` 路径；这一轮完整固定回归中曾出现过一次 `table-pagination-merged` 的 `canvas[data-index]` `beforeEach` 环境波动，但重跑受影响 spec 后恢复全绿，说明本轮变更本身未引入行为回归。

### 当前验证基线

- `npm run type:check`
- `npm run lint`
- `cypress/e2e/menus/table-selection-nonpaged.cy.ts`
- `cypress/e2e/menus/table-pagination-input.cy.ts`
- `cypress/e2e/menus/table-pagination-merged.cy.ts`
- `cypress/e2e/menus/table-pagination-mock.cy.ts`

上述基线在最近数轮阶段 6 收口后均已反复通过，可视为当前阶段判断的事实基础。

---

## 2. 当前核心问题

### 2.1 选区存在三套语义

当前系统至少存在三套并行的选区解释：

1. `RangeManager` 中保存的原始边界范围
2. `CommandAdapt` 暴露给外部的公开范围与公开光标
3. `RowRenderer` 用于高亮绘制的渲染范围

这导致同一个操作在不同链路下会出现不同结果：

- 复制结果正确，但高亮错一位
- 点击后拖选正确，直接拖选错一位
- 当前页看起来正常，下一页被误高亮
- later fragment 起点逻辑正确，但公开索引不正确

### 2.2 `Position` 承担职责过多

`Position` 当前同时负责：

- 普通文字命中
- 表格命中
- 递归命中单元格文字
- 分页 fragment 绝对索引映射
- 命中后上下文写入
- 控件光标校正
- 图片与浮动元素命中

这使得 `getPositionByXY()` 成为高风险热点方法，任何一个坐标问题都会扩散到多个功能。

### 2.3 事件层中存在补丁型状态

当前拖选初始化依赖多个补丁字段：

- `dragAnchorIndex`
- `dragAnchorEndIndex`
- `collapseToIndex`
- `hitLineStartIndex`
- `mouseDownIndex`

这些字段并不是统一模型的一部分，而是在修补不一致链路时逐渐增加的中间态。字段越多，说明系统越依赖经验性补丁。

### 2.4 渲染层存在业务修补逻辑

`RowRenderer` 中已经存在以下类型的补救行为：

- 修上一字符盒
- 修非当前 fragment 的幽灵高亮
- 修选区边界残留

这说明渲染层不得不为上游状态错误兜底。只要数据层与语义层不统一，渲染层的补丁会不断增加。

### 2.5 键盘导航逻辑分散

以下操作都直接内嵌了分页表格规则：

- 左右移动
- 上下移动
- Delete
- Backspace

这些规则分散在多个 keydown handler 中，维护难度高，规则一致性差，扩展新行为时容易破坏旧行为。

### 2.6 性能模型偏全量

高频交互例如：

- 鼠标拖选
- 光标移动
- 跨页跳转
- later fragment 起点点击

本质上只需要更新局部状态与局部高亮，但当前实现经常触发：

- 全量布局
- 全量位置重算
- 多页 canvas 重绘

这会直接限制表格场景的性能上限。

---

## 3. 重构目标

### 3.1 功能目标

- 点击、拖选、键盘、复制、公开 API 全部使用同一套选区语义
- 分页 fragment 与 merged 单元格使用统一的边界模型
- 消除“多一个字符 / 少一个字符 / 串页高亮 / 复制与高亮不一致”类问题
- 后续新增整列选择、整行选择、批注、协同选区时不再重写底层规则

### 3.2 结构目标

- 建立单一事实来源
- 建立只读布局快照
- 建立统一选区快照与投影服务
- 把命中测试、导航、变更、渲染解耦

### 3.3 性能目标

- 拖选不再触发不必要的全量布局
- 选区与光标优先走 overlay 层刷新
- 分页表格命中与导航尽量使用预索引缓存

---

## 4. 目标架构

建议将系统拆成以下 6 个中心模块。

### 4.1 `TableDocumentModel`

职责：唯一可变的逻辑表格数据模型。

只保存：

- 逻辑表格
- 逻辑行
- 逻辑单元格
- 文本元素
- 合并关系
- 业务属性

禁止保存：

- 页面坐标
- 字符盒坐标
- 渲染状态
- 拖选状态

### 4.2 `TableLayoutSnapshot`

职责：一次布局完成后的只读快照。

建议包含：

- 逻辑单元格到 fragment slice 的映射
- fragment 到 page / row / glyph box 的映射
- page 内可见片段索引
- logical cell 的绝对边界与片段局部边界

要求：

- 不可变
- 可缓存
- 所有命中测试、导航、渲染均只读 snapshot

### 4.3 `SelectionSnapshot`

职责：系统内唯一选区表示。

建议统一保存：

- `anchorBoundary`
- `focusBoundary`
- `scope`
- `tableContext`

不再保存多个补丁字段作为长期状态。

### 4.4 `SelectionProjectionService`

职责：从 `SelectionSnapshot` 投影出不同场景需要的结果。

统一输出：

- `contentRange`
- `renderRange`
- `publicRange`
- `publicCursor`
- `clipboardRange`

要求：

- 所有链路只读这里的结果
- `RangeManager` 退化为该服务的状态持有者与门面

### 4.5 `TableHitTestService`

职责：页面坐标到边界命中的纯函数服务。

输入：

- 页面坐标
- 布局快照
- 当前选区快照

输出：

- 命中的逻辑单元格
- 命中的 fragment slice
- 命中的字符边界
- 是否命中行首边界

要求：

- 无副作用
- 不直接写 `positionContext`
- 不直接操作 cursor

### 4.6 `TableNavigationService`

职责：统一处理键盘导航与边界跳转。

覆盖：

- left / right
- up / down
- delete / backspace
- click 后扩展拖选
- fragment 起点与终点跳转

要求：

- 不再把分页表格规则散落在多个 handler 中

---

## 5. 推荐目录结构

建议新增专用目录：

```text
src/editor/core/table/
  model/
    TableDocumentModel.ts
  layout/
    TableLayoutSnapshot.ts
    TableLayoutBuilder.ts
  selection/
    TableSelectionSnapshot.ts
TableSelectionProjectionService.ts
  hittest/
    TableHitTestService.ts
  navigation/
    TableNavigationService.ts
  mutation/
    TableMutationService.ts
  render/
    TableOverlayRenderer.ts
```

现有模块迁移方向：

- `RangeManager` -> 逐步变成 selection state + projection 门面
- `Position` -> 退化为基础位置服务，不再承担复杂表格命中逻辑
- `CommandAdapt` -> 只做代理和命令编排
- `RowRenderer` -> 只消费投影结果绘制
- `keydown handlers` -> 只分发动作给 navigation service

---

## 6. 单一语义原则

必须明确以下规则。

### 6.1 内部唯一选区语义

系统内部只允许一种表示：边界语义。

也就是：

- 左边界
- 右边界
- 当前聚焦边界

### 6.2 对外与渲染都从投影产生

不要直接使用原始边界值进行：

- 复制
- 高亮
- `command.getRange()`
- `command.getCursorPosition()`

这些都必须从统一投影服务得到。

### 6.3 命中测试必须纯函数化

“点击哪里命中哪里”只负责返回结果，不负责修改状态。

### 6.4 渲染层禁止解释选区

`RowRenderer` 只吃：

- `renderRange`
- `row`
- `positionList`

它不应该自己决定：

- 当前 fragment 是否参与高亮
- 当前边界该不该前推后退
- 下方 fragment 是否该清掉

如果渲染层还在解释业务，说明架构仍然有缺口。

---

## 7. 分阶段改造方案

### 当前进度对齐

- `2026-04-17`：阶段 1 的选区投影主链已落地，`RangeManager / CommandAdapt / RowRenderer` 已开始围绕统一投影收口。
- `2026-04-17`：阶段 2 的表格命中主链已落地，分页 fragment / 空白单元格 / existing-caret 拖选起点已统一收口到 `TableHitTestService` 及其相关 helper。
- `2026-04-17`：阶段 3 的主干已落地，`left/right/updown/delete/backspace` 的表格边界规则已大部分下沉到 `TableNavigationService`。
- `2026-04-18`：阶段 4 / 6 当时继续同步推进，`CommandAdapt` 已补出统一的公开选区锚点 helper，并将 `cancelHyperlink()/editHyperlink()/separator()/replaceImageElement()/saveAsImageElement()/changeImageDisplay()/insertElementList()/insertControl()/insertTitle()` 这组原本只是解释当前选区上下文的入口切到公开投影锚点，减少命令层继续直读 raw range 的面积；主回归仍稳定通过。
- `2026-04-18`：`CommandAdapt` 中无选区样式锚点的 `format/font/size/sizeAdd/sizeMinus/bold/italic/underline/strikeout/color/highlight` 以及 `title()/rowFlex()/rowMargin()/image()` 也已切到公开投影锚点；截至当前命令层只剩 `backspace`、插入超链接、按当前光标删除控件三处仍直接依赖 raw range，公开语义与内部编辑边界的分界开始清晰。
- `2026-04-18`：上述 3 处也已改为统一经 `CommandAdapt` 内部的“编辑边界” helper 进入，`CommandAdapt` 不再存在裸用 `this.range.getRange()` 的入口；命令层现在显式区分“公开投影锚点”与“内部编辑边界”两套接口。
- `2026-04-18`：`RangeManager.getEditBoundaryRange()` 已作为内部编辑边界显式接口落地，`ContextMenu / Draw / Control / TableOperate / TableParticle / ListParticle / DateParticle / Area / Group / GlobalEvent / CommandAdapt` 均已切离裸的 `range.getRange()` 调用；这一轮主链去歧义固定回归 `table-selection-nonpaged / table-pagination-input / table-pagination-merged / table-pagination-mock` 已全部通过，命令层与核心交互层的范围语义收口阶段可视为完成。
- `2026-04-18`：在此基础上，控件子类、分页渲染器以及 keydown / copy / cut / input / mousedown / mouseup / paste 这组主事件链也已统一切到显式 `getEditBoundaryRange()`；阶段 1 与阶段 6 在“范围语义去歧义”这条主线上已没有残留的裸 raw-range 入口。
- `2026-04-18`：阶段 5 已开始落地第一页增量渲染能力，`Draw.render()` 已补出显式 `pageRenderScope` 并接入 `PageRenderer.renderVisiblePages()`；分页模式下 `dblclick / threeClick / mousemove / mouseup` 这组高频局部刷新已优先走“可见页 + 活动页”重绘，不再默认全量页面立即重绘。
- `2026-04-18`：分页页包装与 overlay canvas / ctx 基础设施已补齐，`Draw / PageRenderer / RowRenderer` 已为后续真正的每页双层画布接入预留承载层；当前为保持回归稳定，选区高亮仍保留在 base canvas，阶段 5 已进入“先做渲染范围分离，再逐步迁移到 overlay”的推进方式。
- `2026-04-18`：在此基础上，`left / right / updown / mousedown` 这组高频光标移动与点击落点路径也已切到 `pageRenderScope: 'visible'`，分页模式下局部刷新已经从拖选链路扩展到键盘与点击主链。
- `2026-04-18`：`selectAll`、checkbox/radio、group、高频表格行列选中与局部表格样式刷新这批纯局部无布局重算操作也已切到 `pageRenderScope: 'visible'`，分页增量渲染已从主事件链扩展到常见局部命令/工具链。
- `2026-04-18`：在此基础上，命令层中无选区默认样式与超链接这批 `isCompute: false` 的纯局部分支也已接入 `pageRenderScope: 'visible'`，阶段 5 的局部刷新已经覆盖事件、工具和部分命令链。
- `2026-04-18`：`setRange()/focus()/locationArea()/locationGroup()/locationControl()` 以及 `Control.repaintControl()/initNextControl()` 这组纯局部定位与控件刷新也已切到 `pageRenderScope: 'visible'`，分页局部刷新覆盖面继续从命令层扩展到控件层。
- `2026-04-19`：命令层更多 `isCompute: false` 的纯局部定位/样式分支也已并入 `pageRenderScope: 'visible'`，阶段 5 的 visible-only 主链已经覆盖事件、工具、控件以及大部分纯局部命令入口。
- `2026-04-19`：`GlobalEvent` 页面重新可见恢复、`mouseup` 无布局拖放回绘收口、`Zone.setZone()`、`Area.setAreaProperties()`、`ImageParticle` 浮底图异步回绘、`setMainBadge()/setAreaBadge()` 与 `tableBorderColor()` 也已接入 `pageRenderScope: 'visible'`；当前仍保留全量刷新的主要是背景/水印、搜索导航与导出这组天然全局路径。
- `2026-04-19`：`Draw.scheduleFrameRender()` 已不再是直通 `render()` 的空壳，而是会对 `isCompute: false + isLazy: false + pageRenderScope: 'visible'` 的高频局部刷新做 RAF 合并；同时在 `mouseup` 结束拖选与滚动可见页刷新链上同步 flush pending frame，保证拖选像素断言与交互收尾稳定。
- `2026-04-20`：`RenderInvalidationManager` 已正式落地并从 `Draw` 内联逻辑中接管 `visible pages dirty`、RAF 合并调度与 flush/cancel 收口；阶段 5 现在已经不只是在铺 visible-only 分支，而是开始把渲染失效边界从 `Draw` 中抽成独立模块，为后续 `layout/selection/overlay dirty` 继续下沉做准备。
- `2026-04-20`：`TableOverlayRenderer` 也已正式落地并从 `PageRenderer` 中接管 overlay 页清理与 `selectionCtx` 分发；overlay canvas 已实际接入 DOM，`RowRenderer` 的选区矩形也已切到 overlay 为权威输出、base 仅保留无 overlay 时的 fallback。对应的 Cypress 表格回归已同步改为读取 composited page 结果，不再假设“只采样 base canvas”。
- `2026-04-20`：在此基础上，分页页包装下又补出每页独立的 overlay DOM host，`Cursor` 的可视光标层与 `TableTool` 也已切到页级 overlay host 上；当前阶段 5 在“选区像素层”和“表格/光标交互 DOM 层”两条线上都已开始脱离 editor container 的全局叠放模式。
- `2026-04-20`：`Previewer` 中页内辅助层也已继续收口到页级 overlay host：`resizerSelection` 与拖拽镜像已按图片所在页挂到对应 page wrapper，不再使用全局容器坐标；在此基础上，图片全屏预览 modal 也已从 `document.body` 挪到 editor 自己的 modal host，图片工具链已不再依赖全局 DOM 宿主。
- `2026-04-20`：在此基础上，`RowRenderer.drawSelection()`、`TableOverlayRenderer.renderVisibleSelectionOverlay()` 与 `RenderInvalidationManager` 也已接通 selection-overlay 专用刷新路径；当前拖选高频帧会优先只刷新相关页 overlay，不再回退到整页 visible render，这意味着阶段 5 已经开始真正消费 `selection dirty / overlay dirty` 这两类失效状态，而不只是预留字段。
- `2026-04-20`：搜索与水印/背景这批剩余全局点也已继续收口：`searchNavigatePre/Next` 现在会显式把“前一个命中页 + 当前命中页”加入可见页渲染集合，只重绘导航相关页；搜索首次输入关键词仍保留全局 compute，但渲染范围已收窄到 visible-only；背景图/水印图异步加载回绘与水印增删命令也都已切到 visible-only。
- `2026-04-20`：在此基础上，搜索首次关键词输入也已不再触发布局重算：`CommandAdapt.search()` 现在会先直接执行全局搜索匹配计算，再以 `isCompute: false + pageRenderScope: 'visible'` 只刷新可见页；这意味着搜索链路当前保留的全局成本已收缩到“匹配计算本身”，不再包含全量 render。
- `2026-04-20`：`Draw.getDataURL()` 也已改为离屏导出路径：导出会把页面 surface 切到 detached container 上渲染，并在 finally 中恢复 live page container / mode / pixel ratio / range / positionContext，而不再复用实时页面 canvas 做全局导出渲染；`print.cy.ts` 已重新对齐通过。当前导出/打印链仍然天然是全局计算，但已经不再污染 live render 宿主。
- `2026-04-20`：在此基础上，搜索高亮绘制本身也已切到 overlay 层：`PageRenderer` 与 selection-overlay 专用路径现在都会把 search highlight 画到 overlay canvas，而不再落在 base canvas 上；搜索链路当前已同时脱离 base 渲染层、全量 render 链与全局 DOM 宿主。
- `2026-04-20`：进一步地，搜索输入/导航入口也已直接改走 overlay-only：`CommandAdapt.search()/searchNavigatePre()/searchNavigateNext()` 不再触发 visible-only 整页重绘，而是通过 `RenderInvalidationManager` 直接刷新相关页 overlay；搜索链路现在已经完全切出 base 渲染主链。
- `2026-04-20`：在此基础上，`Search.compute()` 也已补出按页索引化缓存，`Search.render(pageNo)` 不再每页遍历整份 `searchMatchList`，而是只消费当前页 page map 切片；搜索链路当前剩余的全局成本已进一步收缩到匹配扫描与 page map 构建本身。
- `2026-04-20`：控件搜索高亮这条纯视觉链也已同步切到 overlay：`PageRenderer` 与 overlay-only 刷新路径现在都会把 `Control.renderHighlightList()` 画到 overlay canvas，而 `setControlHighlight()` 也已改为“重算高亮命中 + overlay-only 刷新”，不再触发布局重算。至此，控件高亮与搜索高亮都已统一到 overlay 装饰层。
- `2026-04-20`：最后一个 pending 的 `layout dirty` 也已补齐成真实语义：`RenderInvalidationManager` 会在完整布局重算前标记 layout dirty，并在完整渲染链路后清理；overlay-only 刷新路径则会显式绕开 layout-dirty 状态，不再在布局失效时误走 overlay-only。阶段 5 文档里列出的 dirty 标记至此已全部落地。
- `2026-04-20`：在此基础上，控件搜索高亮内部也已补出按页索引化缓存，`ControlSearch.renderHighlightList(pageNo)` 不再每页遍历整份控件高亮结果，而是只消费当前页切片；控件高亮当前已同时完成 overlay 化、overlay-only 刷新化与按页消费化。
- `2026-04-20`：阶段 3 / 6 当时也继续同步收口：`table/utils/createTablePositionContext.ts` 已统一 `TableNavigationService` 与 `resolveSelectionDragRange()` 的表格 `positionContext` 组装，导航链和拖选链不再各自维护一套分页表格上下文拼装；同时 `resolveSelectionBoundary()` 去掉了对 `Draw` 的假依赖，`RangeManager.getIsCanInput()/shrinkBoundary()` 也已切回显式 `getEditBoundaryRange()`。这一轮 `table-selection-nonpaged / table-pagination-input / table-pagination-merged / table-pagination-mock` 47 条固定回归再次全绿。
- `2026-04-20`：在此基础上，`Position.getPositionByXY()` 中最后残留的表格命中分支也已删除，`Position` 不再回调 `TableHitTestService.resolveTableElementHit()` 做表格递归命中，表格命中正式收敛为 `TableHitTestService` 单入口；对应固定 47 条表格回归已再次单次跑通。
- `2026-04-20`：selection-start 这条事件补丁链也继续下沉：`resolveSelectionStartState()` / `resolveTableSelectionStartState()` 现已把 `hitLineStartIndex / cursorDragAnchorIndex / preferDragAnchorOnCaretLine` 三段视觉态收口为统一 `cursorState`，`mousedown` 只做结果消费，不再继续手工解释这组视觉补丁字段；固定 47 条表格回归已再次单次通过。
- `2026-04-20`：在此基础上，`Cursor` 本体也已同步收口同一组视觉态：旧的三组 getter/clear API 已被统一 `CursorSelectionState` 替代，`CommandAdapt`、`resolveExistingCaretAnchorIndex()` 与 `Draw` 都已切到新接口；同时 `resolvePointerBoundaryAtPosition.ts` 也把正文命中与表格命中的半字符边界解释收成同一条 helper，命中链又少了一层“正文一套、表格一套”的重复补丁。
- `2026-04-20`：进一步地，`resolveSelectionBoundary()` 现也开始承接非表格的行首边界提示，`resolveSelectionStartState()` 不再直接读取 raw `positionResult.hitLineStartIndex` 去生成非表格 `cursorState`；这意味着 `hitLineStartIndex` 这类字段的传播范围已经继续从“事件层直接消费”收窄到 “boundary / cursor” 两层。
- `2026-04-20`：在此基础上，`TableHitTestService.resolveTableElementHit()` 与配套 `ITableElementHitTestRequest` 也已删除，旧 `Position -> table` 递归命中链残留的最后一层死入口正式出清；`TableHitTestService` 当前只保留仍被点击/拖选/事件命中主链消费的 `resolvePointerPosition()/resolve()` 入口。
- `2026-04-20`：命中结果字段也继续去补丁化：`segmentStartIndex` 已从 `ICurrentPosition` 删除，fragment 起点判断改为在 `resolveTableSelectionStartState()` 里按 snapshot 现算；`hitTargetIndex` 则回收到了 boundary 与表格 page-point 命中元信息层，不再挂在通用命中类型上。同时 `resolveTableCellPositionByPagePoint()` 已退化为只服务 `TableHitTestService` 的内部元信息 helper，`resolveSelectionStartState()` 也已彻底改为只消费 `TableHitTestService.resolve()` 单入口返回值。
- `2026-04-20`：进一步地，通用 `IPagePoint` 已拆到 `event/utils/PagePointTypes.ts`，其余 range/selection/hittest 调用方不再反向依赖表格命中 helper 才能拿到 page-point 类型；`getTableFragmentByPagePoint()` 也已回收进 `TableHitTestService`，`resolveSelectionBoundary.ts` 则已从 `event/utils` 挪回 `table/hittest`，命中相关实现继续朝 service 同域内聚。
- `2026-04-20`：随后，`resolveSelectionBoundary.ts` 这层单用 helper 也已被进一步收口：边界类型现已直接并入 `TableHitTestTypes.ts`，边界归一化实现则内联到 `TableHitTestService` 自身，独立 helper 文件已删除；当前命中主链已经越来越接近“类型定义 + service 单实现”的形态。
- `2026-04-20`：在此基础上，`resolveAdjustedPointerPosition.ts` 这层只剩 `TableHitTestService` 单用的非表格命中归一化包装也已并回 service 自身，独立 helper 文件已删除；命中主链里原先分散在 event/utils 的“表格命中 / 非表格命中 / 边界归一化”三段实现现在都已更集中地落到 `TableHitTestService` 一侧。
- `2026-04-20`：selection-start 域的 helper 归属也已继续修正：`resolveExistingCaretAnchorIndex.ts` 与 `resolvePointerMouseDownIndex.ts` 已从 `range/utils` 挪回 `event/utils`，而 `hitLineStartIndex` 也已从 `ICurrentPosition` 主类型中移除，只在命中域内部结果与 boundary / cursor state 层流动；selection-start 与命中主链的职责边界进一步清晰。
- `2026-04-21`：随后，`resolveTableCellPositionByPagePoint.ts` 这层也已整段并回 `TableHitTestService` 并删除文件；当前命中主链里原先分散的 `fragment -> cell -> page-point 命中` 实现也已收敛到 service 内部，目录边界进一步贴近真正的职责边界。
- `2026-04-21`：在此基础上，`TableHitTestService` 也已开始固定持有 `snapshotAccessor` 而不是在命中主链里重复临时构造；同时 `resolveFragmentCellSlice()` 里对快照 map 的冗余 fallback 已删除，service 内部的快照访问方式继续统一收口到 accessor。
- `2026-04-21`：随后，`TableHitTestService.resolvePointerPosition()` 也已明确拆成“内部扩展命中结果”和“对外公共命中结果”两层，`hitTargetIndex / hitLineStartIndex` 这类内部辅助字段不再随公共命中结果对外扩散；命中主链的对外边界继续收紧。
- `2026-04-21`：继续往下，`TableHitTestService` 内部又删掉了 `resolveTableCellByPagePoint()` 与 `resolveTablePointerPositionByAnyPageLocalPoint()` 这两层单用实现，并让 `resolveSnapshotTableElementHit()` 直接消费前一步 page-point 命中已带回的 `activeSlice`；命中 service 内部的层级和重复查询继续下降。
- `2026-04-21`：在此基础上，`Draw` 也已开始持有 `TableHitTestService` 与 `TableLayoutSnapshotAccessor` 两个 draw 级单例，`CommandAdapt`、事件链和 selection/导航/命中相关模块不再继续各自临时构造；命中主链与快照访问主链都在朝“draw 级单例服务 + 更少局部 new”收口。
- `2026-04-21`：随后，`Draw` 也已开始持有 `TableNavigationService` 单例，keydown 主链不再继续各自临时 new navigation service；同时一批命令/渲染/导航/选区模块里的本地 snapshot accessor 持有继续删除，而 `TableHitTestService` 也已删除本地 `snapshotAccessor` 字段并直接取用 draw 级单例，说明这轮已经从“单例宿主建立”继续走到了“各模块本地重复持有清理”。
- `2026-04-21`：随后，`TableSelectionProjectionService.ts` 也已整段并回 `RangeManager` 并删除文件，selection projection 不再依赖额外 service 对象；同时 `TableHitTestService` 对外公共入口也已收窄到只剩 `resolve()`，而导航链里剩余的单用 sibling/slice helper 也继续被内联删掉。当前这轮已经开始从“模块/服务收口”进一步走向“连 service 对象本身都尽量去对象化”的阶段。
- `2026-04-21`：继续往下，`TableNavigationService` 里结果组装与垂直 sibling 解析这两层单用 helper 也已继续被内联删除，导航主链又少了两层中转；与此同时，`RangeManager` 中少数已无消费面的公开壳层也已开始同步清理。
- `2026-04-21`：随后，`TableLayoutSnapshotStore.ts` 也已整段并回 `Draw` 并删除文件，快照的 `version / snapshot cache / logical table state sync` 现在都直接由 `Draw` 私有方法维护；同时导航链与选区链里一批只剩单用或薄转发的 helper 也继续被物理删除，说明这轮已经从“单例宿主化”推进到了“中间管理壳层去对象化 + 小 helper 去层级化”。
- `2026-04-21`：继续往下，`RangeManager.getProjectedActiveRange()` 这层薄壳也已物理删除，`getRangeRow()/getRangeRowElementList()/getRangeParagraphInfo()/getIsPointInRange()` 现已直接基于 `getPublicRange() + getSelectionContentRange()` 投影；与此同时，`TableNavigationService.getLogicalCellSliceList()` 与顶部逻辑 cell 类型壳也已删除，导航链对 cell slice 的读取直接就地走 snapshot accessor。对应 `npm run type:check`、`npm run lint` 与固定 47 条表格回归再次单次全绿。

### 阶段 1：确立统一选区语义

目标：

- `RangeManager` 成为唯一选区语义入口
- `CommandAdapt` 和 `RowRenderer` 不再重复解释 raw range

本阶段工作：

1. 建立 `SelectionSnapshot`
2. 建立 `SelectionProjectionService`
3. 让以下接口统一走 projection：
   - `getRange()`
   - `getCursorPosition()`
   - `getRangeText()`
   - `renderRange`

阶段验收：

- 复制、高亮、公开 range 完全一致
- 分页 fragment 与 merged 场景不再存在一处正确一处错误

### 阶段 2：拆出命中测试

目标：

- 把表格点击命中和副作用分离

本阶段工作：

1. 从 `Position.getPositionByXY()` 中抽出表格命中部分
2. 新建 `TableHitTestService`
3. 保留 `Position` 作为位置列表与基础查询容器

阶段验收：

- 鼠标点击与拖选初始化不再直接依赖 `Position` 的复杂递归逻辑
- hit-test 可以单测

### 阶段 3：统一键盘导航

目标：

- 所有键盘跳转统一通过 `TableNavigationService`

本阶段工作：

1. 抽离 `left/right/updown/delete/backspace`
2. 统一 fragment 起点、终点、跨页、跨行行为
3. 删除 handlers 中的表格专用分支

阶段验收：

- later fragment 起点、同字符盒再拖、delete/backspace、上下左右行为稳定

### 阶段 4：布局快照化

目标：

- 事件、渲染、导航全部只读布局快照

本阶段工作：

1. 明确 `TableLayoutSnapshot`
2. 所有 fragment 索引、绝对边界、片段边界在构建时一次性算好
3. 运行时不再临时多次 `find/filter` 推导

阶段验收：

- 命中、导航、渲染都能只读 snapshot
- 调用链大幅简化

当前已落地：

- `page -> table fragment positions`
- `fragmentTableId -> logicalTableId`
- `logicalTableId -> logicalTableIndex`
- `cellKey -> sliceStartIndexes`
- `logical cell + fragment tr/td -> slice`
- `logical cell + pageNo -> slice`
- `fragment cell bounds`
- `slice rowBands / firstVisibleOffset`
- `Position -> table` snapshot-first hit path

### 阶段 5：渲染与性能优化

目标：

- 选区、光标、表格工具改为 overlay 层刷新

本阶段工作：

1. 抽出 overlay renderer
2. 拖选时只刷新可见页 overlay
3. 减少全量 render

阶段验收：

- 拖选流畅度明显提升
- 分页表格拖选不再依赖全量重绘

---

## 8. 明确的删除清单

以下旧逻辑建议逐步物理删除。

### 8.1 `CommandAdapt` 中的二次选区解释

删除方向：

- range 归一化补丁
- cursor 归一化补丁
- 非命令层职责的 fragment 映射解释

理由：

这些逻辑应该属于 `SelectionProjectionService`。

### 8.2 `RowRenderer` 中的业务修补

删除方向：

- 上一字符重刷补丁
- 幽灵高亮补丁
- range 语义再解释

理由：

渲染层不能长期承担修错职责。

### 8.3 `Position.getPositionByXY()` 中的表格递归命中

删除方向：

- 表格专用命中递归
- fragment 绝对边界拼接
- 命中后直接构造复杂 table 结果

理由：

应转移到 `TableHitTestService`。

### 8.4 `keydown handlers` 中的表格规则

删除方向：

- later fragment 规则
- merged 规则
- 跨页规则

理由：

应统一下沉到 `TableNavigationService`。

---

## 9. 性能优化建议

### 9.1 拖选不再全量 render

现状：

- `mousemove` / `mouseup` 中高频调用渲染
- `Draw.render()` 路径过重

建议：

- 拖选只更新 selection snapshot
- 只刷新 overlay
- 只刷新当前页及相关页

### 9.2 建立页面与片段索引

缓存建议：

- `tableId -> logicalCell`
- `logicalCell -> fragmentSlices`
- `pageNo -> visibleFragments`
- `absoluteBoundary -> fragmentSlice`

### 9.3 命中列表空间化

替代线性扫描：

- page -> row bands
- row -> x intervals
- cell -> glyph boxes

### 9.4 布局与位置分层缓存

布局快照缓存键建议包含：

- 表格版本号
- 页面尺寸
- margin
- 字体度量版本

只要内容不变，拖选不重算布局。

---

## 10. 风险与控制

### 10.1 风险

- 重构期会同时影响表格、分页、选区、导航
- 过渡期可能短时间内引入新回归
- 如果保留旧逻辑过多，会导致新旧链路并存，收益减半

### 10.2 控制措施

1. 先做单一语义，不先碰性能
2. 每一阶段都补高频回归用例
3. 允许破坏性更新，不做旧链路兼容保留
4. 每完成一阶段，立即删除旧补丁，不让双轨长期共存

---

## 11. 验收标准

### 11.1 正确性

- 分页单元格从左向右、从右向左拖选都稳定
- 先点击再拖选、直接按住拖选结果一致
- 高亮与复制完全一致
- 上下分页片段互不串亮
- merged / non-merged / later fragment 行为统一

### 11.2 性能

- 拖选时不再触发全量布局
- 大表格跨页拖选帧率稳定
- 光标移动响应时间可接受

### 11.3 可维护性

- 表格选区语义只有一个入口
- 表格导航规则只有一个入口
- 命中测试只有一个入口
- 渲染层不再有业务修补补丁

---

## 12. 推荐实施顺序

如果按投入产出比排序，建议这样做：

1. 正式建立 `SelectionProjectionService`
2. 完成 `RangeManager / CommandAdapt / RowRenderer` 收口
3. 抽离 `TableHitTestService`
4. 抽离 `TableNavigationService`
5. 快照化 `TableLayoutSnapshot`
6. 最后做 overlay 与性能优化

---

## 13. 立即可执行的第一批任务

### 任务 A：选区服务正式落地

- 新建 `TableSelectionSnapshot.ts`
- 新建 `TableSelectionProjectionService.ts`
- 将 `RangeManager` 迁移为该服务门面

### 任务 B：命中服务拆离

- 新建 `TableHitTestService.ts`
- 从 `Position.getPositionByXY()` 中迁出表格命中逻辑

### 任务 C：导航服务拆离

- 新建 `TableNavigationService.ts`
- 接管 `left/right/updown/delete/backspace`

### 任务 D：旧补丁逐步删除

- 标记 `RowRenderer` 中所有修补逻辑
- 在新服务稳定后逐个物理删除

---

## 14. 最终判断

当前表格系统不是继续“修几个计算坐标”就能长期稳定的类型，而是已经到了必须做架构重构的阶段。

如果继续沿用当前模式：

- 每修一条链路都会从别的链路重新冒 bug
- 性能问题会随着功能增多继续恶化
- 新功能成本会持续升高

如果按本方案推进：

- 可以把表格、分页、选区、导航、复制、高亮统一到一套模型
- 可以把现在反复出现的字符边界问题从根上收掉
- 可以为后续表格扩展能力打下稳定基础

---

## 15. 补充说明

本方案默认允许破坏性更新，不要求兼容旧链路。

建议执行原则：

- 新模型上线后，旧补丁链路必须物理删除
- 不保留“双轨长期共存”
- 所有交互只认统一 snapshot 与 projection
## 2026-04-22 阶段状态更新

- 该轮记录时的阶段判断是：阶段 1/2/5 已完成，阶段 3/4 已进入完成前的最后收口阶段，阶段 6 继续做旧壳删除与主链压平。
- 本轮已补齐 later-fragment 首行与 same-char re-drag 的主链语义缺口，重点落在：
  - `mousedown` 的 line-start caret 收紧，只在真正靠左边界时保留 line-start 语义。
  - `resolveSelectionStartState` 去掉对 existing-caret anchor 的重复 fragment offset 叠加。
  - `getPublicCursorPosition()` 与 `getRange()` 的 collapsed 投影解耦，cursor 回到可比较的真实索引，range 保持现有公开语义。
  - `resolveExistingCaretAnchorIndex()` 区分 nonpaged、multi-slice paged、line-start caret 三类 same-char 场景。
  - `resolveTableSelectionStartState()` 统一 table drag 起点边界，字符盒内直接起拖从命中字符前边界开始。
- 当前固定验证基线已重新通过：
  - `npm run type:check`
  - `npm run lint`
  - `table-selection-nonpaged`
  - `table-pagination-input`
  - `table-pagination-merged`
  - `table-pagination-mock`
- 当时阶段结论：运行主链已恢复到 `47 / 47` 固定表格回归全绿，后续继续沿阶段 6 做物理删壳，而不是再回到补丁式兼容。

## 2026-04-22 第二轮补充

- 这一轮继续处理了用户侧暴露的分页表格真实缺口，覆盖：
  - 分页多单元格 later-page 第二列点击 / 输入 / `up` 导航
  - 分页 `TableTool` 宿主页跟随当前 fragment
  - 表格跨行列选择高亮
  - later paged fragment 首行 top border 可见性
- 主链改动集中在：
  - `TableNavigationService`：跨页同一逻辑单元格的纵向导航不再错误跳出表格。
  - `TableTool`：不再只锚定原始 table 首页，而是按当前 active slice / fragment 页渲染。
  - `RowRenderer`：跨行列表格选区按 cell bounds 走统一高亮，递归 cell 绘制链显式透传 `selectionCtx`。
  - `TableParticle` / `RowRenderer`：later fragment 首行 top border 补强。
- 新增回归：
  - `table-pagination-multicell.cy.ts`
  - `table-pagination-border.cy.ts`
  - `table.cy.ts` 中补充整表选择高亮断言

## 2026-04-22 第三轮补充

- 继续按真实 `mock.ts` 中文分页表格与用户视频交互收口了纵向导航：
  - later fragment start `↑` 回上一页同一 cell
  - 跨页边界 `↓` 先落下一页 fragment 起点
  - later fragment 内连续 `↓` 维持同一 cell 的视觉行序列
  - later fragment inner-line-start `↑` 再次回到上一页
- 这轮主改动集中在：
  - `updown.ts`
  - `TableNavigationService.ts`
- 对应真实回归已补到 `table-pagination-mock.cy.ts`，并重新验证 `table-pagination-input.cy.ts` 与 `table-pagination-mock.cy.ts`。

## 2026-04-22 第四轮补充

- 这轮进一步把“分页坐标/光标/边界”这条主链压平为更明确的行为规则：
  - `keydown up/down` 不再混用旧的普通文档行导航和表格分页 fragment 语义。
  - later fragment 首行首字、inner-line-start、跨页 `down` 都统一回到 `TableNavigationService` 裁决。
  - 多单元格场景的 `down` 跨单元格落点明确收敛为“下一个单元格首行起点”。
- 当前阶段关于分页表格纵向导航的结论：
  - 真实 `mock.ts` 中文分页单元格已覆盖 `A -> D -> B -> C` 型链路
  - 固定分页表格回归组再次收敛到全绿

## 2026-04-24 补充

- 该轮记录时，主要工作仍然是阶段 6 的“继续压平主链内部层级并物理删除重复宿主壳层”。
- 本轮新增收口：
  - `TableOverlayRenderer` 已提升为 `Draw` 级统一宿主。
  - `PageRenderer` 与 `RenderInvalidationManager` 不再各自 `new TableOverlayRenderer(draw)`。
- 这说明当前推进已经从“table 服务单例化”继续走到“渲染宿主单例化”，文档中关于 draw 级统一宿主的描述现在已经与真实代码对齐。
- 同期也已补齐一条被用户现场反复触发的基础选区规则：
  - 普通文字在 `caret line` 上继续拖选时，仍走 existing-caret 语义。
  - 普通文字在 `character box` 内再次按下拖选时，回退到 direct-hit 语义。
- 这条规则已经通过普通文字回归和非分页表格文字回归验证，说明“先点击，再拖选”的基础语义边界现在开始真正按对象类型统一，而不再依赖局部补丁。

## 2026-04-25 补充

- 该轮记录时，推进仍然属于阶段 6 的主链压平和旧壳物理删除；这些收口已在后续汇总状态里正式并入“阶段 6 已完成”。
- 本轮新增收口：
  - `resolveExistingCaretAnchorIndex.ts` 已并回 `resolveSelectionStartState.ts`。
  - existing-caret anchor 计算不再额外跨文件跳转。
  - `Position.resolveRowBoundaryPosition()` 也已内联回页边界兜底主链。
  - `Position.resolveActiveRowBandFallback()` 也已内联回 `getPositionByXY()` 主链。
  - `Position.resolvePageBoundaryFallback()` 也已内联回 `getPositionByXY()` 主链。
  - fresh direct-drag 的 table selection 起点重新回到 hit-range 主路径，`dragAnchorSource` 也已在拖选链上完整透传。
  - `CommandAdapt.getRangeContext()` 已继续拆成编排层 + 局部组装 helper。
  - `RowRenderer.drawSelection()` 已继续拆出跨行列与普通选区两段局部 helper。
  - `RowRenderer.drawRow()` 已继续拆出逐元素绘制分发与 range queue 两段局部 helper。
  - `RowRenderer.drawRow()` 主循环也已进一步收口到“主循环编排 + renderRowElement() 负责逐元素分发”的结构。
  - `Position.resolvePageDirectHit()` 已内联回 `getPositionByXY()`。
- 这说明当前推进还在继续沿“删 event/utils 单用 helper 壳层、把 selection-start 主链压回一个更直接的入口”这条方向前进。
