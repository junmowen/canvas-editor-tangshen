# Issue 回归管理

这个目录统一管理上游 GitHub issues 的本地快照、可执行回归覆盖关系、回归运行记录和失败项开发文档。

## 当前快照

- 来源：https://github.com/Hufe921/canvas-editor/issues
- 拉取时间：2026-05-19
- 过滤规则：GitHub API 会混入 PR，本目录只保留没有 `pull_request` 字段的真实 issue
- Issue 总数：1097
- Open：46
- Closed：1051
- Issue comments：1814

## 目录结构

- [issues-index.md](./issues-index.md)：全量 issue 索引，包含编号、状态、标签和标题。
- [cypress-coverage.md](./cypress-coverage.md)：现有 `cypress/e2e/issues` spec 到 GitHub issue 的映射。
- [regression-run-2026-05-19.md](./regression-run-2026-05-19.md)：本次回归执行记录。
- [problems/](./problems/)：回归失败项的开发跟踪文档。
- [data/README.md](./data/README.md)：原始快照和机器可读数据说明。
- `data/issues-all.json`：全量 issue 原始快照。
- `data/issue-comments-all.json`：全量 issue comment 快照，已过滤 PR comments。
- `data/cypress-issue-coverage.json`：机器可读覆盖关系。
- `data/issue-regression-failed-rerun-2026-05-19.log`：失败 spec 复跑日志。

## 回归口径

1. 所有 GitHub issue 不按 open/closed 区分，均已拉取到本地快照。
2. 本轮执行仓库中已有的所有 issue 回归 spec：`cypress/e2e/issues/**/*.cy.ts`。
3. 现有可执行回归覆盖 50 个 GitHub issue；其余 1047 个已归档，但还没有对应的自动化复现，需要后续按优先级补 spec。
4. 对已发现失败的用例，已在 `problems/` 下建立开发文档。

## 常用命令

```bash
npm run type:check
npx cypress run --spec "cypress/e2e/issues/**/*.cy.ts"
```
