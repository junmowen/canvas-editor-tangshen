# Canvas Editor Open Issues 可执行推进清单

## 1. 目的

这份文档是在 [upstream-open-issues-rollout-checklist.md](./upstream-open-issues-rollout-checklist.md) 基础上继续收口的“任务版”清单。

目标不是再判断一次 issue，而是把每个 issue 变成下面两类之一：

1. 可以立即验证的任务
2. 只能先建 backlog、暂不开发的任务

---

## 2. 字段说明

### 2.1 `本地状态`

取值沿用上一份文档：

1. `已解决`
2. `部分解决`
3. `未见证据`
4. `需人工验证`

### 2.2 `验证方式`

仅使用三种：

1. `代码走查`
2. `现有测试回归`
3. `新增最小场景验证`

### 2.3 `下一步动作`

统一使用：

1. `验证后关闭本地任务`
2. `验证后补专项测试`
3. `建 backlog，不立即开发`
4. `等业务需要再立项`

---

## 3. 第一优先级：先验证 bug 与核心主线

| Issue | 本地状态 | 验证方式 | 候选文件 | 现有测试迹象 | 下一步动作 |
| --- | --- | --- | --- | --- | --- |
| #1404 colgroup 默认平分 | `已解决` | `新增最小场景验证` | `issue-1404-table-colgroup-default.cy.ts`, `table.cy.ts` | 已补缺省 `colgroup` 专项样例并通过 | 验证后关闭本地任务 |
| #1399 CONTROL 选中后 backspace 无效 | `已解决` | `新增最小场景验证` | `issue-1399-control-backspace.cy.ts`, `issue-form-control-deletion-disabled.cy.ts`, `Control.ts`, `DrawMutationService.ts` | 已补 CONTROL 选中 backspace 和表单模式 `controlDeletableDisabled` 禁删控件结构专项样例，仍允许删除文本控件值 | 验证后关闭本地任务 |
| #1385 文本/列举控件下划线异常 | `已解决` | `新增最小场景验证` | `issue-1385-control-underline.cy.ts`, `format.cy.ts` | 已补文本控件/列举控件下划线专项样例并通过，覆盖有值控件、空控件、先点下划线再插空控件的打印图片输出 | 验证后关闭本地任务 |
| #1163 表格前添加文字 | `已解决` | `现有测试回归` + `新增最小场景验证` | `issue-inline-table-label.cy.ts`, `issue-1163-text-before-table.cy.ts`, `issue-left-blank-after-table-click.cy.ts`, `table.cy.ts` | 已补表格前插入文字、行内表格标签、表格点击后左侧空白光标与基础表格回归，当前 `15/15` 通过 | 验证后关闭本地任务 |
| #813 光标位置 | `已解决` | `现有测试回归` + `新增最小场景验证` | `resolveSelectionDragRange.ts`, `pointer-debug-selection.cy.ts`, `plain-text-selection.cy.ts` | 已补光标右边界拖拽选区修复，覆盖普通文本正反向拖拽、从已有光标正反向拖拽和表格 pointer debug | 验证后关闭本地任务 |
| #446 格式刷未携带所有格式 | `已解决` | `新增最小场景验证` | [command-execute.md](../command-execute.md), `painter.cy.ts` | 已扩展 `painter.cy.ts` 覆盖 `bold`、`color`、`highlight`、`font`、`size`、`italic`、`underline`、`strikeout`、`textDecoration`，当前 `1/1` 通过 | 验证后关闭本地任务 |
| #440 列表内容内无法取消或增加子列表 | `已解决` | `新增最小场景验证` | `issue-440-list-sublevel.cy.ts`, `ListParticle.ts`, `TabIntent.ts` | 已补 `listLevel`、Tab/Shift+Tab 调整层级和层级数据往返验证 | 验证后关闭本地任务 |
| #425 文本控件内容中再插入控件显示问题 | `已解决` | `新增最小场景验证` | `issue-425-control-in-text-control.cy.ts`, `text.cy.ts`, `element.ts` | 已补文本控件值内嵌控件专项样例，运行时可在文本控件内 `executeInsertControl`，保存恢复后保留子控件对象，子控件拥有独立 `controlId` 并可由 `getControlList()` 识别，避免空 `{}` 与双层括号 | 验证后关闭本地任务 |
| #41 表格分页 | `部分解决` | `现有测试回归` | [issue-41-table-pagination-failure-breakdown.md](../table/issue-41-table-pagination-failure-breakdown.md), `table-pagination-input.cy.ts`, `table-pagination-mock.cy.ts`, `table-pagination-multicell.cy.ts`, `table-pagination-merged.cy.ts`, `resolveSelectionDragRange.ts` | `table-pagination-input.cy.ts` 已从 28/34 推进到 34/34；`table-pagination-mock.cy.ts` 已收敛到 13/13；`table-pagination-multicell.cy.ts` 已收敛到 4/4；`table-pagination-merged.cy.ts` 已收敛到 5/5；合并单元格缺省 colgroup 与 rowspan carry-cell 跨页拆分已修复 | 继续跑剩余表格分页专项并做人工样例确认 |
| #94 连页模式数据多时白屏 | `已解决` | `新增最小场景验证` | `issue-94-continuity-large-doc.cy.ts`, `RenderInvalidationManager.ts`, `DrawRenderFacadeService.ts`, [performance-optimization-plan.md](../architecture/performance-optimization-plan.md) | 已补连续模式 2000 行大文档非空白渲染样例，当前 `1/1` 通过 | 验证后关闭本地任务 |

---

## 4. 第二优先级：已有部分实现，先确认覆盖程度

| Issue | 本地状态 | 验证方式 | 候选文件 | 现有测试迹象 | 下一步动作 |
| --- | --- | --- | --- | --- | --- |
| #1372 图片浮动文字之上 | `部分解决` | `新增最小场景验证` | `Position.ts`, `ImageParticle.ts`, `image.cy.ts` | 有 image 测试 | 验证后补专项测试 |
| #1200 图片四周智能环绕 | `部分解决` | `新增最小场景验证` | `Position.ts`, [contextmenu-internal.md](../contextmenu-internal.md), `image.cy.ts` | 有 image 测试 | 验证后补专项测试 |
| #1053 单元格框线设置 | `已解决` | `现有测试回归` + `新增最小场景验证` | `issue-1053-table-cell-border.cy.ts`, `table-pagination-border.cy.ts`, `TableTool.ts` | 已补每个 td 独立 `borderColor` / `borderWidth`，并补整表边框类型/颜色、单元格单边框设置/取消、仅设置 td 边框颜色/宽度时自动显示四边、单元格边框样式数据往返、单格红色粗框导出渲染与分页 fragment 顶边框渲染验证，当前 `5/5` 通过 | 验证后关闭本地任务 |
| #877 分页符行为优化 | `已解决` | `现有测试回归` + `新增最小场景验证` | `issue-877-pagebreak-behavior.cy.ts`, `pagebreak.cy.ts`, `PageBreakParticle.ts` | 已补分页符元素数据保留、后续内容新页渲染和菜单入口验证，当前 `2/2` 通过 | 验证后关闭本地任务 |
| #837 大文本计算性能优化 | `部分解决` | `新增最小场景验证` | [performance-optimization-plan.md](../architecture/performance-optimization-plan.md), `DrawLayoutPipeline.ts` | 无大文本性能自动化专测 | 验证后补性能样例 |
| #692 标点符号排版优化 | `部分解决` | `新增最小场景验证` | `TextParticle.ts`, [option.md](../option.md) | 无专测 | 验证后补排版样例 |
| #621 支持序号元素或段落拖拽 | `部分解决` | `新增最小场景验证` | `drag.ts`, `GlobalEvent.ts` | 有拖拽能力说明，无专测 | 验证后补专项测试 |
| #605 按段落设置行布局方式 | `部分解决` | `代码走查` + `新增最小场景验证` | `row.cy.ts`, [option.md](../option.md) | 有 row 测试 | 验证后决定是否拆细功能任务 |
| #374 主线合并支持 svg、pdf 渲染层 | `部分解决` | `代码走查` | `README.md`, [start.md](../start.md) | README 明确是 feature 分支状态 | 建 backlog，不立即开发 |
| #725 排版缩进 | `部分解决` | `现有测试回归` + `新增最小场景验证` | [shortcut-internal.md](../shortcut-internal.md), `row.cy.ts`, `text.cy.ts` | 有相关文本/段落测试 | 验证后补专项测试 |
| #1190 tab 缩进更多场景 | `已解决` | `新增最小场景验证` | `issue-1190-tab-indent-text.cy.ts`, `issue-440-list-sublevel.cy.ts`, `TabIntent.ts`, [shortcut-internal.md](../shortcut-internal.md) | 已补普通文本插入带样式 `TAB` 元素和列表 Tab/Shift+Tab 层级调整验证，当前 `3/3` 通过 | 验证后关闭本地任务 |

---

## 5. 第三优先级：明确未见能力证据，先建 backlog

| Issue | 本地状态 | 验证方式 | 候选文件 | 现有测试迹象 | 下一步动作 |
| --- | --- | --- | --- | --- | --- |
| #1387 表格按内容自动调整 | `未见证据` | `代码走查` | `TableOperate.ts` | 无 | 建 backlog，不立即开发 |
| #1317 Area 插入表格 | `未见证据` | `代码走查` | `Area.ts`, `TableParticle.ts` | 无 | 建 backlog，不立即开发 |
| #1270 同屏多页 | `未见证据` | `代码走查` | `PageSetupService.ts` | 无 | 等业务需要再立项 |
| #1256 日期自定义选择年或月 | `未见证据` | `代码走查` | `DatePicker.ts`, `date.cy.ts` | 有 date 测试，但无该能力 | 建 backlog，不立即开发 |
| #1237 分栏效果 | `未见证据` | `代码走查` | `DrawLayoutPipeline.ts` | 无 | 等业务需要再立项 |
| #1106 红色拼写波浪线 | `未见证据` | `代码走查` | `Underline.ts` | 无 | 建 backlog，不立即开发 |
| #1051 Area 默认高度可拖拽 | `未见证据` | `代码走查` | `Area.ts` | 无 | 建 backlog，不立即开发 |
| #1024 文档版本对比 | `未见证据` | `代码走查` | `Command.ts` | 无 | 等业务需要再立项 |
| #957 多个选区 | `未见证据` | `代码走查` | `RangeManager.ts` | 无 | 建 backlog，不立即开发 |
| #888 文本框功能 | `未见证据` | `代码走查` | `BlockParticle.ts` | 无 | 等业务需要再立项 |
| #872 表格四周环绕 | `未见证据` | `代码走查` | `TableParticle.ts`, `Position.ts` | 无 | 建 backlog，不立即开发 |
| #866 分节符 | `未见证据` | `代码走查` | `PageBreakParticle.ts` | 无 | 建 backlog，不立即开发 |
| #825 文本控件内插入列表元素 | `未见证据` | `代码走查` | `TextControl.ts`, `ListParticle.ts` | 无 | 建 backlog，不立即开发 |
| #778 页眉页脚某一页不显示 | `未见证据` | `代码走查` | `Header.ts`, `Footer.ts` | 无 | 建 backlog，不立即开发 |
| #762 元素悬浮提示 | `未见证据` | `代码走查` | `GlobalEvent.ts` | 无 | 等业务需要再立项 |
| #747 Add footnote | `未见证据` | `代码走查` | [schema.md](../schema.md) | 无 | 建 backlog，不立即开发 |
| #718 指定页面横向 | `未见证据` | `代码走查` | `PageSetupService.ts` | 无 | 建 backlog，不立即开发 |
| #671 控件验证规则 | `未见证据` | `代码走查` | `Control.ts` | 无 | 等业务需要再立项 |
| #650 表格嵌套 | `未见证据` | `代码走查` | `TableParticle.ts` | 无 | 建 backlog，不立即开发 |
| #499 paragraph spacing | `未见证据` | `代码走查` | `row.cy.ts`, [option.md](../option.md) | 无正式能力说明 | 建 backlog，不立即开发 |
| #478 类似 Word 宏 | `未见证据` | `代码走查` | [plugin-custom.md](../plugin-custom.md) | 无 | 等业务需要再立项 |
| #451 RTL 渲染 | `未见证据` | `代码走查` | `TextParticle.ts` | 无 | 建 backlog，不立即开发 |
| #442 控件最小宽度跨行 | `未见证据` | `代码走查` | `Control.ts` | 无 | 建 backlog，不立即开发 |
| #438 文档处理无标尺值 | `未见证据` | `代码走查` | [option.md](../option.md) | 无 | 建 backlog，不立即开发 |
| #362 批注功能添加连接线 | `未见证据` | `代码走查` | [schema.md](../schema.md) | 无 | 建 backlog，不立即开发 |
| #312 审阅模式 | `未见证据` | `代码走查` | `README.md` | 无 | 等业务需要再立项 |
| #295 多人协作 | `未见证据` | `代码走查` | `README.md` | 仅有 CRDT feature 分支说明 | 建 backlog，不立即开发 |
| #256 tab stops setting | `未见证据` | `代码走查` | `TabIntent.ts` | 无 | 建 backlog，不立即开发 |
| #195 monorepo | `未见证据` | `代码走查` | `package.json` | 与业务能力无关 | 标记忽略，不进入功能推进 |

---

## 6. 第四优先级：标题过泛或需补 issue 详情摘要

| Issue | 本地状态 | 验证方式 | 候选文件 | 现有测试迹象 | 下一步动作 |
| --- | --- | --- | --- | --- | --- |
| #390 是否可以生成如下的表格 | `需人工验证` | `新增最小场景验证` | `table.cy.ts`, `TableParticle.ts` | 有 table 测试 | 先补 issue 内容摘要，再决定是否开发 |

---

## 7. 推荐执行顺序

### 第 1 轮

只做“已存在相关主线”的验证任务：

1. `#41`
2. `#94`
3. `#1404`
4. `#1399`
5. `#1385`
6. `#1163`
7. `#813`
8. `#446`
9. `#440`
10. `#425`

目标：

1. 排除重复推进
2. 先确认哪些 open issue 其实本地已接近解决

### 第 2 轮

再做“能力已有，但覆盖不明”的部分解决项：

1. `#1372`
2. `#1200`
3. `#1053`
4. `#877`
5. `#837`
6. `#692`
7. `#621`
8. `#605`
9. `#725`
10. `#1190`

### 第 3 轮

最后才整理 backlog：

1. 全部 `未见证据`
2. `#390`
3. `#195`

---

## 8. 实际使用建议

你后面推进时，不需要同时盯住 50 个 issue。

更合理的做法是：

1. 先按这份表完成第 1 轮验证
2. 把验证结果回填到 [upstream-open-issues-rollout-checklist.md](./upstream-open-issues-rollout-checklist.md)
3. 只把验证后仍未解决、且命中你业务的项，继续拆成开发任务

这样推进成本会低很多，也不会把“上游仍 open”误当成“你本地一定没解决”。

---

## 9. 单人开发最简流程

如果只有你一个人开发，不建议把流程做重。

你只需要保留 4 个状态：

1. `未验证`
2. `已验证-本地已解决`
3. `已验证-仍存在`
4. `暂不处理`

对应动作也只保留 4 个：

1. `验证`
2. `补测试`
3. `开发`
4. `跳过`

### 9.1 推荐你的实际推进方式

每个 issue 只记录下面这些字段就够了：

1. `issue`
2. `标题`
3. `本地状态`
4. `是否命中你的业务`
5. `验证入口`
6. `下一步`

### 9.2 推荐你按这个顺序做

1. 先处理第 1 轮的验证任务
2. 验证通过的直接标记“本地已解决”
3. 验证失败且命中业务的，才转成开发任务
4. 不命中业务的，一律标“暂不处理”

### 9.3 不建议你做的事

单人开发时，不建议再维护这些额外内容：

1. 负责人字段
2. 里程碑字段
3. 协作备注
4. 复杂优先级体系
5. 过细的状态流转

你只需要保证一件事：

> 每个上游 issue 在你本地要么已经验证过，要么明确知道为什么现在不做。
