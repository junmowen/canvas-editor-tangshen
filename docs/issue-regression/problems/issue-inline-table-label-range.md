# Inline table label 选区范围

## 关联

- Spec：`cypress/e2e/issues/issue-inline-table-label.cy.ts`
- Failing tests：
  - `does not highlight another inline table with the same row and column indexes`
  - `draws inline table range from the table origin instead of the row origin`

## 失败现象

复跑失败：

```txt
TypeError: draw.getPage is not a function
at cypress/e2e/issues/issue-inline-table-label.cy.ts:390:34
at cypress/e2e/issues/issue-inline-table-label.cy.ts:493:24
```

截图：

```txt
cypress/screenshots/issue-inline-table-label.cy.ts/inline table label layout -- does not highlight another inline table with the same row and column indexes (failed).png
cypress/screenshots/issue-inline-table-label.cy.ts/inline table label layout -- draws inline table range from the table origin instead of the row origin (failed).png
```

## 初步判断

失败直接来自测试调用已经不存在的 `draw.getPage()`。当前 Draw API 已经通过 `PageCanvasHost` 和 render backend 管理页面 canvas，测试仍依赖旧 API。

优先检查：

- 测试应改用 `draw.getPageCanvasHost().getPageWrapperList()` 或 `getSurface(pageNo, RenderLayer.BASE)`
- inline table range 断言是否还需要直接读取 canvas
- 是否存在其他测试残留 `draw.getPage()` 调用

## 下一步

1. 替换测试中的 `draw.getPage()` 访问。
2. 确认替换后两个断言是真实业务失败还是测试 API 迁移遗漏。
3. 若替换后仍失败，再跟进 inline table range 坐标。

