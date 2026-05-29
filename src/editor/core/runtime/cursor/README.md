# Runtime Cursor 目录索引

`cursor/` 存放光标运行对象。

## 位置说明

- 所属层级：光标运行层

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `Cursor.ts` | 光标 DOM 和移动 / 恢复 |
| `CursorAgent.ts` | 光标代理 textarea |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `Cursor.ts` | `getCursorDom()` / `getAgentDom()` / `getAgentIsActive()` | 读取光标 DOM、输入代理 DOM 和激活状态。 | event input、selection、debug |
| `Cursor.ts` | `focus()` / `clearAgentDomValue()` | 聚焦输入代理并清理代理值。 | 输入、composition、点击定位 |
| `Cursor.ts` | `drawCursor()` / `recoveryCursor()` | 绘制或恢复可见光标。 | range、render finalize、pointer |
| `Cursor.ts` | `moveCursorToVisible()` | 滚动视口使光标可见。 | keyboard navigation、输入链路 |
| `CursorAgent.ts` | `getAgentCursorDom()` | 创建并返回隐藏 textarea 输入代理。 | `Cursor.ts` |
