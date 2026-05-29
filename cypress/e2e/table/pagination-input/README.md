# Pagination Input Specs

这个目录存放 `table-pagination-input.cy.ts` 聚合加载的拆分用例。

这些文件覆盖分页表格输入、跨页光标移动、跨页选择和 helper 基线回归。入口文件保留在上一级，便于 Cypress 按稳定 spec 名称运行：

```sh
npx cypress run --spec cypress/e2e/table/table-pagination-input.cy.ts
```
