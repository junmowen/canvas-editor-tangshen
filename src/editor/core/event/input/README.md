# Event Input 目录说明

`input/` 处理文本输入和输入法提交，负责将原生 input / composition 数据转换为编辑器元素 mutation，并调度增量渲染。

## 位置说明

- 所属层级：事件层 / 输入处理
- 上游调用：`EditorInputController.ts`
- 下游依赖：`DrawMutationService`、keyboard shared helper、render scheduler

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `FastInputProcessor.ts` | 快速输入、输入法开始结束、输入 action 执行。 |
| `InputBuffer.ts` | 输入 action 缓冲和批量读取。 |
| `IncrementalRenderScheduler.ts` | requestAnimationFrame 渲染任务合并和刷新。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `FastInputProcessor.ts` | `processInput(data)` | 将输入文本转换为元素并执行插入。 | `EditorInputController.input()` |
| `FastInputProcessor.ts` | `compositionStart()` / `compositionEnd(data)` | 管理 IME 组合输入状态和提交。 | `EditorInputController.compositionstart/end()` |
| `FastInputProcessor.ts` | `getIsComposing()` / `getCompositionInfo()` / `clear()` | 查询或清理输入法状态。 | `CanvasEvent`、输入销毁 |
| `InputBuffer.ts` | `push()` / `getBatch()` / `hasPending()` / `clear()` | 缓冲输入 action 并批量取出。 | `FastInputProcessor.ts` |
| `IncrementalRenderScheduler.ts` | `schedule(task)` / `flush()` / `clear()` | 合并渲染任务并在合适时机执行。 | `FastInputProcessor.ts` |
