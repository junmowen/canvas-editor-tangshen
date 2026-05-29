# GitHub 配置索引

这个目录存放 GitHub 平台相关配置。

| 路径 | 职责 |
| --- | --- |
| `workflows/build.yml` | 构建和部署相关 GitHub Actions |
| `workflows/cypress.yml` | Cypress 自动化测试工作流 |
| `workflows/docs.yml` | 文档站构建/部署工作流 |
| `ISSUE_TEMPLATE/bug_report.yml` | Bug report 模板 |
| `ISSUE_TEMPLATE/feature_request.yml` | Feature request 模板 |
| `ISSUE_TEMPLATE/config.yml` | Issue 模板配置 |
| `FUNDING.yml` | GitHub Sponsors 配置 |

## 维护规则

- 修改 workflow 后注意同步检查 `package.json` 中对应 npm script 是否仍存在。
- 修改 issue 模板时保持字段稳定，避免影响历史 issue triage 口径。
