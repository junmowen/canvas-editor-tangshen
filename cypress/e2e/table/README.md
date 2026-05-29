# Cypress Table E2E 目录索引

这个目录存放表格、表格分页、表格选择和表格边框专项用例。

## 文件分组

| 文件模式 | 职责 |
| --- | --- |
| `table.cy.ts` | 基础表格菜单和表格操作回归 |
| `table-selection-*.cy.ts` | 表格选择相关回归 |
| `table-pagination-*.cy.ts` | 表格分页、跨页选择、跨页导航和边框专项 |
| `pagination-input/table-pagination-input.partN.ts` | 分页输入、跨页光标和选区的大型拆分片段 |
| `pagination-mock/table-pagination-mock.partN.ts` | 基于 demo mock 数据的分页回归拆分片段 |

## 运行示例

```sh
npx cypress run --spec cypress/e2e/table/table.cy.ts
npx cypress run --spec "cypress/e2e/table/table-pagination-*.cy.ts"
```
