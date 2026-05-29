# Shortcut Keys 目录说明

`shortcut/keys/` 存放内置快捷键定义，按业务类型拆分。

## 位置说明

- 所属层级：扩展层 / 快捷键配置
- 上游调用：`Shortcut.ts`
- 下游依赖：command 适配层

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `listKeys.ts` | 列表相关默认快捷键。 |
| `richtextKeys.ts` | 富文本样式默认快捷键。 |
| `titleKeys.ts` | 标题相关默认快捷键。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `listKeys.ts` | `listKeys` | 导出列表快捷键配置数组。 | `Shortcut.ts` |
| `richtextKeys.ts` | `richtextKeys` | 导出加粗、斜体等富文本快捷键配置数组。 | `Shortcut.ts` |
| `titleKeys.ts` | `titleKeys` | 导出标题快捷键配置数组。 | `Shortcut.ts` |
