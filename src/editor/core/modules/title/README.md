# Title 目录索引

`title/` 存放标题元素相关的编辑规则。

## 子目录说明

| 目录 | 职责 |
| --- | --- |
| `command/` | 标题命令查询和适配中的业务规则 |
| `interaction/` | 标题参与输入、回车等交互规则 |

## 维护规则

- 标题上下文在换行、段落边界和样式继承中的判断放在这里。
- keyboard intent 不直接判断 `titleId` 边界。
- 标题命令查询中的元素类型判断留在 `command/`，不要内联回 `core/command`。

## 位置说明

- 所属层级：业务模块层 / 标题
- 上游调用：command、keyboard、paragraph
- 下游依赖：`command/`、`interaction/`

## 文件说明

| 目录 | 职责 |
| --- | --- |
| `command/` | 标题命令查询和适配规则。 |
| `interaction/` | 标题输入、回车和样式继承规则。 |

## 函数说明

| 目录 | 主要入口 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `command/` | title command helper | 查询和应用标题样式。 | command |
| `interaction/TitleEnterPolicy.ts` | `shouldCopyEnterAnchorAcrossTitleBoundary()` | 判断回车时标题 anchor 是否继承。 | keyboard Enter、paragraph |
