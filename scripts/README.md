# Scripts 目录索引

这个目录存放仓库维护脚本。脚本通过 `package.json` 暴露为 npm 命令，优先从 npm script 调用。

| 文件 | 职责 | 常用命令 |
| --- | --- | --- |
| `release.js` | 发布前构建和 npm publish 流程 | `npm run release` |
| `verify-utf8.js` | 检查文本文件 UTF-8、BOM 和换行规范 | `npm run encoding:check` |
| `verify-architecture.js` | 检查核心架构、demo 边界、目录归类和索引文档约束 | `npm run architecture:check` |
| `verifyCommit.js` | 检查 commit message | git hook 自动调用 |
| `verifyIssues.js` | 校验 issue 回归清单和 Cypress 用例映射 | `npm run issues:verify` |
| `issueSpecs.part*.js` | issue 校验数据分片 | 由 `verifyIssues.js` 导入 |

## 维护规则

- 新增脚本后优先在 `package.json` 的 `scripts` 中提供入口。
- 影响提交质量的检查应同步评估是否加入 `simple-git-hooks.pre-commit`。
- 目录结构类约束和关键 README / `index.md` 入口优先补进 `verify-architecture.js`，避免只停留在文档说明。
