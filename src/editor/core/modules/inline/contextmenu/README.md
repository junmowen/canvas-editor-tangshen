# Inline ContextMenu 目录索引

`contextmenu/` 存放超链接、日期等内联元素右键菜单配置。

## 位置说明

- 所属业务：`inline`
- 所属层级：右键菜单配置层
- 上游调度：`runtime/contextmenu/ContextMenu.ts`
- 下游依赖：超链接命令适配

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `hyperlinkMenus.ts` | 超链接删除、取消和编辑菜单配置 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `hyperlinkMenus.ts` | `hyperlinkMenus` | 定义超链接右键菜单项、可见状态和执行回调。 | `runtime/contextmenu/ContextMenu.ts` |

## 维护规则

- 超链接删除、取消和编辑菜单放在这里。
- 通用 contextmenu 只负责聚合菜单，不直接判断内联元素类型。
