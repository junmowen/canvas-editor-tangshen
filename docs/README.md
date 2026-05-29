# Docs 目录索引

这个目录存放 VitePress 文档站内容、专题技术文档和 issue 回归资料。

| 路径 | 职责 |
| --- | --- |
| `index.md` | VitePress 中文首页 |
| `.vitepress/` | VitePress 配置、导航和构建配置 |
| `guide/` | 使用指南、API、插件、架构、表格和渲染后端专题 |
| `issue-regression/` | GitHub issue 快照、回归覆盖和失败项跟踪 |
| `en/` | 英文文档 |
| `public/` | 文档站静态资源 |
| `encoding-rules.md` | 编码、换行和注释规范 |
| `project-structure.md` | 项目目录结构总览 |

## 维护规则

- 长期专题文档优先放入 `guide/<topic>/` 并提供 `index.md`。
- issue 回归资料放入 `issue-regression/`，原始数据保留在 `issue-regression/data/`。
- 修改导航后运行 `npm run docs:build`，避免 VitePress 死链。
