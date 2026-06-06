# 表格重构业界路线对标方案

> 关联文档：
> [table-refactor-plan.md](./table-refactor-plan.md)
> [table-refactor-tasks.md](./table-refactor-tasks.md)

本文档用于回答一个核心问题：

> 这次表格与分页重构，应当借鉴腾讯文档、WPS、ONLYOFFICE 这类成熟产品的什么技术路线？

注意：

- 本文只基于公开官方资料总结可借鉴路线
- 不猜测对方未公开的底层实现细节
- 对未被官方明确披露的部分，统一按“工程推断”标注

---

## 1. 总体结论

腾讯文档、WPS、ONLYOFFICE 虽然产品形态不同，但公开资料能看出的成熟路线有高度一致性：

1. 编辑器核心与文档存储解耦
2. 协作能力与编辑器能力解耦
3. 文档模型、布局快照、渲染输出分层
4. 命令/回调/集成接口稳定化
5. 页面级或区域级增量刷新，而不是所有交互都全量重算
6. 平台化、插件化、开放能力边界清晰

这意味着你这次重构不应该继续围着“某个坐标计算公式”修，而应该整体转向：

- 文档模型中心化
- 布局快照只读化
- 选区语义单一化
- 协作与外部集成边界明确化
- 渲染增量化

---

## 当前路线状态

截至 `2026-04-21`，本项目与本文路线的对齐状态可以直接收束为以下判断：

### 总体判断

1. 当前实现没有偏离本文路线。
2. 当前代码已经稳定落在本文强调的五条成熟路径上：
   - 统一选区语义中心化
   - snapshot 驱动命中与导航
   - 渲染层与交互宿主分层
   - visible-only / overlay-only / invalidation 的局部刷新
   - 过渡链路与补丁层物理删除
3. 当时的主要剩余工作已经不再是“选择路线”，而是“继续压平主链内部层级并删除退出主链的壳层”。

### 当前阶段总结

| 阶段 | 当前判断 | 说明 |
| --- | --- | --- |
| 阶段 1 | 已完成 | 统一选区语义主链已落地。 |
| 阶段 2 | 已完成 | 表格命中已切到 snapshot + `TableHitTestService` 单入口。 |
| 阶段 3 | 已完成 | 导航主规则已集中并稳定服务主链。 |
| 阶段 4 | 已完成 | 快照结构与关键索引已真实服务命中/导航/渲染。 |
| 阶段 5 | 已完成 | 渲染层和交互宿主迁移已完成。 |
| 阶段 6 | 已完成 | 当前阶段定义下的过渡链路删除与主链收口任务已完成。 |

### 当前阶段后的剩余项

- 后续仍可继续削薄 `Position / CommandAdapt / RowRenderer` 等热点大方法内部层级。
- 后续仍可继续把少量历史命名和公开过渡面做温和收尾。
- 当前这些事项更偏向持续优化，而不再是路线是否站稳的问题。
- `Position.getSelectionPositionList()` 这层只服务命令上下文拼装的公开薄壳也已被删除，而对应的 `CommandAdapt.getRangeContext()` 已直接消费 `RangeManager` 的投影结果与 `Position` 的基础位置列表。这说明当前收口已经开始继续削掉“Position 帮其他域做投影拼装”的跨域包装接口，让职责边界进一步贴近“Position 只做位置、Range 只做范围投影”的目标形态。
- `Control.getRange()` 这层只做名称过渡的旧壳也已被删除，控件域改为直接依赖 `getEditBoundaryRange()`。这说明当前收口已经开始继续清理“旧 API 名称壳层”而不只是删 helper 文件，主干对象的公开面也在同步变薄。
- `CommandAdapt.getActivePublicRange()/getActiveEditBoundaryRange()` 这两层私有 range 转发壳也已被删除，说明当前收口已经继续从“删字段壳、删 helper 壳”走到“删主干类内部的中间读取壳”，主链正在持续变得更直接。
- `Draw` 里 `RowRenderer` 与 `PageRenderer` 也已进一步提升为 draw 级宿主成员，说明当前收口已经不只是在 table 域和命令域删壳，还在继续把渲染主链从“临时实例化”收束到“统一宿主复用”的运行形态。
- `Control.getContainer()/getPosition()/getPreY()` 这三层 popup / picker 宿主读取包装也已被删除，说明当前收口已经继续向控件子域推进，不只是在主编辑链上删壳，也在持续清掉“Control 帮子控件转发 draw/position/container”的历史包装层。
- `Control.getElementList()` 这层跨域包装也已被删除，而控件本体与各子控件都已统一直接读取真实 `draw` 宿主的 elementList。这说明当前收口已经从“删 popup/picker 定位壳”继续推进到“删控件域最常用的数据转发壳”，控件子域的职责边界在继续变薄、变直。
- `RowRenderer` 里 selection 与正文绘制原先各自维护的一套 table 子单元格递归遍历也已收成同一路径，说明当前收口已经开始继续从“删对象壳/删接口壳”推进到“删主干类内部的重复实现块”，渲染主链内部的规则表达正在进一步统一。
- `RowRenderer` 里 `drawHighlight()/drawSelection()/drawRow()` 原先各自维护的 row-position 切片循环也已收成同一路径，说明当前收口已经继续深入到渲染主链的局部循环结构层，而不只是停留在对象边界或方法边界的删壳。

这意味着本文档给出的行业路线已经不只是“参考方向”，而是已经落实到当前代码结构；当时的工作重点已经转向压平最后几层历史实现。

---

## 2. ONLYOFFICE 可借鉴路线

### 2.1 官方公开能力

ONLYOFFICE 官方公开资料明确体现了以下路线：

- 文档编辑服务与文档存储服务分离
- 通过 `callbackUrl` 把编辑状态回推给存储服务
- 通过文档 `key` 维持同一协作会话
- 通过 Command Service / WOPI 等接口做外部系统集成

### 2.2 可直接借鉴的技术思想

#### 路线 A：编辑引擎与存储层分离

这条路线最重要。  
对你当前系统来说，对应的不是“马上做服务端”，而是先在前端内部建立同样的边界：

- 编辑器核心只关心文档模型与操作
- 存储适配层只关心读写、版本、保存、回调

也就是说，表格编辑逻辑不应该直接依附于 `Draw`、`CommandAdapt`、`Position` 这些 UI/渲染对象。

#### 路线 B：版本化文档键与会话边界

ONLYOFFICE 强调同一文档在协作中依赖统一 `key`。  
映射到你的重构中，应该建立：

- `documentVersion`
- `tableVersion`
- `layoutSnapshotVersion`
- `selectionSnapshotVersion`

所有高亮、命中、导航都只能消费同一版本快照，不能混用旧快照和新状态。

#### 路线 C：编辑命令与回调协议明确

ONLYOFFICE 有清晰的回调状态流。  
你可以借鉴成内部协议层：

- `applyOperation`
- `layoutInvalidated`
- `selectionChanged`
- `renderInvalidated`
- `persistRequested`

也就是所有交互不再直接散落在 handler 中，而是统一转成内部命令事件。

---

## 3. 腾讯文档可借鉴路线

### 3.1 官方公开能力

腾讯文档官方公开信息强调：

- 高可用架构
- 协作编辑
- 丰富 API 与开放集成
- 与企业 OA / IM / 管理系统联动

### 3.2 可直接借鉴的技术思想

#### 路线 A：协作优先的稳定边界

腾讯文档这类产品的核心不是“能编辑”，而是“多人同时编辑时语义必须稳定”。  
这对你当前重构的启示是：

- 先统一边界语义，再谈性能和功能扩展
- 所有拖选、复制、高亮、键盘移动必须共用同一语义投影

也就是你现在正在做的：

- 单一选区语义
- 单一渲染语义
- 单一公开 API 语义

这条必须继续贯彻到底。

#### 路线 B：集成边界独立于编辑器核心

腾讯文档强调 API 与企业系统集成。  
这意味着成熟产品不会把“集成接口”直接写进编辑器核心。

对你当前架构来说，后续应当拆出：

- 文档服务接口层
- 外部事件桥接层
- 导入导出适配层

不要再让 `CommandAdapt` 同时承担：

- UI 命令
- 文档语义
- 外部 API 适配

#### 路线 C：高可用思维下的快照不可变

虽然官方没有公开实现细节，但高可用协作产品的共性是：

- 当前渲染消费的是稳定快照
- 变更是通过操作流推进

这意味着表格分页和命中测试不能继续依赖“正在被写的结构”。

---

## 4. WPS / 金山文档可借鉴路线

### 4.1 官方公开能力

WPS 官方公开资料能看出的路线是：

- `WPS 365 OpenAPI` 统一开放接口
- `JSAPI` 提供网页侧协作能力接入
- `协作中台` 提供统一协作文档能力
- 云文档、消息、权限、文件选择器等能力平台化

### 4.2 可直接借鉴的技术思想

#### 路线 A：中台化

WPS 的公开路线不是把协作文档能力写散，而是抽成平台/中台能力。

映射到你这里，非常适合的做法是：

- 表格文档模型中台
- 表格布局快照中台
- 表格命中测试中台
- 表格导航中台
- 表格选区投影中台

这本质上就是把现在分散在：

- `Position`
- `RangeManager`
- `CommandAdapt`
- `RowRenderer`
- `keydown handlers`

里的能力收成一组中心服务。

#### 路线 B：开放接口先稳定，再扩展功能

WPS 公开能力里，开放接口先统一，再挂更多业务。  
这对你最直接的启示是：

先稳定这些内部接口：

- `hitTest(point, snapshot)`
- `projectSelection(snapshot)`
- `navigate(snapshot, direction)`
- `layout(documentModel)`
- `render(renderSnapshot)`

稳定后再扩展：

- 整列选择
- 整行选择
- 批注
- 协同选区
- 服务端保存与回放

#### 路线 C：协作能力与 UI 能力隔离

WPS 的 `JSAPI`、`OpenAPI`、中台能力是分层的。  
你这里后续也应该分离：

- 编辑器内部核心
- 外部接入层
- UI 壳层

而不是继续让 `Draw` 成为总入口并承担过多职责。

---

## 5. 三家路线的共同技术抽象

基于官方公开资料，三家共同路线可以抽象成 5 条原则。

### 原则 1：单一文档模型

所有编辑行为必须落在统一文档模型上。  
不能一会儿改逻辑表格，一会儿改布局片段，一会儿直接修渲染。

### 原则 2：布局结果快照化

布局是计算结果，不是长期可变状态。  
命中、导航、渲染只读 snapshot，不直接改布局。

### 原则 3：选区语义中心化

高亮、复制、公开 API 都不能再有自己的解释规则。  
只能从统一 projection 得到。

### 原则 4：操作流中心化

鼠标、键盘、命令、外部接口都先转成统一操作，再更新模型。  
不要每个 handler 自己拼业务。

### 原则 5：平台化而不是补丁化

成熟产品会不断积累能力，但其底层必须是平台式的。  
如果继续靠字段补丁和局部修复，越做越脆。

---

## 6. 对本项目的具体落地路线

### 6.1 第一层：编辑核心

目标：借鉴 ONLYOFFICE 的“编辑服务与存储服务解耦”路线。

对应本项目：

- `TableDocumentModel`
- `TableMutationService`
- `OperationDispatcher`

职责：

- 只处理逻辑表格与编辑操作
- 不感知页面坐标
- 不感知 canvas

### 6.2 第二层：布局快照层

目标：借鉴腾讯文档 / WPS 的高可用快照思路。

对应本项目：

- `TableLayoutSnapshot`
- `TableLayoutSnapshotBuilder`

职责：

- 逻辑单元格到 fragment 映射
- fragment 到页、行、字符盒映射
- 所有 hit-test / navigation / render 的统一输入

### 6.3 第三层：协作与选区中台

目标：借鉴 WPS 的协作中台路线。

对应本项目：

- `TableSelectionSnapshot`
- `TableSelectionProjectionService`
- `TableNavigationService`
- `TableHitTestService`

职责：

- 统一命中
- 统一导航
- 统一公开 range
- 统一渲染 range

### 6.4 第四层：渲染层

目标：借鉴成熟在线文档产品的增量渲染路线。

对应本项目：

- `TableOverlayRenderer`
- `RenderInvalidationManager`

职责：

- 基础内容渲染
- 选区 overlay 渲染
- 光标 overlay 渲染
- 表格工具 overlay 渲染

### 6.5 第五层：开放接口层

目标：借鉴腾讯文档 / WPS 的开放能力边界。

对应本项目：

- `DocumentApiFacade`
- `ImportExportAdapter`
- `PersistenceAdapter`

职责：

- 对外暴露稳定接口
- 不把外部 API 直接耦合进核心编辑逻辑

---

## 7. 这次重构必须避免的误区

### 误区 1：先继续修 bug，再慢慢重构

不行。  
当前系统的 bug 类型已经证明底层语义是分裂的。  
继续修只会不断出现新分支。

### 误区 2：只做性能优化，不改模型

不行。  
模型不统一时，增量渲染只会把错误更快地画出来。

### 误区 3：保留过渡链路双轨

不行。  
双轨长期共存会把复杂度翻倍。

### 误区 4：先决定 OT / CRDT 等协同算法

现阶段不建议。  
目前最核心的问题是本地编辑模型与选区模型不统一。  
先把本地单人编辑做成稳定平台，再考虑协同层插拔。

---

## 8. 推荐的最终技术路线

综合三家成熟路线，推荐你这次重构采用下面这条路线：

### 路线定义

**文档模型中心化 + 布局快照只读化 + 选区投影中台化 + 导航服务化 + 渲染增量化 + 外部接口平台化**

### 对应到你项目里的实际含义

1. 不再让 `Draw` 管业务
2. 不再让 `Position` 管表格语义
3. 不再让 `CommandAdapt` 管范围解释
4. 不再让 `RowRenderer` 管数据修补
5. 不再让多个 handler 各写一套分页规则

---

## 9. 与当前文档的关系

本文档不是替代：

- [table-refactor-plan.md](./table-refactor-plan.md)
- [table-refactor-tasks.md](./table-refactor-tasks.md)

而是对它们的“路线增强版”：

- `plan` 解决“为什么重构、总体怎么拆”
- `tasks` 解决“按阶段做什么”
- `benchmark-route` 解决“为什么这条路是成熟产品已经验证过的方向”

---

## 10. 当前对齐情况

截至 `2026-04-20`，本项目与本文路线的对齐状态可以概括为：

1. 已经开始从“坐标修补”转向“布局快照 + 选区投影 + 导航服务”的主路线。
2. `TableHitTestService` 与 `TableNavigationService` 已经承接主干职责，方向与本文第 5 节、第 6 节一致；其中 `Position -> table` 主命中已切到 snapshot 优先。
3. `TableLayoutSnapshot` 已经不是空壳，而是开始承载页级 fragment、逻辑表格映射、cell slice、fragment cell bounds 等索引。
4. 当前最主要的剩余工作不再是路线选择，而是继续把 `Position / render / event utils` 中残留的运行期推导替换成 snapshot 查询，并同步删除已经脱离主链的旧缓存 / 过渡 API；其中表格主命中链上的 `td.positionList` 回退 与 `cellAreaPosition` 覆盖拼接都已被实际移除，`click / mousemove / mouseup`、`dragover` 与 `CommandAdapt.getPositionContextByEvent()` 已直接接入 `TableHitTestService`，selection start 的表格分支、existing-caret anchor helper 与共用 `mouseDownIndex` 半区命中逻辑也已开始抽离到 `table/selection` / `range/utils`，渲染侧的 fragment ghost / boundary 局部补丁则已收口为通用清行重绘，而 `Position.getSelectionPositionList()` / `CommandAdapt.getRangeContext()` / `CommandAdapt.title()` / `CommandAdapt.getHyperlinkRange()` / `RangeManager` 的公开行段落查询与 `ContextMenu / Draw / Control / TableOperate / TableParticle / ListParticle / DateParticle / Area / Group / GlobalEvent / CommandAdapt` 这组核心模块的内部编辑边界读取也都已被显式接口化；同一层级里不再混用裸的 raw range 与公开投影语义。
5. overlay 层已经从“基础设施预埋”进入真实主链：selection/search/control highlight、可视 cursor、`TableTool`、`Previewer` 页内辅助层与图片 modal 宿主都已切到 per-page overlay / page host，分页增量渲染与交互宿主迁移已经实装。
6. 截至当前，`ContextMenu / Draw / Control / TableOperate / TableParticle / ListParticle / DateParticle / Area / Group / GlobalEvent / CommandAdapt`、控件子类、分页渲染器与主事件 handler 都已经显式区分“公开投影”与“内部编辑边界”，这条范围语义去歧义主线已基本收束完成。
7. 阶段 5 目前采取的是更保守的落地路径：先把 `pageRenderScope`、分页页包装与 per-page overlay canvas / ctx 基础设施补齐，再逐步迁移真实选区绘制；这样可以先拿到分页局部刷新收益，同时避免在 overlay 切换时把表格分页高亮主链打歪。
8. 当前阶段 5 的局部刷新收益已经不只覆盖拖选链路，`left / right / updown / mousedown` 这组高频光标移动与点击落点也开始复用“可见页 + 活动页”重绘路径，说明增量渲染主线已开始从鼠标扩展到键盘交互。
9. 在此基础上，`selectAll`、checkbox/radio、group、高频表格行列选中与局部表格样式刷新也开始复用 visible-only 重绘路径，说明阶段 5 已经从“高频事件优化”走向“局部命令/工具链优化”。
10. 当前阶段 5 的推进方式已经形成稳定模式：先把所有明确 `isCompute: false` 的纯局部路径尽量收进 visible-only 重绘，再考虑真实 overlay 绘制迁移，从而避免性能改造和分页高亮语义回归相互耦合。
11. 目前 visible-only 的覆盖面已经进一步从鼠标/键盘事件扩展到页面可见性恢复、zone 切换、area 属性、浮底图异步回绘、badge 与表格边框色等纯局部无布局重算路径，说明阶段 5 的收益不再只是“拖选更省”，而是在把整条无布局重算主链系统性收窄到可见页范围。
12. 在此基础上，`Draw.scheduleFrameRender()` 也已从直通调用升级为真正的 RAF 合并调度点，并在 `mouseup` 收尾与滚动触发的可见页刷新链上同步 flush pending render；这说明阶段 5 已经不只是在补 visible-only 分支，而是在开始为后续 dirty/invalidation manager 建统一渲染调度边界。
13. `RenderInvalidationManager` 现已从文档待办变成实际代码模块，并正式接管 `visible pages dirty` 与帧级调度；这说明阶段 5 已经开始把“局部刷新策略”从 `Draw` 内联分支提升为可持续扩展的独立渲染失效层。
14. 在此基础上，`TableOverlayRenderer` 也已从规划模块变成实际代码模块，并开始承接 overlay 页清理与 `selectionCtx` 分发；overlay canvas 已真实接入 DOM，选区矩形也已切到 overlay 为权威输出，说明阶段 5 已经跨过了“只做双写预埋”的过渡点，开始进入真实渲染层迁移。
15. 对应的 Cypress 表格回归采样基线也已切到 composited page 结果，不再依赖“只采样 base canvas”“canvas 顺序等于 pageNo”这类旧假设；这意味着后续光标与 table tool 迁移到 overlay 时，不需要再反向保留旧测试模型。
16. 在此基础上，分页页包装里又已补出每页独立的 overlay DOM host，`Cursor` 可视层与 `TableTool` 也已切入页级 overlay host；这说明阶段 5 已经不再只是迁像素绘制，而是开始把实际交互 DOM 也从 editor container 的全局层收回到 page wrapper 层。
17. 在此基础上，`Previewer` 的页内辅助层也已向页级 overlay host 收口，`resizerSelection` 与拖拽镜像不再依赖 editor container 的全局定位；进一步地，图片全屏预览 modal 也已切到 editor 自己的 modal host，这说明阶段 5 的宿主迁移已经从页内辅助层推进到了原本仍挂在 `document.body` 的全局交互层。
18. 在此基础上，selection-overlay 专用刷新路径也已真正打通：拖选高频帧会优先只清理并重绘相关页 overlay，而不再回退到整页 visible render；这说明 `selection dirty / overlay dirty` 已经从“文档待办”变成实际被消费的调度语义。
19. 在此基础上，搜索与水印/背景这批剩余全局点也已继续收口：搜索导航链路已从整篇全量刷新切到 visible-only，并能额外补齐“前一个命中页 + 当前命中页”的相关页集合；背景图/水印图异步加载回绘与水印增删命令也都不再触发全量重绘。这说明阶段 5 对“天然全局点”的处理已经开始从渲染层扩展回交互功能层。
20. 在此基础上，搜索首次关键词输入也已不再触发布局重算，而是变成“全局匹配计算 + visible-only 渲染”；这说明搜索链路当前保留的全局成本已收缩到数据扫描本身，而不再包含整篇 render。
21. 在此基础上，`Draw.getDataURL()` 也已切到离屏导出路径：导出会在 detached page container 上生成页面并在 finally 中恢复 live render state，不再复用实时页面 canvas 做全局导出渲染；这说明导出/打印链虽然仍然天然全局，但已经被隔离出在线编辑宿主。
22. 在此基础上，搜索高亮绘制本身也已切到 overlay 层：无论是完整可见页渲染还是 selection-overlay 专用刷新，search highlight 都不再落到 base canvas。这说明搜索链路当前已经同时脱离 base 渲染层、全量 render 链与全局宿主问题。
23. 进一步地，搜索输入与导航入口现在也已直接改走 overlay-only 刷新，而不再触发 visible-only 整页重绘；这说明搜索链路已经不只是“绘制在 overlay 上”，而是连刷新调度边界也完全切出了 base 渲染主链。
24. 在此基础上，搜索匹配结果也已按页索引化，`Search.render(pageNo)` 不再每页遍历整份匹配列表，而是直接消费当前页切片；这说明搜索链路当前剩余的全局成本已经进一步收缩到匹配扫描与 page map 构建本身，而不再包含每页重复的全局遍历。
25. 在此基础上，控件搜索高亮也已同步切到 overlay 装饰层，并通过 overlay-only 刷新入口更新；这说明阶段 5 的“视觉装饰层上收”已经不再局限于原生搜索，而是开始统一覆盖控件级搜索/高亮能力。
26. 在此基础上，`layout dirty` 也已正式落地并被实际消费：布局无效时不会再误走 overlay-only 刷新，而是明确回到完整渲染链路。这说明阶段 5 的 invalidation 语义已经从“可见页 + overlay”扩展到了完整的布局边界控制。
27. 进一步地，控件搜索高亮内部也已同步完成按页索引化，`ControlSearch.renderHighlightList(pageNo)` 不再每页遍历整份控件高亮结果；这说明阶段 5 对“视觉装饰层按页消费”的收口已经不再局限于原生搜索，而是扩展到了控件搜索/高亮体系的内部消费模型。
28. 这意味着阶段 5 当前真正剩下的，已经主要是少数天然全局的数据计算成本，例如搜索整篇匹配扫描与导出整批页面生成，而不再是 live 渲染宿主或全局 DOM 宿主本身。
29. 在此基础上，阶段 6 对“事件层重复组装”的收口也在继续：`table/utils/createTablePositionContext.ts` 已开始统一 `TableNavigationService` 与 `resolveSelectionDragRange()` 的表格上下文拼装，`resolveSelectionBoundary()` 去掉了对 `Draw` 的假依赖，`RangeManager` 内部最后两处残留的歧义入口也已切回显式 `getEditBoundaryRange()`；这说明项目已经从“把主逻辑迁进 service”继续推进到“把 service 之间重复的胶水层也削薄”。
30. 进一步地，`Position.getPositionByXY()` 中最后残留的表格命中回调也已删除，`Position` 现在只负责正文 / 浮动元素 / 页边界命中，而表格命中正式只剩 `TableHitTestService` 单入口；这说明项目已经不只是把“表格逻辑迁进 service”，而是在真正切断旧中心对象对表格命中的历史耦合。
31. 再往下一层，selection-start 返回结构也已开始从“补丁字段散落”收回到聚合结果：`hitLineStartIndex / cursorDragAnchorIndex / preferDragAnchorOnCaretLine` 现已统一并入 `cursorState`，`mousedown` 只负责消费而不再自行拼接视觉态；这说明项目已经开始从“主服务收口”继续推进到“事件层结果对象收口”。
32. 在此基础上，`Cursor` 与命中链共享的视觉态也已进一步平台化：旧的 `hitLineStartIndex / dragAnchorIndex / preferDragAnchorOnCaretLine` 三组 Cursor API 已被统一 `CursorSelectionState` 取代，而正文命中与表格命中的“左半区回退一位 + 行首打标”规则也已沉到 `resolvePointerBoundaryAtPosition.ts` 这一个 helper。说明当前项目已经不只是“把逻辑移进 service”，而是在进一步消除 service 之间与 UI 状态之间的重复解释层。
33. 再进一步，`resolveSelectionBoundary()` 也已开始统一承接非表格行首边界提示，`resolveSelectionStartState()` 不再直接回读 raw 命中结果去生成非表格 `cursorState`；这说明当前项目正在把补丁字段的消费面持续往“边界层 + 视觉层”压缩，而不是让事件层长期直接感知这些细节。
34. 再往下，`TableHitTestService.resolveTableElementHit()` 这层只服务旧 `Position -> table` 递归命中链的死入口也已删除，说明当前项目不仅在收敛主链逻辑，也在持续物理出清已经退出主链的历史适配壳层。
35. 在此基础上，`segmentStartIndex` 已从通用命中类型中删除，fragment 起点判断改为按 snapshot 现算；`hitTargetIndex` 也已从通用命中类型退回到 boundary / 表格 page-point 元信息层。这说明项目正在把“命中结果”从历史上混装了选区辅助字段的大对象，继续收缩成更接近纯命中的最小外形。
36. 再进一步，通用 `IPagePoint` 也已从表格命中 helper 中拆到独立类型文件，`getTableFragmentByPagePoint()` 已回收进 `TableHitTestService`，`resolveSelectionBoundary.ts` 也已搬回 `table/hittest`。这说明项目不只是清理字段，还在持续把“命中域”的实现和类型边界从事件工具层抽回到真正的命中服务域内。
37. 再往下，`resolveSelectionBoundary.ts` 这层已经只被一个 service 消费的 helper 也已被内联进 `TableHitTestService`，边界类型则直接并入 `TableHitTestTypes.ts`。这说明项目当前不只是在做“模块搬家”，而是在继续减少命中域内部不必要的文件跳转和包装层。
38. 再进一步，`resolveAdjustedPointerPosition.ts` 这层只剩单一调用者的非表格命中归一化包装也已回收进 `TableHitTestService`。这说明命中域当前不只是在“把表格逻辑搬回 service”，而是在把原本分散在事件工具层的整条命中主链持续压缩回一个更明确的服务边界里。
39. 在此基础上，selection-start 侧那两层只服务事件起点链的 helper 也已从 `range/utils` 挪回 `event/utils`，而 `hitLineStartIndex` 也已从通用命中类型中退出。这说明当前项目已经开始不仅清理“表格命中”，也在同步把 selection-start 相关的辅助逻辑和类型噪音从通用域里剥离出去。
40. 再往下，`resolveTableCellPositionByPagePoint.ts` 这层也已整段并回 `TableHitTestService`，说明命中域当前已经从“service + 多个单用 helper”继续向“service 内聚实现 + 更少跳转文件”推进，结构越来越接近真正的平台型命中服务。
41. 在此基础上，`TableHitTestService` 还进一步固定持有了 `snapshotAccessor`，并删除了 `resolveFragmentCellSlice()` 里对快照 map 的重复 回退。说明命中域当前不仅在减少文件跳转，也在持续统一 service 内部访问 snapshot 的方式。
42. 进一步地，`TableHitTestService.resolvePointerPosition()` 也已拆成内部扩展结果与对外公共结果两层，命中域内部的 `hitTargetIndex / hitLineStartIndex` 不再通过公共返回值泄露给调用方。这说明当前项目正在把“命中服务的内部辅助信息”和“对外公共命中语义”做更清晰的边界隔离。
43. 再进一步，`TableHitTestService` 内部又删掉了两层只被单处消费的实现，并直接复用前一步命中结果里已经算好的 `activeSlice`，说明当前命中服务不仅在收紧对外公共面，也在持续压缩内部调用栈和重复查询。
44. 在此基础上，`Draw` 也已提升为 `TableHitTestService` 与 `TableLayoutSnapshotAccessor` 的统一宿主，命中主链和快照访问主链都开始从“多处临时实例化”收口到 draw 级单例。这说明当前重构已开始从“逻辑收口”进一步走向“服务生命周期收口”。
45. 再进一步，`Draw` 也已开始统一宿主 `TableNavigationService`，而一批命令/渲染/导航/选区模块里的本地 snapshot accessor 持有也已继续删除。说明当前这轮收口已经不只是“命中服务单例化”，而是在把整组 table 基础设施服务都往 draw 级统一宿主推进。
47. 进一步地，`RangeManager` 和 `TableNavigationService` 内部那批只剩单用或纯转发的 helper 也已继续减少，说明当前阶段已经不只是“搭好新主链”，而是在持续压平主链内部的实现层级，让后续再改规则时需要穿透的文件和方法更少。
48. 再往下，`TableSelectionProjectionService.ts` 也已整段并回 `RangeManager`，而 `TableHitTestService` 的公共入口也已只剩 `resolve()`。这说明当前收口已经从“把职责迁进 service”继续推进到“把多余 service 对象和多余公共 API 一起删掉”。
49. 在此基础上，`RangeManager` 中少数已无消费面的公开壳层也开始同步删除，而 `TableNavigationService` 中结果组装与垂直 sibling 解析这层单用 helper 也继续被内联。说明当前这轮已经从“去对象化”进一步推进到“去无效公共 API / 去单用方法层”的阶段。
49. 在此基础上，`TableNavigationService` 里负责结果组装和垂直 sibling 解析的单用 helper 也已继续被内联删除，说明当前这轮已经开始从“对象/模块层去重”进一步走到“方法层去中转”。
52. 再往下，事件层里只负责字段转发的 `applyPositionResultContext.ts` 与 `applyResolvedSelectionRange.ts` 也已被物理删除，`click / drag / mousedown / mousemove / mouseup` 主链直接就地消费命中结果和拖选结果。这说明当前收口已经从“删主干 service 壳层”继续推进到“删事件层无语义胶水文件”，让事件主链更接近直接表达真实状态写入。
53. 在此基础上，`TableOverlayRenderer` 也已继续从“已有模块”推进到“draw 级统一宿主”：`PageRenderer` 与 `RenderInvalidationManager` 不再各自实例化 overlay renderer，而是共同复用 `Draw` 持有的唯一宿主实例。这说明当前收口已经进一步进入渲染宿主层，而不只停留在 table service 层。
54. 再往下，`resolveExistingCaretAnchorIndex.ts` 这层只剩单处消费的 selection-start helper 也已并回 `resolveSelectionStartState.ts` 并物理删除，说明当前收口还在继续把事件起点链里的单用 helper 往主链内收，而不是停留在 table service 或渲染宿主层。
55. 与此同时，`Position.resolveRowBoundaryPosition()` 这层只剩单处消费的页边界兜底 helper 也已内联，说明当前收口还在继续深入到 position 主链内部的方法层，而不只是删文件级壳层。
56. 再往下，页内行带兜底 helper 也已内联回 `getPositionByXY()`，说明当前收口正在继续直接压平 position 主命中链内部的局部中转层。
57. 再进一步，页边界兜底 helper 也已内联回 `getPositionByXY()`，说明当前收口已经开始把 position 主命中链最外层的页内/页边界裁决也继续压回同一入口。
58. 与此同时，fresh direct-drag 的 table selection 起点也已重新收回 hit-range 主路径，`dragAnchorSource` 在 `mousemove / mouseup -> resolveSelectionDragRange()` 链上已完整透传，说明当前推进并不只是删壳，也在同步修复事件起点和拖选裁决之间最后一段语义脱节。
59. 再往下，`CommandAdapt.getRangeContext()` 也已开始继续从“大方法堆逻辑”拆成编排层与局部组装 helper，说明当前收口已经不只在删壳，也在继续压平命令层高频公开读取入口内部的职责块。
60. 与此同时，`RowRenderer.drawSelection()` 也已继续把跨行列表格选区裁决与普通选区矩形绘制拆成局部 helper，说明渲染层当前也在从“主方法内混合裁决 + 混合绘制”进一步朝更清晰的编排结构收口。
61. 再进一步，`RowRenderer.drawRow()` 也已继续把逐元素绘制分发与 table range queue 收成局部 helper，说明当前收口已经继续深入到渲染主链内部的逐元素调度层，而不只是停留在选区绘制层。
62. 在此基础上，`RowRenderer.drawRow()` 主循环也已进一步退化为编排层，逐元素分发现在主要由 `renderRowElement()` 承接，说明渲染主链当前已经开始继续向“主循环更薄、局部渲染块更明确”的结构演进。
63. 与此同时，`Position.resolvePageDirectHit()` 这层只剩单处消费的正文 direct-hit helper 也已内联回 `getPositionByXY()`，说明当前收口仍在继续直接压平 position 主命中入口本体，而不是停留在外围壳层清理。

这意味着本文档给出的行业路线已经不只是“参考”，而是正在被逐步落实到实际代码结构中。

---

## 11. 下一步建议

建议后续执行顺序：

1. 以本文档为路线总纲
2. 以 `table-refactor-plan.md` 为结构总设计
3. 以 `table-refactor-tasks.md` 为实际开发待办
4. 下一阶段继续收口主链残留：
   - 继续削薄 `resolveSelectionStartState.ts` 与其余 event utils
   - 清理 `Position / CommandAdapt / RowRenderer` 中未退役的旧语义与补丁
   - 在阶段 5 启动前，先把鼠标与键盘主链尽量全部收口到 snapshot + service
## 2026-04-22 对齐结论补充

- 该轮时点的实现仍然没有偏离本文路线。
- 这一轮 later-fragment 首行与 same-char 语义修复，进一步证明当时主链已经站稳在：
  - 统一 selection / cursor 投影
  - hit-test 主入口集中
  - navigation 主规则集中
  - 旧补丁壳持续物理删除
- 验证结果已经重新回到固定表格基线 `47 / 47` 全绿，因此当前工作重点继续是阶段 6 收口，不需要回退到“双轨保留旧主链”的方向。

### 2026-04-22 第二轮对齐补充

- 多单元格分页点击 / 输入 / tool / 纵向导航问题的修复，进一步证明当前路线应继续坚持：
  - `hit-test -> positionContext -> navigation -> render` 单主链
  - 不允许分页 fragment 页宿主、逻辑 cell、公开 cursor 语义各自维护一套独立规则
- 整表选择高亮与 later fragment top border 的修复，也说明渲染层当前真正需要做的是：
  - 把 cell 级 selection / border 绘制落到稳定的 cell bounds 与 overlay/base 分层上
  - 继续减少“先画主对象、再被递归子对象擦掉”的历史顺序依赖

### 2026-04-22 第三轮对齐补充

- 用户视频里暴露的分页纵向导航问题最终仍然回到同一条路线：不能把 `keydown up/down`、fragment 过渡、cell 内行移动拆成彼此孤立的规则。
- 当前修复说明：
  - `event handler` 负责把真实点击后的边界语义带进导航
  - `TableNavigationService` 负责同一逻辑 cell 内 fragment / page / row 的优先级裁决
- 继续沿这条“单主链裁决”推进，而不是在 UI 层追加新的例外补丁

### 2026-04-22 第四轮对齐补充

- 当前这轮把“分页纵向导航只是坐标统一问题”落实成了代码现实：
  - 真实点击落点
  - raw boundary
  - public cursor
  - fragment/page 间跳转
  这四者现在不再各自独立漂移。
- 这也再次说明本文路线正确：分页表格问题不该继续靠事件层打补丁，而应继续集中在 hit-test / navigation / projection 三个中心模块内收口。

### 2026-04-24 对齐补充

- 当前三份文档里“draw 级统一宿主”的说法现在已经与真实代码完全对齐：
  - `TableHitTestService`
  - `TableNavigationService`
  - `TableLayoutSnapshotAccessor`
  - `TableOverlayRenderer`
  都已经进入 `Draw` 统一宿主体系。
- 这意味着当时剩余工作继续集中在阶段 6：
  - 删除仍然存在的薄壳和重复实例化点
  - 继续压平 `event/utils / render / command` 内部主链层级

### 2026-04-25 对齐补充

- 该轮时点的实现仍然没有偏离本文路线。
- `resolveExistingCaretAnchorIndex.ts` 被并回 `resolveSelectionStartState.ts` 这件事，进一步说明该轮阶段已经不只是“把主规则迁进中心 service”，也在继续清理事件起点链内部只剩单处消费的 helper 壳层。
- `Position.resolveRowBoundaryPosition()` 被内联删除，则进一步说明该轮阶段也在同步压平 `Position` 内部的页边界兜底主链，剩余工作已经越来越偏向“删内部方法层级”而不是“重搭主干对象”。
- 页内行带兜底 helper 也被内联删除，则进一步说明该轮阶段已经开始直接削薄 `getPositionByXY()` 周边的单用兜底层，剩余工作继续集中在主链内部层级压平。
- 页边界兜底 helper 也被内联删除，并且 fixed baseline `57 / 57` 重新全绿，则说明该轮阶段的推进已经不只是结构压平，相关拖选主链修复也已经通过真实分页表格回归重新确认。
