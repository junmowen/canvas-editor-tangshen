# Copy Plugin 目录说明

`demo/plugins/copy/` 存放复制版权示例插件。

## 位置说明

- 所属层级：demo 插件示例层 / copy
- 上游调用：`demo/main.ts`
- 下游依赖：editor command override

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `index.ts` | 注册复制覆盖逻辑。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `index.ts` | `copyWithCopyrightPlugin()` | 在复制文本末尾追加版权信息并写入剪贴板。 | demo 插件注册 |
