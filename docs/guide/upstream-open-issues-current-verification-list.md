# Canvas Editor 当前待验证 Issues 列表

## 1. 用法

这份文档从 [upstream-open-issues-solo-full-table.md](/D:/canvas-editor/docs/guide/upstream-open-issues-solo-full-table.md) 中只提取当前状态为 `未验证` 的条目。

用途很简单：

1. 你每天开工先看这份
2. 每验证完一条，就回填总表
3. 回填后把这份列表同步更新

这样你不用每次重新扫全部 `50` 个 open issues。

---

## 2. 当前待验证列表

| Issue | 标题 | 验证入口 | 建议优先级 |
| --- | --- | --- | --- |
| #41 | 表格分页 | 表格分页专项测试组 / 重构文档 | 高 |
| #837 | 大文本计算性能优化 | `DrawLayoutPipeline.ts` / 性能文档 | 中 |
| #1372 | 图片浮动文字之上问题 | `Position.ts` / `image.cy.ts` | 中 |
| #1200 | Smart Word Wrapping Around Images ("SURROUND") | `Position.ts` / `image.cy.ts` | 中 |
| #1190 | tab缩进更多场景 | `tab.ts` / shortcut 文档 | 中 |
| #1053 | 单元格框线设置 | `TableTool.ts` / `table-pagination-border.cy.ts` | 中 |
| #877 | 分页符行为优化 | `PageBreakParticle.ts` / `pagebreak.cy.ts` | 中 |
| #725 | 排版缩进 | `row.cy.ts` / `text.cy.ts` / shortcut 文档 | 中 |
| #692 | 标点符号排版优化 | `TextParticle.ts` / `option.md` | 中 |
| #621 | 支持序号元素或段落拖拽 | `drag.ts` / drag 能力 | 中 |
| #390 | 是否可以生成如下的表格 | `table.cy.ts` / issue 具体内容 | 中 |

---

## 3. 推荐验证顺序

### 第一组：先看核心链

1. `#41`

### 第二组：再看常见编辑能力

1. `#725`
2. `#1190`

### 第三组：最后看样式、图片和性能细项

1. `#837`
2. `#1372`
3. `#1200`
4. `#1053`
5. `#877`
6. `#692`
7. `#621`
8. `#390`

---

## 4. 单人执行规则

每次只拿 `1` 到 `3` 个 issue 做，不要同时开太多。

推荐动作：

1. 验证一条
2. 立刻回填总表
3. 如果仍存在，再拆开发任务

不要先开一堆开发分支，再去补验证。

---

## 5. 自动化入口

当前已补脚本入口：

1. `npm run issues:verify:list`
2. `npm run issues:verify:current`
3. `npm run issues:verify -- --issue 41,813,1163`

说明：

1. 脚本会自动启动本地 Vite 服务
2. 会按 issue 映射跑现有 Cypress specs
3. 没有现成自动化覆盖的 issue，会打印为 `manual-only`

当前已确认：

1. `#94` 已补自动化样例并通过
2. `#1399` 已补自动化样例并通过；同时追加表单模式 `controlDeletableDisabled` 禁删控件结构回归，确认仍允许删除文本控件值
3. `#446` 使用 `painter.cy.ts` 通过
4. `#813` 已补光标右边界拖拽选区修复并通过：`pointer-debug-selection.cy.ts` / `plain-text-selection.cy.ts`
5. `#1163` 已按新增功能补行内表格样例并通过：`issue-inline-table-label.cy.ts` / `issue-1163-text-before-table.cy.ts` / `issue-left-blank-after-table-click.cy.ts` / `table.cy.ts`
6. `#1385` 已补文本控件/列举控件下划线专项样例并通过，覆盖有值控件、空控件、先点下划线再插空控件的打印图片输出：`issue-1385-control-underline.cy.ts` / `format.cy.ts`
7. `#1404` 已补缺省 `colgroup` 专项样例并通过：`issue-1404-table-colgroup-default.cy.ts` / `table.cy.ts`
8. `#1190` 当前仍保留 `manual-only`
9. `#621` 当前仍保留 `manual-only`
10. `#440` 已补列表子层级能力并通过专项样例：`issue-440-list-sublevel.cy.ts`，覆盖 Tab 增加子列表、Shift+Tab 取消子列表层级、`getValue/setValue` 层级数据往返
11. `#425` 已补文本控件值内嵌控件专项样例并通过：`issue-425-control-in-text-control.cy.ts` / `text.cy.ts`，保存恢复后保留子控件对象，子控件在渲染层保留独立 `controlId` 并可由 `getControlList()` 识别，避免空 `{}` 与双层括号。

当前开发候选：

1. `#41`：`table-pagination-input.cy.ts` 已收敛到 34/34 通过，`table-pagination-mock.cy.ts` 已收敛到 13/13 通过，`table-pagination-multicell.cy.ts` 已收敛到 4/4 通过；later fragment 起始光标上下往返、右箭头移动、mock 实际分页边界向下导航、多单元格 later-page 点击/工具/向下导航均已转绿。`table-pagination-merged.cy.ts` 仍稳定 0/5，主要失败是合并单元格找不到 later fragment 点。
