# Cypress Fixtures 目录索引

这个目录存放 Cypress 用例使用的静态资源。

| 目录 | 职责 |
| --- | --- |
| `examples/` | 通用样例数据 |
| `images/` | 图片上传、图片渲染相关 fixture |
| `manual/` | 手工排查和历史复现用的 HTML / 文本素材 |

引用 fixture 时路径相对于 `cypress/fixtures/`，例如：

```ts
cy.get('#image').attachFile('images/test.png')
```
