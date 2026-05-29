# Extension 目录索引

`extension/` 存放编辑器扩展能力，例如 i18n、override、plugin 和 register。

## 位置说明

- 所属层级：扩展和适配公共层
- 主要下钻：`i18n/`、`override/`、`plugin/`、`register/`、`shortcut/`

## 文件说明

| 目录 | 职责 |
| --- | --- |
| `i18n/` | 文案和语言资源接入 |
| `override/` | 默认行为覆盖入口 |
| `plugin/` | 插件能力入口 |
| `register/` | 注册能力入口 |
| `shortcut/` | 快捷键能力入口 |

## 函数说明

| 目录 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `i18n/I18n.ts` | `registerLangMap()` / `setLocale()` / `t()` | 注册语言包、切换语言并读取文案。 | `Register.ts`、菜单、模块文案 |
| `override/Override.ts` | `paste` / `copy` / `drop` | 覆盖默认剪贴板和拖放行为。 | event clipboard / pointer |
| `plugin/Plugin.ts` | `use()` | 安装插件并传入编辑器实例。 | 外部插件注册 |
| `register/Register.ts` | `contextMenuList()` / `shortcutList()` / `langMap()` | 注册菜单、快捷键和语言包。 | 编辑器对外 register API |
| `shortcut/Shortcut.ts` | `registerShortcutList()` / `removeEvent()` | 注册快捷键列表和解绑监听。 | `GlobalEvent`、插件注册 |
