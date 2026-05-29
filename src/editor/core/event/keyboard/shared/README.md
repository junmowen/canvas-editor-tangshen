# Keyboard Shared 目录说明

`keyboard/shared/` 存放键盘意图之间复用的收尾和上下文 helper，避免删除、移动、插入各自重复处理光标和渲染。

## 位置说明

- 所属层级：事件层 / 键盘公共逻辑
- 上游调用：`keyboard/intents/**`、`FastInputProcessor`
- 下游依赖：range、draw、position

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `finalizeCollapsedCursorMove.ts` | 折叠光标移动后的 range、光标和渲染收尾。 |
| `finalizeDeletion.ts` | 删除后的数据、range、光标和渲染收尾。 |
| `finalizeVerticalMove.ts` | 上下移动后的视觉位置收尾。 |
| `formatInsertContext.ts` | 生成继承当前上下文格式的插入元素。 |
| `horizontalMove.ts` | 左右移动公共实现。 |
| `insertWithContext.ts` | 按上下文插入元素。 |
| `removeHiddenElements.ts` | 删除链路中过滤隐藏元素。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `finalizeCollapsedCursorMove.ts` | `finalizeCollapsedCursorMove()` | 设置折叠 range、光标索引并触发渲染。 | navigation intents |
| `finalizeDeletion.ts` | `finalizeDeletion()` | 删除后刷新文档、range、光标和历史。 | `KeyboardDeletionIntent.ts` |
| `finalizeVerticalMove.ts` | `finalizeVerticalMove()` | 完成上下移动后的光标 position 写入。 | `VerticalNavigationIntent.ts` |
| `formatInsertContext.ts` | `formatInsertContext()` | 为新插入元素补齐当前样式和上下文。 | `insertWithContext.ts`、输入链路 |
| `horizontalMove.ts` | `runHorizontalMove()` | 处理左右方向键移动。 | `KeyboardNavigationIntent.ts` |
| `insertWithContext.ts` | `insertWithContext()` | 在当前上下文插入元素并刷新光标。 | `EnterIntent.ts`、`TabIntent.ts`、输入链路 |
| `removeHiddenElements.ts` | `removeHiddenElements()` | 从待处理元素中剔除隐藏元素。 | 删除 intent |
