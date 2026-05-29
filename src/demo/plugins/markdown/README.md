# Markdown Plugin 目录说明

`demo/plugins/markdown/` 存放 Markdown 插入示例插件。

## 位置说明

- 所属层级：demo 插件示例层 / markdown
- 上游调用：`demo/main.ts`
- 下游依赖：editor command API

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `index.ts` | Markdown 文本解析和命令扩展示例。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `index.ts` | `markdownPlugin(editor)` | 给 command 扩展 markdown 插入能力。 | demo 插件注册 |
| `index.ts` | `titleNodeNameMapping` | Markdown 标题层级到编辑器标题级别的映射。 | markdown 转换逻辑 |
