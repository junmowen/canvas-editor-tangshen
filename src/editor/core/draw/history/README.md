# Draw History 目录说明

`history/` 是 draw 层对历史栈的桥接层，负责把渲染或输入提交后的光标位置写入 history。

## 位置说明

- 所属层级：公共绘制层 / 历史桥接层
- 上游调用：`Draw.ts`、渲染 finalize、输入链路
- 下游依赖：`runtime/history/HistoryManager`

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `DrawHistoryBridge.ts` | 统一提交普通历史、输入历史和取消输入历史。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `DrawHistoryBridge.ts` | `submitHistory(curIndex)` | 将当前文档状态和光标索引提交到历史栈。 | `Draw.ts`、`DrawRenderFinalizeService.ts` |
| `DrawHistoryBridge.ts` | `submitTypingHistory(curIndex)` | 提交连续输入相关历史。 | 输入和键盘链路 |
| `DrawHistoryBridge.ts` | `cancelTypingHistory()` | 取消正在合并的输入历史。 | 输入中断、composition 结束链路 |
