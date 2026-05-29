# Runtime Worker 目录索引

`worker/` 存放 worker 运行对象。

## 位置说明

- 所属层级：worker 任务执行层

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `WorkerManager.ts` | word count / catalog / group / value worker 接口 |
| `works/` | worker 侧具体计算任务 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `WorkerManager.ts` | `getWordCount()` | 异步统计文档字数。 | command query、外部 API |
| `WorkerManager.ts` | `getCatalog()` | 异步生成目录数据。 | command query、外部 API |
| `WorkerManager.ts` | `getGroupIds()` | 异步读取分组 id。 | command query、group 模块 |
| `WorkerManager.ts` | `getValue(options)` | 异步生成编辑器导出值。 | 外部 API |
| `works/` | worker 任务函数 | 在 worker 线程执行统计、目录、分组和取值。 | `WorkerManager.ts` |
