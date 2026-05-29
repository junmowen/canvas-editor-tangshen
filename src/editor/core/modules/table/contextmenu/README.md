# Table Contextmenu 目录索引

`contextmenu/` 存放表格专属右键菜单定义。

## 位置说明

- 所属业务：`table`
- 所属层级：右键菜单配置层
- 上游调度：`runtime/contextmenu/ContextMenu.ts`
- 下游依赖：`Command` 表格命令门面和表格 target 解析

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `tableMenus.ts` | 表格边框、行列、合并、拆分、对齐和删除菜单配置 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `tableMenus.ts` | `tableMenus` | 定义表格右键菜单项、可见状态和命令回调。 | `runtime/contextmenu/ContextMenu.ts` |

## 维护规则

- 表格边框、行列、合并、对齐等菜单项放在这里。
- 通用 `core/runtime/contextmenu/` 只负责菜单运行时和非特定领域菜单装配。
- 菜单项执行仍通过 `Command` 门面，不直接修改文档数据。
