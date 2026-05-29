# Pagination Mock Specs

这个目录存放 `table-pagination-mock.cy.ts` 聚合加载的拆分用例。

这些文件覆盖基于 demo mock 数据的真实分页边界、跨页导航和拖选回归。入口文件保留在上一级，便于 Cypress 按稳定 spec 名称运行：

```sh
npx cypress run --spec cypress/e2e/table/table-pagination-mock.cy.ts
```
