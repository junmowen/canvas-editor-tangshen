# Control ContextMenu 目录索引

`contextmenu/` 存放控件右键菜单配置和控件菜单回调。

## 位置说明

- 所属业务：`control`
- 所属层级：右键菜单配置层
- 上游调度：`runtime/contextmenu/ContextMenu.ts`
- 下游依赖：控件命令和控件上下文状态

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `controlMenus.ts` | 控件专属右键菜单项、可见状态和执行回调 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `controlMenus.ts` | `controlMenus` | 定义控件删除等控件右键菜单配置。 | `runtime/contextmenu/ContextMenu.ts` |

## 维护规则

- 控件删除等控件专属菜单放在这里。
- 通用 contextmenu 只负责聚合菜单，不直接判断 `controlId` / 表单模式。
