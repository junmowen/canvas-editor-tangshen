# Image Render

`render/` 存放图片业务专属渲染辅助。

## 位置说明

- 上游调用：`draw/render/PageContentPainter.ts`、`render-backend/worker/PageRenderSnapshotBase.ts`、`PageRenderSnapshotBuilder.ts`、`PageRenderSnapshotRowCommands.ts`、`PageRenderSnapshotValidator.ts`
- 下游依赖：图片展示模式、浮动图片 position、页眉页脚 zone
- 迁移目的：页面绘制器和 worker 快照只调度图片绘制入口，不直接维护图片展示模式和浮动图片过滤规则。

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `FloatImageRenderer.ts` | 按页、zone、页面上下层和图片展示模式绘制浮动图片 |
| `InlineImageRenderer.ts` | 正文行内图片绘制和浮动/环绕图片跳过策略 |
| `LaTexRowRenderer.ts` | LaTeX 行内图片化预览绘制 |
| `WorkerSnapshotImageRenderPolicy.ts` | worker 快照中的浮动图片层级、过滤和绘制矩形解析 |

## 函数说明

| 文件 | 函数 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `WorkerSnapshotImageRenderPolicy.ts` | `getWorkerSnapshotBottomFloatImageLayerList()` | 返回 worker 快照中文字下层浮动图片层级 | `PageRenderSnapshotBuilder.build()` |
| `WorkerSnapshotImageRenderPolicy.ts` | `getWorkerSnapshotTopFloatImageLayerList()` | 返回 worker 快照中文字上层浮动图片层级 | `PageRenderSnapshotBuilder.build()` |
| `WorkerSnapshotImageRenderPolicy.ts` | `isWorkerSnapshotFloatingImage(element)` | 判断元素是否是 worker 支持的浮动图片类型 | `PageRenderSnapshotBase.isFloatingImage()` |
| `WorkerSnapshotImageRenderPolicy.ts` | `isWorkerSnapshotSupportedFloatingImage(payload)` | 校验浮动图片是否可进入 worker 快照，表格内或缺少浮动坐标时不支持 | `PageRenderSnapshotValidator.assertElementSupported()` |
| `WorkerSnapshotImageRenderPolicy.ts` | `resolveWorkerSnapshotFloatingImageRect(payload)` | 按页码、zone、层级和缩放解析 worker 绘制图片矩形 | `PageRenderSnapshotRowCommands.buildFloatingImageCommands()` |

## 维护规则

- 浮动图片展示模式、页眉页脚浮动图过滤、行内图片跳过策略和图片渲染调用留在本目录。
- worker 快照中的浮动图片层级和矩形解析也留在本目录。
- 公共页面绘制器只做页面编排，不直接维护图片展示模式判断。
