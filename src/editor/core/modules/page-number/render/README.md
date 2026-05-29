# Page Number Render

`render/` 存放页码参与页面绘制和 worker 快照的业务策略。

## 位置说明

- 上游调用：`src/editor/core/render-backend/worker/PageRenderSnapshotFrameCommands.ts`
- 下游依赖：`RowFlex`
- 迁移目的：worker 快照只生成页码绘制命令，不直接判断页码对齐枚举。

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `PageNumberWorkerSnapshotPolicy.ts` | worker 快照中页码横向对齐位置解析 |

## 函数说明

| 函数 | 作用 | 调用地方 |
| --- | --- | --- |
| `resolveWorkerSnapshotPageNumberX(payload)` | 按页码 `rowFlex`、页面宽度、文本宽度和页边距计算页码横坐标 | `PageRenderSnapshotFrameCommands.buildPageNumberCommands()` |

## 维护规则

- 页码对齐策略留在本目录。
- `render-backend/worker` 只负责生成绘制命令，不直接判断页码对齐枚举。
