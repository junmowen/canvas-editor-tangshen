# Issue Regression Data

这个目录存放 issue 回归管理使用的原始数据和机器可读结果。

| 文件 | 职责 |
| --- | --- |
| `issues-all.json` | GitHub issue 原始快照，已过滤 PR |
| `issue-comments-all.json` | GitHub issue comment 原始快照，已过滤 PR comments |
| `cypress-issue-coverage.json` | Cypress issue spec 到 GitHub issue 的覆盖关系 |
| `issue-regression-run-2026-05-19.json` | 回归执行结果 |
| `issue-regression-failed-rerun-2026-05-19.log` | 失败 spec 复跑日志 |

## 维护说明

- `issues-all.json` 和 `issue-comments-all.json` 是历史快照，内容应尽量保持原貌。
- 原始评论中可能包含旧源码路径，例如 `src/main.ts`、`src/plugins/markdown`，这类内容不代表当前项目结构。
- 面向阅读和维护的结论应写入上层 Markdown 文档，不直接改写原始快照。
