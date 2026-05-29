# Extension Register 目录索引

`register/` 存放注册能力入口。

## 位置说明

- 所属层级：注册扩展层

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `Register.ts` | 扩展注册入口 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `Register.ts` | `contextMenuList(payload)` | 注册外部右键菜单项。 | 编辑器 register API、插件 |
| `Register.ts` | `getContextMenuList()` | 读取已注册菜单项。 | `runtime/contextmenu/ContextMenu.ts` |
| `Register.ts` | `shortcutList(payload)` | 注册外部快捷键。 | 编辑器 register API、插件 |
| `Register.ts` | `langMap(locale, lang)` | 注册指定 locale 的语言包。 | 编辑器 register API、插件 |
