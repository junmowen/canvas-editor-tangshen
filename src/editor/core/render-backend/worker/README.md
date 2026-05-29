# Render Backend Worker 目录说明

`worker/` 存放 worker 渲染快照、绘制命令协议、调度器和 bitmap 合成逻辑。

## 位置说明

- 所属层级：渲染后端层 / worker 渲染
- 上游调用：`draw/render/**`、`DrawServiceRegistry`
- 下游依赖：OffscreenCanvas、bitmap cache、页面渲染快照

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `WorkerRenderScheduler.ts` | worker 渲染任务提交、取消、熔断和统计。 |
| `WorkerRenderProtocol.ts` | worker paint command 和结果协议。 |
| `WorkerBitmapCompositor.ts` | worker bitmap 合成到 surface。 |
| `PageRenderSnapshotBuilder.ts` | 从 draw 状态构建页面渲染快照。 |
| `PageRenderSnapshot*.ts` | 分领域生成页面、行、表格、文本、控件等绘制命令。 |
| `offscreenRender.worker.ts` | worker 线程绘制入口。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `WorkerRenderScheduler.ts` | `submit(surface, task)` | 提交页面 worker 渲染任务。 | `PageRenderer.ts`、render backend |
| `WorkerRenderScheduler.ts` | `updateViewport()` / `cancelPage()` / `dispose()` | 更新视口、取消页面任务和销毁 worker。 | viewport、lifecycle |
| `WorkerRenderScheduler.ts` | `getStats()` / `resetStats()` / `isCircuitOpen()` | 读取统计、重置统计和查看熔断状态。 | debug panel、Draw API |
| `PageRenderSnapshotBuilder.ts` | `build()` | 构建指定页面的 worker 渲染快照。 | `WorkerRenderScheduler.ts` |
| `PageRenderSnapshotBuilder.ts` | `cacheWorkerBitmap()` / `getLayoutVersion()` / `getBaseVisualVersion()` | 缓存 bitmap 并读取快照版本。 | worker 渲染链路 |
| `WorkerBitmapCompositor.ts` | `compose()` | 将 worker 结果合成到目标 surface。 | `WorkerRenderScheduler.ts` |
| `WorkerRenderProtocol.ts` | `IWorkerPaintCommand` | 约束 worker 可执行绘制命令。 | `PageRenderSnapshot*.ts`、worker |
