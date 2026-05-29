# Runtime ContextMenu Menus 目录说明

`contextmenu/menus/` 存放通用右键菜单配置。

## 位置说明

- 所属层级：通用运行时层 / 右键菜单配置
- 上游调用：`ContextMenu.ts`
- 下游依赖：command 适配层

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `globalMenus.ts` | 编辑器全局右键菜单项配置。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `globalMenus.ts` | `globalMenus` | 导出全局菜单配置数组。 | `ContextMenu.ts` |
