# 排版专题文档

这个目录归档排版能力相关的专题文档、推进计划、能力差距和后续实现记录。

| 文档 | 内容 |
| --- | --- |
| [排版能力梳理与推进文档](./typesetting-capability-roadmap.md) | 对照 WPS Office、ONLYOFFICE 梳理当前排版能力、缺口、优先级和推进路线。 |
| [排版推进项开发功能与进度跟踪](./typesetting-development-progress.md) | 细化各推进项的开发功能、子任务、状态和验收口径。 |
| [内部模型到 OOXML 映射推进文档](./ooxml-model-mapping.md) | 归档内部模型到 OOXML 的完整映射框架和第一批最小子集。 |
| [控件业务融合 Demo 使用说明](./control-business-demo.md) | 说明控件初始化、批量回填、远程选项、校验和业务字段绑定的 Demo 使用方式。 |

## 归档规则

- 排版能力盘点、路线规划、方案设计和验收标准放在本目录。
- 排版相关实现方案必须写明代码注释约束：类、函数、属性、接口字段和核心算法都要有中文注释。
- 单个具体问题的回归记录仍放入 `docs/issue-regression/`。
- 面向用户的公开使用指南成熟后再同步到 `docs/guide/`。
