# Contextmenu Interface 目录说明

`interface/contextmenu/` 存放右键菜单接口定义。

## 位置说明

- 所属层级：编辑器接口层 / contextmenu
- 上游调用：runtime contextmenu、register API、外部类型导出
- 下游依赖：通用接口类型

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `ContextMenu.ts` | 右键菜单项、菜单回调和注册结构接口。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `ContextMenu.ts` | interface / type 导出 | 提供菜单类型约束，无运行时函数。 | contextmenu runtime、register |
