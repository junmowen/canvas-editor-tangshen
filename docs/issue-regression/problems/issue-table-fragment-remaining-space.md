# 表格分页剩余空间

## 关联

- Spec：`cypress/e2e/issues/issue-table-fragment-uses-remaining-space.cy.ts`
- Test：`keeps the first splittable table fragment on the current page when space remains`

## 失败现象

复跑失败：

```txt
AssertionError: expected 3 to be below 2
at cypress/e2e/issues/issue-table-fragment-uses-remaining-space.cy.ts:52:37
```

截图：

```txt
cypress/screenshots/issue-table-fragment-uses-remaining-space.cy.ts/table pagination remaining space -- keeps the first splittable table fragment on the current page when space remains (failed).png
```

## 初步判断

用例期望第一段可拆分表格片段留在当前页，但当前表格 fragment 起始页比预期更靠后。可能是剩余空间计算偏保守，或页眉/页脚/页码额外占高进入了可用高度计算。

优先检查：

- `TableFragmentSplitter` 对 `availableHeight` 和 `pageContentHeight` 的判断
- `PagePartitioner` 中表格行进入 fragment split 的条件
- `DrawMetricsService.getMainOuterHeight()` 与页码额外占高是否影响该用例
- 行前 `offsetY` 是否被重复扣减

## 下一步

1. 在 split 输入输出记录 availableHeight、first fragment height、pageNo。
2. 对比预期用例数据，确认为何跳过当前页。
3. 修复剩余空间判断后保留该 spec 作为防回退用例。

