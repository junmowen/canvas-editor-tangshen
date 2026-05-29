# Extension Shortcut 目录索引

`shortcut/` 存放快捷键扩展对象。

## 位置说明

- 所属层级：快捷键扩展层

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `Shortcut.ts` | 快捷键注册和命令映射 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `Shortcut.ts` | `registerShortcutList(payload)` | 注册快捷键组合及对应命令。 | `Register.shortcutList()`、默认快捷键初始化 |
| `Shortcut.ts` | `removeEvent()` | 移除快捷键监听。 | `DrawLifecycleService.destroy()` |
