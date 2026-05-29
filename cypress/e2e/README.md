# Cypress E2E 目录索引

这个目录按功能域组织端到端用例。查问题时建议先按功能域进入，再通过各子目录 `README.md` 和文件名定位具体场景。

## 目录职责

| 目录 | 职责 |
| --- | --- |
| `control/` | 文本、下拉、复选等控件行为 |
| `issues/` | issue 回归和近期 API/行为回归 |
| `menus/` | demo 工具栏菜单和用户操作入口 |
| `performance/` | 大文档、输入、真实模板等性能场景 |
| `render-backend/` | Canvas 池、多引擎、Worker 渲染后端专项 |
| `smoke/` | 基础编辑器烟测，覆盖编辑、换行、模式切换、缩放等主流程 |
| `table/` | 表格、表格分页、表格选择和边框专项 |
| `utils/` | Cypress 测试辅助函数 |

## 命名规则

- `*.cy.ts` 是 Cypress 直接执行入口。
- `*.partN.ts` 是拆分后的同域用例片段，通常由同名 `*.cy.ts` 汇总或按脚本拆跑。
- `issue-<number>-*.cy.ts` 对应具体上游 issue 或本地回归问题。
- `issue-*-api-regressions*.ts` 是按 API 面批量补充的回归覆盖。

## 常用命令

```sh
npm run cypress:open
npm run cypress:run
```

针对单个文件运行时可直接使用 Cypress CLI，例如：

```sh
npx cypress run --spec cypress/e2e/issues/issue-1404-table-colgroup-default.cy.ts
```
