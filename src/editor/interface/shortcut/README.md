# Shortcut Interface 目录说明

`interface/shortcut/` 存放快捷键接口定义。

## 位置说明

- 所属层级：编辑器接口层 / shortcut
- 上游调用：shortcut runtime、register API、外部类型导出
- 下游依赖：command 类型

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `Shortcut.ts` | 快捷键注册项、组合键和回调接口。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `Shortcut.ts` | interface / type 导出 | 提供快捷键配置类型约束，无运行时函数。 | `extension/shortcut`、register |
