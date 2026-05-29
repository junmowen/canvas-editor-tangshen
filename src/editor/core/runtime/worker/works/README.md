# Runtime Worker Works 目录说明

`worker/works/` 存放 worker 侧的数据计算任务。

## 位置说明

- 所属层级：通用运行时层 / worker 任务实现
- 上游调用：`WorkerManager.ts`
- 下游依赖：文档元素数据

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `wordCount.ts` | 统计字数。 |
| `catalog.ts` | 生成目录数据。 |
| `group.ts` | 读取分组 id。 |
| `value.ts` | 生成编辑器导出值。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `wordCount.ts` | worker 字数任务 | 统计文档字数。 | `WorkerManager.getWordCount()` |
| `catalog.ts` | worker 目录任务 | 生成标题目录。 | `WorkerManager.getCatalog()` |
| `group.ts` | worker 分组任务 | 提取文档 group id。 | `WorkerManager.getGroupIds()` |
| `value.ts` | worker 取值任务 | 生成 `IEditorResult`。 | `WorkerManager.getValue()` |
