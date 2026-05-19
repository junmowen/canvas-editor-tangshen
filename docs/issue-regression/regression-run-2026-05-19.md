# Issue 回归记录 2026-05-19

## Issue 拉取

- 来源：https://github.com/Hufe921/canvas-editor/issues
- 方式：GitHub REST API cursor pagination
- 过滤：排除 PR，仅保留 issue
- 总数：1097
- Open：46
- Closed：1051
- 带评论 issue：829
- 已归档 issue comments：1814

## 可执行回归

执行命令：

```bash
npm run type:check
npx cypress run --spec "cypress/e2e/issues/**/*.cy.ts"
```

结果：

- TypeScript：通过
- Cypress issue spec：32 个
- Test 总数：100
- Passed：92
- Failed：8
- Failed spec：7

Cypress 清理旧截图目录时出现 `failed to trash existing run results` warning；该 warning 不改变用例退出码。

## 失败项

| Spec | Failing Tests | 开发文档 |
| --- | ---: | --- |
| `issue-1053-table-cell-border.cy.ts` | 1 | [issue-1053-table-fragment-header-separator.md](./problems/issue-1053-table-fragment-header-separator.md) |
| `issue-1385-control-underline.cy.ts` | 1 | [issue-1385-control-underline-empty-control.md](./problems/issue-1385-control-underline-empty-control.md) |
| `issue-837-large-document-performance.cy.ts` | 1 | [issue-837-typing-refresh-coalescing.md](./problems/issue-837-typing-refresh-coalescing.md) |
| `issue-877-pagebreak-behavior.cy.ts` | 1 | [issue-877-pagebreak-new-page.md](./problems/issue-877-pagebreak-new-page.md) |
| `issue-catalog-position-miss.cy.ts` | 1 | [issue-catalog-position-miss.md](./problems/issue-catalog-position-miss.md) |
| `issue-inline-table-label.cy.ts` | 2 | [issue-inline-table-label-range.md](./problems/issue-inline-table-label-range.md) |
| `issue-table-fragment-uses-remaining-space.cy.ts` | 1 | [issue-table-fragment-remaining-space.md](./problems/issue-table-fragment-remaining-space.md) |

完整失败日志：`data/issue-regression-failed-rerun-2026-05-19.log`

## 覆盖缺口

当前 `cypress/e2e/issues` 能映射到 50 个 GitHub issue。剩余 1047 个 issue 已在 `issues-index.md` 和 `data/issues-all.json` 中归档，但尚未具备自动化回归用例。

后续补齐建议：

1. 优先补 open issue、`bug` label、以及近期 updated 的 closed issue。
2. 每个 issue 建立最小复现数据和 Cypress spec。
3. spec 文件名优先使用 `issue-<number>-<short-slug>.cy.ts`，便于自动覆盖统计。
