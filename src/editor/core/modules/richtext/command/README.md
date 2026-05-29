# Richtext Command

`command/` 存放富文本命令中的业务状态切换规则。

## 位置说明

- 上游调用：`src/editor/core/command/CommandAdaptRichText.ts`
- 下游依赖：`ElementType.SUPERSCRIPT`、`ElementType.SUBSCRIPT`、`ElementType.TEXT`
- 迁移目的：命令适配层只读取选区和触发渲染，不直接维护上下标类型切换规则。

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `ScriptCommandPolicy.ts` | 上标和下标选区元素的切换规则 |

## 函数说明

| 函数 | 作用 | 调用地方 |
| --- | --- | --- |
| `toggleSuperscriptSelection(elementList)` | 对选区批量切换上标；已有上标时取消并恢复文本类型，否则把文本/下标改为上标 | `CommandAdaptRichText.superscript()` |
| `toggleSubscriptSelection(elementList)` | 对选区批量切换下标；已有下标时取消并恢复文本类型，否则把文本/上标改为下标 | `CommandAdaptRichText.subscript()` |

## 维护规则

- 上标/下标元素类型切换留在本目录。
- `core/command` 只负责命令禁用判断、选区读取和触发重绘。
