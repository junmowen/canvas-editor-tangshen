# Issue 回归用例索引

`cypress/e2e/issues/` 存放 issue 驱动的回归用例，以及近期 API 和复杂链路的批量回归。文件名是主要索引，优先按 issue 编号或能力域查找。

## 具体 issue 用例

| 范围 | 示例文件 | 覆盖方向 |
| --- | --- | --- |
| `#94` - `#390` | `issue-94-continuity-large-doc.cy.ts`, `issue-390-dynamic-table-data.cy.ts` | 早期核心行为、表格、列表、分页和大文档 |
| `#425` - `#725` | `issue-425-control-in-text-control.cy.ts`, `issue-725-row-indent.cy.ts` | 控件、段落、拖拽、缩进、菜单行为 |
| `#832` - `#1090` | `issue-837-large-document-performance.cy.ts`, `issue-1053-table-cell-border.cy.ts` | 性能、分页符、表格边框、API 可见性 |
| `#1163` - `#1406` | `issue-1163-text-before-table.cy.ts`, `issue-1406-group-id-form-mode.cy.ts` | 表格边界、图片环绕、控件删除、表单模式 |

## 批量回归用例

| 文件模式 | 说明 |
| --- | --- |
| `issue-api-coverage-batch*.cy.ts` | API 覆盖批次，用于补齐公开 API 的行为断言 |
| `issue-area-table-api-regressions*.ts` | Area + Table 组合 API 回归 |
| `issue-control-api-regressions*.ts` | 控件 API 和控件状态回归 |
| `issue-recent-api-regressions*.ts` | 近期公开 API 和数据往返回归 |
| `issue-table-typing-chunk-isolation*.ts` | 表格输入、chunk 隔离和跨页布局稳定性 |

## 本地问题回归

这些文件不一定对应单个上游 issue，但覆盖本地修复过的复杂链路：

- `issue-blank-area-dblclick.cy.ts`
- `issue-catalog-position-miss.cy.ts`
- `issue-delete-chain-consistency.cy.ts`
- `issue-header-footer-dblclick.cy.ts`
- `issue-inline-table-label.cy.ts`
- `issue-left-blank-after-table-click.cy.ts`
- `issue-plain-text-drag-consistency.cy.ts`
- `issue-range-paragraph-boundary.cy.ts`
- `issue-selection-table-bleed.cy.ts`
- `issue-table-fragment-uses-remaining-space.cy.ts`
- `issue-table-row-height-range-context.cy.ts`

## 查找建议

1. 已知 issue 编号：直接搜索 `issue-<number>-`。
2. 已知能力域：先看批量回归模式，再看具体 issue 文件。
3. 表格分页或表格输入问题：同时查看 `cypress/e2e/table/table-pagination-*` 和 `issue-table-*`。
4. API 兼容问题：优先查看 `issue-api-coverage-batch*` 与 `issue-recent-api-regressions*`。

