# Runtime ContextMenu 目录索引

`contextmenu/` 存放通用右键菜单运行时装配。

## 位置说明

- 所属层级：通用右键菜单层

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `ContextMenu.ts` | 菜单聚合、注册和销毁 |
| `menus/` | 全局菜单配置 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `ContextMenu.ts` | `getContextMenuList()` | 返回内置菜单和外部注册菜单。 | 右键菜单渲染链路 |
| `ContextMenu.ts` | `registerContextMenuList(payload)` | 注册外部菜单项。 | `Register.contextMenuList()` |
| `ContextMenu.ts` | `removeEvent()` / `dispose()` | 移除菜单事件并销毁菜单 DOM。 | `DrawLifecycleService.destroy()` |
| `menus/globalMenus.ts` | `globalMenus` | 提供编辑器通用菜单项。 | `ContextMenu.ts` |
