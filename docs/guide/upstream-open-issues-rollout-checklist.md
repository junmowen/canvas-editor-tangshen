# Canvas Editor Open Issues 本地推进清单

## 1. 目的

这份文档用于把上游当前全部 open issues 拉成本地推进清单，并在推进前先判断：

> 你的当前项目代码里，是否已经有明确证据表明这个问题或需求已被解决。

这里的“已解决”判断不会依赖 issue 是否仍然 open，而只依赖你本地项目里的实际证据：

1. 代码实现
2. 文档说明
3. 测试覆盖
4. 重构记录

---

## 2. 数据基线

本清单基于 `2026-04-27` 从 GitHub API 获取的当前 open issues。

来源：

- Issues API: `https://api.github.com/repos/Hufe921/canvas-editor/issues?state=open&per_page=100&page=1`
- Issues 页面: <https://github.com/Hufe921/canvas-editor/issues>

本次共纳入 `50` 个 open issues，不挑选，不截断。

---

## 3. 判断规则

为避免误判，统一使用以下四档：

### 3.1 `已解决`

满足以下任一：

1. 本地文档已经把该能力作为正式能力说明
2. 本地代码存在明确实现入口
3. 本地测试对应该场景已有稳定覆盖

### 3.2 `部分解决`

满足以下任一：

1. 能力主链已存在，但 issue 诉求明显更大
2. 已有重构主线或部分能力落地，但仍不能确认完全闭环
3. 本地已有大量相关实现和测试，但 issue 场景仍需专项回归

### 3.3 `未见证据`

满足以下任一：

1. 文档没有正式能力说明
2. 代码没有明确实现入口
3. 测试没有对应覆盖

### 3.4 `需人工验证`

用于以下情况：

1. 问题是 bug，而不是纯功能缺失
2. 本地存在疑似相关修复，但缺少直接 issue 级证据
3. 必须按原 issue 场景回归，才能确认是否解决

---

## 4. 全量 open issues 推进清单

| Issue | Title | 本地判断 | 证据/依据 | 推进建议 |
| --- | --- | --- | --- | --- |
| #1404 | 插入表格的时候当colgroup未传入时，默认使用编辑器宽度平分 | `已解决` | 已在格式化表格数据时为缺省 `colgroup` 按编辑区宽度平分补齐列宽，并补 [issue-1404-table-colgroup-default.cy.ts](/D:/canvas-editor/cypress/e2e/issues/issue-1404-table-colgroup-default.cy.ts) 直接回归。 | 本地已验证，后续仅保留回归。 |
| #1399 | 选中CONTROL类型的内容，向前删除executeBackspace无效 | `已解决` | 已补 CONTROL 选中 backspace 专项，并追加表单模式 `controlDeletableDisabled` 禁删控件结构回归；相关样例见 [issue-1399-control-backspace.cy.ts](/D:/canvas-editor/cypress/e2e/issues/issue-1399-control-backspace.cy.ts) 和 [issue-form-control-deletion-disabled.cy.ts](/D:/canvas-editor/cypress/e2e/issues/issue-form-control-deletion-disabled.cy.ts)。 | 本地已验证，后续仅保留回归。 |
| #1387 | 希望表格可以添加根据内容自动调整的功能 | `未见证据` | 文档只见表格列最小宽度与现有列宽逻辑，未见“按内容自动调整表格”正式能力入口。 | 作为未实现需求列入 backlog。 |
| #1385 | 官网的demo中 在文本、列举控件中 插入下划线 显示异常 | `已解决` | 已将控件下划线纳入控件值样式传播与 HTML 输出；插入控件会继承当前默认下划线样式，打印过滤空下划线控件时保留空白占位用于画线，并补 [issue-1385-control-underline.cy.ts](/D:/canvas-editor/cypress/e2e/issues/issue-1385-control-underline.cy.ts) 覆盖文本控件、列举控件、有值打印、空控件打印和先点下划线再插空控件的打印路径。 | 本地已验证，后续仅保留回归。 |
| #1372 | 图片浮动文字之上问题 | `部分解决` | 本地已具备图片浮动与环绕实现，见 [Position.ts](/D:/canvas-editor/src/editor/core/position/Position.ts) 的 `setSurroundPosition()` 与 [contextmenu-internal.md](/D:/canvas-editor/docs/guide/contextmenu-internal.md) 的环绕能力，但 issue 仍 open。 | 能力已存在，但应按浮动图片压字场景专项验证。 |
| #1317 | Area元素能否支持在表格中插入 | `未见证据` | 文档和代码未见把 `Area` 正式描述为表格内能力入口。 | 作为未实现需求列入 backlog。 |
| #1270 | 同屏多页 | `未见证据` | 本地已有分页模式与连续模式，但未见“同屏多页”作为独立正式能力。 | 作为未实现需求列入 backlog。 |
| #1256 | 日期如何自定义选择年或月 | `未见证据` | 本地 DatePicker 支持年/月显示与翻页，见 [DatePicker.ts](/D:/canvas-editor/src/editor/core/draw/particle/date/DatePicker.ts)，但未见“自定义只选年/月”配置入口。 | 作为未实现需求列入 backlog。 |
| #1237 | 分栏效果 | `未见证据` | 文档与代码未见多栏布局能力。 | 作为未实现需求列入 backlog。 |
| #1200 | Smart Word Wrapping Around Images ("SURROUND") | `部分解决` | 本地已存在图片四周环绕能力入口，见 [contextmenu-internal.md](/D:/canvas-editor/docs/guide/contextmenu-internal.md) 与 [Position.ts](/D:/canvas-editor/src/editor/core/position/Position.ts)，但 issue 标题强调 “smart” 环绕，诉求可能高于当前实现。 | 先把现有环绕能力视为部分覆盖，再按复杂段落样例验证。 |
| #1190 | tab缩进更多场景 | `部分解决` | 本地已存在缩进相关快捷键与布局能力，见 [shortcut-internal.md](/D:/canvas-editor/docs/guide/shortcut-internal.md) 与 issue `#725` 同类方向，但“更多场景”未见明确完成。 | 列为部分覆盖需求。 |
| #1163 | 表格前如何添加文字 | `部分解决` | 本地表格分页和前后编辑主线已大幅推进，见 [table-refactor-plan.md](/D:/canvas-editor/docs/guide/table-refactor-plan.md) 与大量表格分页 Cypress 用例，但 issue 仍 open。 | 先用“表格前输入文字”做回归验证，可能已解决或接近解决。 |
| #1106 | Add Red Squiggly Underline Under Misspelled Words | `未见证据` | 本地有多种下划线样式，但未见拼写检查或红色波浪线拼写能力。 | 作为未实现需求列入 backlog。 |
| #1053 | 单元格框线设置 | `部分解决` | 本地已有表格边框、边框拖拽与分页边框测试，见 [TableTool.ts](/D:/canvas-editor/src/editor/core/draw/particle/table/TableTool.ts) 和 `table-pagination-border.cy.ts`。但 issue 标题泛指“单元格框线设置”，能力范围需人工确认。 | 视为部分覆盖，补样例确认 UI/API 是否满足。 |
| #1051 | 增区域设置默认高度，类似单元格，可以拖拽一个高度作为默认高度 | `未见证据` | Area 能力存在，但未见“默认高度拖拽配置”文档或公开能力。 | 作为未实现需求列入 backlog。 |
| #1024 | 文档版本对比功能 | `未见证据` | 文档、代码、README 未见文档 diff / compare 能力。 | 作为未实现需求列入 backlog。 |
| #957 | 多个选区 | `未见证据` | 当前选区主链是单选区体系，未见多选区能力。 | 作为未实现需求列入 backlog。 |
| #888 | 增加文本框功能 | `未见证据` | README 与文档未见独立文本框能力。 | 作为未实现需求列入 backlog。 |
| #877 | 分页符行为优化 | `部分解决` | 本地已有分页符元素和分页模式，见 README、[start.md](/D:/canvas-editor/docs/guide/start.md)、[PageBreakParticle.ts](/D:/canvas-editor/src/editor/core/draw/particle/PageBreakParticle.ts)。但“行为优化”仍是 open issue。 | 视为已有能力但细节待验证。 |
| #872 | 表格四周环绕 | `未见证据` | 本地有图片环绕，但未见表格四周环绕作为正式能力。 | 作为未实现需求列入 backlog。 |
| #866 | 分节符 | `未见证据` | 未见 section break 能力入口。 | 作为未实现需求列入 backlog。 |
| #837 | 大文本计算性能优化 | `部分解决` | 本地已有大量性能重构基础，见 [performance-optimization-plan.md](/D:/canvas-editor/docs/guide/performance-optimization-plan.md)、visible-only / overlay-only / invalidation 体系，但 issue 仍 open。 | 视为性能主线部分落地，需用大文本样例实测。 |
| #825 | 文本控件内插入列表元素 | `未见证据` | 未见文档声明文本控件内正式支持列表元素嵌套。 | 作为未实现需求列入 backlog。 |
| #813 | 光标位置 | `已解决` | 已修正从已有光标右边界拖拽时被误当作字符内部命中导致多选左侧字符的问题；专项验证见 [pointer-debug-selection.cy.ts](/D:/canvas-editor/cypress/e2e/menus/pointer-debug-selection.cy.ts) 和 [plain-text-selection.cy.ts](/D:/canvas-editor/cypress/e2e/menus/plain-text-selection.cy.ts)。 | 本地已验证，后续仅保留回归。 |
| #778 | 页眉页脚可以配置某一页不显示 | `未见证据` | 本地有页眉页脚能力，但未见按单页隐藏的正式配置。 | 作为未实现需求列入 backlog。 |
| #762 | 元素支持悬浮提示 | `未见证据` | 未见元素 tooltip/hover tip 公开能力文档。 | 作为未实现需求列入 backlog。 |
| #747 | Add footnote | `未见证据` | 未见脚注能力文档或代码入口。 | 作为未实现需求列入 backlog。 |
| #725 | 排版缩进 | `部分解决` | 本地已有缩进相关快捷键与段落能力，但 issue 标题范围较大。 | 作为已有部分能力、细节待确认。 |
| #718 | 希望添加指定页面横向功能 | `未见证据` | 当前纸张方向配置是全局能力，未见按指定页面横向。 | 作为未实现需求列入 backlog。 |
| #692 | 标点符号排版优化 | `部分解决` | 本地已有 `wordBreak`、标点测量与相关排版逻辑，见 [option.md](/D:/canvas-editor/docs/guide/option.md) 与 [TextParticle.ts](/D:/canvas-editor/src/editor/core/draw/particle/TextParticle.ts)。但 issue 仍 open。 | 视为部分覆盖，需要中文排版样例验证。 |
| #671 | 控件验证规则相关需求 | `未见证据` | 未见系统性的控件验证规则引擎公开能力。 | 作为未实现需求列入 backlog。 |
| #650 | 表格嵌套 | `未见证据` | 未见表格嵌套正式能力文档。 | 作为未实现需求列入 backlog。 |
| #621 | 支持序号元素或段落拖拽 | `部分解决` | README 已声明支持拖拽，但 issue 指向更细的“序号元素或段落拖拽”，未见专项说明。 | 视为部分覆盖，需人工验证。 |
| #605 | 按段落设置行布局方式 | `部分解决` | 本地已有段落/行对齐与 rowFlex 相关能力，但未见完整“按段落设置行布局方式”文档条目。 | 视为部分覆盖。 |
| #499 | Add paragraph spacing options | `未见证据` | 未见正式段前段后间距配置文档。 | 作为未实现需求列入 backlog。 |
| #478 | Add feature similar to MS Word macros | `未见证据` | 未见宏或脚本化自动化能力。 | 作为未实现需求列入 backlog。 |
| #451 | 编辑器支持rtl渲染 | `未见证据` | 未见 RTL 渲染文档或能力入口。 | 作为未实现需求列入 backlog。 |
| #446 | 格式刷未携带所有格式 | `需人工验证` | 本地已有格式刷能力，见 [command-execute.md](/D:/canvas-editor/docs/guide/command-execute.md)，但 issue 指向“未携带所有格式”，必须按样式覆盖面验证。 | 建议专项列出格式项回归。 |
| #442 | 控件最小宽度设置支持跨行 | `未见证据` | 代码里有控件最小宽度相关痕迹，但未见“跨行支持”正式能力文档。 | 作为未实现或未闭环能力列入 backlog。 |
| #440 | 文档列表内容内无法取消或者增加子列表 | `已解决` | 已补 `listLevel` 列表层级、Tab/Shift+Tab 调整层级、分层编号/缩进计算和数据压缩展开保留；专项验证见 [issue-440-list-sublevel.cy.ts](/D:/canvas-editor/cypress/e2e/issues/issue-440-list-sublevel.cy.ts)。 | 验证后关闭本地任务。 |
| #438 | 可否增加文档处理  没有标尺值功能 | `未见证据` | 未见无标尺值处理能力的明确说明。 | 作为未实现需求列入 backlog。 |
| #425 | 文本控件内容中，再插入控件，页面{}显示有问题。 | `已解决` | 已补文本控件值内嵌控件处理：运行时可在文本控件内 `executeInsertControl`，保存恢复后保留子控件对象；子控件在渲染层保留独立 `controlId`，可由 `getControlList()` 识别，不再显示空 `{}` 或双层括号；专项验证见 [issue-425-control-in-text-control.cy.ts](/D:/canvas-editor/cypress/e2e/issues/issue-425-control-in-text-control.cy.ts)。 | 验证后关闭本地任务。 |
| #390 | 是否可以生成如下的表格 | `需人工验证` | issue 标题过泛，需打开 issue 内容才能知道具体表格结构；本地已有大量表格能力但无法仅凭标题判断。 | 需要补 issue 内容摘要后再推进。 |
| #374 | 主线合并支持svg、pdf渲染层 | `部分解决` | README 明确说明 `svg` 在开发中、`pdf` 在 feature 分支可用，但不是主线正式能力。 | 视为主线未完全解决。 |
| #362 | 批注功能添加连接线 | `未见证据` | README/文档有批注字样，但未见“批注连接线”能力。 | 作为未实现需求列入 backlog。 |
| #312 | 能否提供审阅模式 | `未见证据` | 未见审阅/track changes 模式。 | 作为未实现需求列入 backlog。 |
| #295 | 多人协作 | `未见证据` | README 仅提到 `CRDT` feature 分支，主线未见协作能力。 | 作为未实现需求列入 backlog。 |
| #256 | tab stops setting | `未见证据` | 未见 tab stops 正式配置能力。 | 作为未实现需求列入 backlog。 |
| #195 | 是否对将项目改成monorepo的pr感兴趣？ | `未见证据` | 当前仓库结构并非 monorepo。 | 这不是你的业务功能问题，可单独归为“忽略/不跟进”。 |
| #94 | 连页模式数据比较多时显示白屏 | `部分解决` | 本地已有可见页刷新、overlay-only、性能调度和失效管理，见 [RenderInvalidationManager.ts](/D:/canvas-editor/src/editor/core/table/render/RenderInvalidationManager.ts) 与 [performance-optimization-plan.md](/D:/canvas-editor/docs/guide/performance-optimization-plan.md)，但 issue 仍 open。 | 视为性能主线部分落地，需用大数据连续模式实测。 |
| #41 | 表格分页 | `部分解决` | 本地已有大规模分页表格重构、文档、测试与 README 主线说明；本轮将 [table-pagination-input.cy.ts](/D:/canvas-editor/cypress/e2e/menus/table-pagination-input.cy.ts) 从 28/34 推进到 32/34，剩余 later fragment 起始光标上下往返与右箭头移动，详见 [issue-41-table-pagination-failure-breakdown.md](/D:/canvas-editor/docs/guide/issue-41-table-pagination-failure-breakdown.md)。 | 继续收敛 later fragment start caret 导航。 |

---

## 5. 从全量清单得到的结论

### 5.1 已明确“未见证据”的 issue 占多数

大多数 open issues 本质上是功能诉求，而不是 bug。  
对这些 issue，当前本地项目并没有明确实现证据，因此不应误判为“已经解决”。

### 5.2 真正值得优先推进的是三类

建议先推进以下三类：

1. `需人工验证`
2. `部分解决`
3. 直接命中你业务范围的 `未见证据`

### 5.3 当前最不值得花时间的 issue

以下类型可以后置：

1. 明显不在你业务范围内的长期 feature
2. 架构诉求类，例如 `#195`
3. 你不会启用的高级能力

---

## 6. 建议的本地推进顺序

### 第一轮：先验证 bug 和核心主线

先处理：

1. `#1404`
2. `#1399`
3. `#1385`
4. `#1163`
5. `#813`
6. `#446`
7. `#440`
8. `#425`
9. `#41`
10. `#94`

原因：

1. 这批最可能已经在本地部分修复
2. 但如果不验证，你会重复推进已解决问题

### 第二轮：再处理部分解决的功能主线

再处理：

1. `#1372`
2. `#1200`
3. `#1053`
4. `#877`
5. `#837`
6. `#692`
7. `#621`
8. `#605`
9. `#374`

### 第三轮：最后再建纯 backlog

剩余 `未见证据` 的功能诉求，统一列入 backlog，不急着拆开发任务。

---

## 7. 推荐的执行方式

建议你在自己项目里再建一份更轻的执行表，只保留：

1. issue
2. 本地判断
3. 是否命中你的业务
4. 是否需要验证
5. 是否需要推进

这样你后面推进时会更轻，不必每次重新看完整 issue 列表。

---

## 8. 结论

你要的不是“把所有 issue 都立刻推进”，而是：

1. 先把所有 issue 全量纳入本地清单
2. 在推进前先排除那些本地其实已经解决或部分解决的项
3. 把真正还没解决、且命中你业务的问题再推进

按这份清单，当前最关键的不是继续扩 backlog，而是优先验证：

1. 表格分页
2. 光标/选区/删除
3. 下划线与渲染
4. 连页大数据性能
