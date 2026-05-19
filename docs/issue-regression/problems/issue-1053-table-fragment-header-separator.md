# Issue 1053 表格分页片段与页眉分隔线

## 关联

- GitHub issue：https://github.com/Hufe921/canvas-editor/issues/1053
- Spec：`cypress/e2e/issues/issue-1053-table-cell-border.cy.ts`
- Test：`places later table fragments below a header bottom separator`

## 失败现象

复跑失败：

```text
AssertionError: expected 0 to be above 0
at cypress/e2e/issues/issue-1053-table-cell-border.cy.ts:1325:32
```

截图：

```text
cypress/screenshots/issue-1053-table-cell-border.cy.ts/issue #1053 table cell border settings -- places later table fragments below a header bottom separator (failed).png
```

## 初步判断

用例期望后续表格分页片段出现在页眉底部分隔线之下，但当前像素检测没有发现目标片段或目标线段，说明分页片段位置、页眉额外高度、或片段渲染区域计算存在不一致。

优先检查：

- `Header.getExtraHeight()` 与正文 `startY` 的关系
- 表格 fragment 生成时的 page start available height
- `TableFragmentSplitter` / `TableLayoutEngine` 对页眉额外高度的使用
- 失败断言附近的像素采样区域是否仍匹配当前渲染结构

## 下一步

1. 单独运行该 spec 并打开失败截图确认是布局错位还是断言采样区域失效。
2. 在表格 fragment 生成阶段记录目标 fragment 的 `pageNo`、`y`、`height`。
3. 修复后保留该用例作为页眉高度参与表格分页的基线。

