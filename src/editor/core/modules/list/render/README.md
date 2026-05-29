# List Render 目录索引

`render/` 存放列表元素参与行绘制时的业务编排。

## 位置说明

- 上游调用：`draw/render/RowRenderer.ts`、`render-backend/worker/PageRenderSnapshotListCommands.ts`
- 下游依赖：列表 marker、Tab 缩进元素
- 迁移目的：行渲染和 worker 快照只调度列表 marker 绘制，不直接判断列表缩进元素类型。

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `ListRowMarkerRenderer.ts` | 列表行头标记绘制分发 |
| `WorkerSnapshotListMarkerPolicy.ts` | worker 快照列表 marker 的前置缩进元素判断 |

## 函数说明

| 文件 | 函数 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `WorkerSnapshotListMarkerPolicy.ts` | `isWorkerSnapshotListMarkerTab(element)` | 判断列表 marker 前的元素是否是缩进 Tab | `PageRenderSnapshotListCommands.pushListMarkerCommands()` |

## 维护规则

- 列表行头标记渲染留在本目录。
- `draw/render/RowRenderer.ts` 只负责调度列表渲染入口。
- worker 快照中的列表 marker 缩进判断留在本目录。
