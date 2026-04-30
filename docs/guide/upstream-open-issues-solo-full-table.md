# Canvas Editor Open Issues 单人推进总表

## 1. 用法

这张表是按单人开发模式生成的全量 open issues 推进表。

你后面只需要逐条回填两列：

1. `是否命中业务`
2. `状态`

默认规则：

1. 命中业务的先验证
2. 不命中业务的先跳过
3. 已验证本地解决的，不再投入
4. 已验证仍存在的，再转开发任务

状态建议只用这四个：

1. `未验证`
2. `已验证-本地已解决`
3. `已验证-仍存在`
4. `暂不处理`

下一步建议只用这四个：

1. `验证`
2. `补测试`
3. `开发`
4. `跳过`

---

## 2. 全量总表

| Issue | 标题 | 是否命中业务 | 状态 | 验证入口 | 下一步 |
| --- | --- | --- | --- | --- | --- |
| #1404 | 插入表格的时候当colgroup未传入时，默认使用编辑器宽度平分 | 是 | 已验证-本地已解决 | `issue-1404-table-colgroup-default.cy.ts` / `table.cy.ts` | 跳过 |
| #1399 | 选中CONTROL类型的内容，向前删除executeBackspace无效 | 是 | 已验证-本地已解决 | `backspace.ts` / `Control.ts` | 跳过 |
| #1387 | 希望表格可以添加根据内容自动调整的功能 | 否 | 暂不处理 | `TableOperate.ts` / 表格能力文档 | 跳过 |
| #1385 | 官网的demo中 在文本、列举控件中 插入下划线 显示异常 | 是 | 已验证-本地已解决 | `issue-1385-control-underline.cy.ts` / `format.cy.ts` | 跳过 |
| #1372 | 图片浮动文字之上问题 | 待判断 | 未验证 | `Position.ts` / `image.cy.ts` | 验证 |
| #1317 | Area元素能否支持在表格中插入 | 否 | 暂不处理 | `Area.ts` / `TableParticle.ts` | 跳过 |
| #1270 | 同屏多页 | 否 | 暂不处理 | `DrawPageSetupService.ts` / page mode 文档 | 跳过 |
| #1256 | 日期如何自定义选择年或月 | 否 | 暂不处理 | `DatePicker.ts` / `date.cy.ts` | 跳过 |
| #1237 | 分栏效果 | 否 | 暂不处理 | `DrawLayoutPipeline.ts` / 布局文档 | 跳过 |
| #1200 | Smart Word Wrapping Around Images ("SURROUND") | 待判断 | 未验证 | `Position.ts` / `image.cy.ts` | 验证 |
| #1190 | tab缩进更多场景 | 待判断 | 未验证 | `tab.ts` / shortcut 文档 | 验证 |
| #1163 | 表格前如何添加文字 | 是 | 已验证-本地已解决 | `issue-inline-table-label.cy.ts` / `issue-1163-text-before-table.cy.ts` / `issue-left-blank-after-table-click.cy.ts` / `table.cy.ts` | 跳过 |
| #1106 | Add Red Squiggly Underline Under Misspelled Words | 否 | 暂不处理 | `Underline.ts` / underline 能力 | 跳过 |
| #1053 | 单元格框线设置 | 待判断 | 未验证 | `TableTool.ts` / `table-pagination-border.cy.ts` | 验证 |
| #1051 | 增区域设置默认高度，类似单元格，可以拖拽一个高度作为默认高度 | 否 | 暂不处理 | `Area.ts` / area 能力 | 跳过 |
| #1024 | 文档版本对比功能 | 否 | 暂不处理 | `Command.ts` / API 文档 | 跳过 |
| #957 | 多个选区 | 否 | 暂不处理 | `RangeManager.ts` / selection 主链 | 跳过 |
| #888 | 增加文本框功能 | 否 | 暂不处理 | `BlockParticle.ts` / schema 文档 | 跳过 |
| #877 | 分页符行为优化 | 待判断 | 未验证 | `PageBreakParticle.ts` / `pagebreak.cy.ts` | 验证 |
| #872 | 表格四周环绕 | 否 | 暂不处理 | `TableParticle.ts` / `Position.ts` | 跳过 |
| #866 | 分节符 | 否 | 暂不处理 | `PageBreakParticle.ts` / schema 文档 | 跳过 |
| #837 | 大文本计算性能优化 | 待判断 | 未验证 | `DrawLayoutPipeline.ts` / 性能文档 | 验证 |
| #825 | 文本控件内插入列表元素 | 否 | 暂不处理 | `TextControl.ts` / `ListParticle.ts` | 跳过 |
| #813 | 光标位置 | 是 | 已验证-仍存在 | `Cursor.ts` / `Position.ts` / pointer debug 测试 | 开发 |
| #778 | 页眉页脚可以配置某一页不显示 | 否 | 暂不处理 | `Header.ts` / `Footer.ts` | 跳过 |
| #762 | 元素支持悬浮提示 | 否 | 暂不处理 | `GlobalEvent.ts` / listener/eventbus 文档 | 跳过 |
| #747 | Add footnote | 否 | 暂不处理 | schema / API 文档 | 跳过 |
| #725 | 排版缩进 | 待判断 | 未验证 | `row.cy.ts` / `text.cy.ts` / shortcut 文档 | 验证 |
| #718 | 希望添加指定页面横向功能 | 否 | 暂不处理 | `DrawPageSetupService.ts` / paper direction 文档 | 跳过 |
| #692 | 标点符号排版优化 | 待判断 | 未验证 | `TextParticle.ts` / `option.md` | 验证 |
| #671 | 控件验证规则相关需求 | 否 | 暂不处理 | `Control.ts` / control 文档 | 跳过 |
| #650 | 表格嵌套 | 否 | 暂不处理 | `TableParticle.ts` / schema 文档 | 跳过 |
| #621 | 支持序号元素或段落拖拽 | 待判断 | 未验证 | `drag.ts` / drag 能力 | 验证 |
| #605 | 按段落设置行布局方式 | 否 | 暂不处理 | `row.cy.ts` / `option.md` | 跳过 |
| #499 | Add paragraph spacing options | 否 | 暂不处理 | `row.cy.ts` / 段落能力文档 | 跳过 |
| #478 | Add feature similar to MS Word macros | 否 | 暂不处理 | plugin / command 能力文档 | 跳过 |
| #451 | 编辑器支持rtl渲染 | 待判断 | 暂不处理 | `TextParticle.ts` / 排版主链 | 跳过 |
| #446 | 格式刷未携带所有格式 | 是 | 已验证-本地已解决 | `painter.cy.ts` / `command-execute.md` | 跳过 |
| #442 | 控件最小宽度设置支持跨行 | 否 | 暂不处理 | `Control.ts` / control 布局链 | 跳过 |
| #440 | 文档列表内容内无法取消或者增加子列表 | 是 | 已验证-本地已解决 | `issue-440-list-sublevel.cy.ts` / `ListParticle.ts` / `TabIntent.ts` | 跳过 |
| #438 | 可否增加文档处理  没有标尺值功能 | 否 | 暂不处理 | `option.md` / ruler 相关能力 | 跳过 |
| #425 | 文本控件内容中，再插入控件，页面{}显示有问题。 | 是 | 已验证-本地已解决 | `issue-425-control-in-text-control.cy.ts` / `text.cy.ts` | 跳过 |
| #390 | 是否可以生成如下的表格 | 待判断 | 未验证 | `table.cy.ts` / issue 具体内容 | 验证 |
| #374 | 主线合并支持svg、pdf渲染层 | 否 | 暂不处理 | `README.md` / `start.md` | 跳过 |
| #362 | 批注功能添加连接线 | 否 | 暂不处理 | schema / comment 能力说明 | 跳过 |
| #312 | 能否提供审阅模式 | 否 | 暂不处理 | `README.md` / roadmap | 跳过 |
| #295 | 多人协作 | 否 | 暂不处理 | `README.md` / CRDT 分支说明 | 跳过 |
| #256 | tab stops setting | 否 | 暂不处理 | `tab.ts` / 快捷键与排版能力 | 跳过 |
| #195 | 是否对将项目改成monorepo的pr感兴趣？ | 否 | 暂不处理 | `package.json` / 仓库结构 | 跳过 |
| #94 | 连页模式数据比较多时显示白屏 | 是 | 已验证-本地已解决 | `RenderInvalidationManager.ts` / 连页性能场景 | 跳过 |
| #41 | 表格分页 | 待判断 | 未验证 | 表格分页专项测试组 / 重构文档 | 验证 |

---

## 3. 推荐你怎么用

如果你一个人推进，建议就按下面做：

1. 先把“是否命中业务”填完
2. 不命中业务的直接改成 `暂不处理`
3. 命中业务的按表里顺序逐个验证
4. 验证通过的改成 `已验证-本地已解决`
5. 验证失败的改成 `已验证-仍存在`
6. 只有 `已验证-仍存在` 的项，才继续进入开发

这样你不会被 50 个 issue 同时压住。
