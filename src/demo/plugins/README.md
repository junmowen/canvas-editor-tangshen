# Demo Plugins 目录说明

`demo/plugins/` 存放示例插件代码。

## 位置说明

- 所属层级：demo 插件示例层
- 上游调用：`demo/main.ts`
- 下游依赖：编辑器 plugin / command API

## 文件说明

| 目录 | 职责 |
| --- | --- |
| `copy/` | 复制时追加版权信息示例。 |
| `markdown/` | Markdown 转元素插入示例。 |

## 函数说明

| 目录 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `copy/index.ts` | `copyWithCopyrightPlugin()` | 覆盖复制行为并追加版权文本。 | `main.ts` 插件注册 |
| `markdown/index.ts` | `markdownPlugin()` | 扩展 markdown 插入命令。 | `main.ts` 插件注册 |
