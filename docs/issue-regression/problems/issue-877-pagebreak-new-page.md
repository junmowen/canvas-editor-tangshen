# Issue 877 分页符保留与换页

## 关联

- GitHub issue：https://github.com/Hufe921/canvas-editor/issues/877
- Spec：`cypress/e2e/issues/issue-877-pagebreak-behavior.cy.ts`
- Test：`keeps the page break element in data and starts following content on a new page`

## 失败现象

复跑失败：

```txt
AssertionError: Timed out retrying after 4000ms: Not enough elements found. Found '1', expected '2'.
at cypress/e2e/issues/issue-877-pagebreak-behavior.cy.ts:35:33
```

截图：

```txt
cypress/screenshots/issue-877-pagebreak-behavior.cy.ts/issue #877 page break behavior -- keeps the page break element in data and starts following content on a new page (failed).png
```

## 初步判断

用例期望分页符后生成第二页 canvas，但当前只找到 1 个页面元素。可能是分页符没有被分页器识别、分页后 pageRowList 没有生成第二页、或渲染虚拟化只挂载了可见页。

优先检查：

- `RowLayoutEngine` 中 `ElementType.PAGE_BREAK` 对 row 的 `isPageBreak` 设置
- `PagePartitioner` 对 `rowList[i - 1]?.isPageBreak` 的换页逻辑
- 测试查找 canvas/page wrapper 的方式是否受虚拟挂载影响
- page break element 是否仍存在于 `getValue()`

## 下一步

1. 比对 `draw.getPageRowList().length` 与 DOM 中 canvas/page wrapper 数量。
2. 若 pageRowList 已是 2 页，修复测试查询或虚拟挂载等待。
3. 若 pageRowList 仍是 1 页，修复分页符换页逻辑。

