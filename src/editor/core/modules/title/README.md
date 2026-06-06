# Title 目录索引

`title/` 存放标题元素相关的编辑规则。

## 子目录说明

| 目录 | 职责 |
| --- | --- |
| `command/` | 标题命令查询和适配中的业务规则 |
| `interaction/` | 标题参与输入、回车等交互规则 |
| `query/` | 标题树、标题结构等只读查询规则 |

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
| `query/` | 标题父子树构建和查询规则。 |

## 函数说明

| 目录 | 主要入口 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `command/` | title command helper | 查询和应用标题样式。 | command |
| `interaction/TitleEnterPolicy.ts` | `shouldCopyEnterAnchorAcrossTitleBoundary()` | 判断回车时标题 anchor 是否继承。 | keyboard Enter、paragraph |
| `query/TitleTreeBuilder.ts` | `buildTitleTree(payload)` | 按标题级别生成父子树、路径、顺序和章节范围信息。 | `CommandAdaptQuery.getTitleTree()` / `getTitleTreeRange(titleId)` |

## API 说明

- `Editor.getTitleTree()` / `command.getTitleTree()`：返回整棵标题树，包含根节点列表和文档顺序节点列表。
- `Editor.getTitleTreeNode(titleId)` / `command.getTitleTreeNode(titleId)`：按标题 id 返回单个节点。
- `Editor.getTitleTreeNodeList(titleIds)` / `command.getTitleTreeNodeList(titleIds)`：按传入顺序批量返回节点，自动忽略不存在的标题 id。
- `Editor.getTitleTreeChildList(titleId)` / `command.getTitleTreeChildList(titleId)`：返回指定标题的直接子标题节点。
- `Editor.getTitleTreeRange(titleId)` / `command.getTitleTreeRange(titleId)`：返回标题覆盖的章节范围和克隆后的章节元素列表，供按章导出、章节拖拽和业务侧批量处理复用；表格内标题会额外返回 `tableId/trIndex/tdIndex`，避免把单元格局部索引误切为主文档范围。
