# 14.6 Snapshot Builder 模块图

`PageRenderSnapshotBuilder.ts` 已收缩为对外 facade。worker snapshot 的实际职责按页面、行、行内元素、文本样式、列表、表格和校验拆分，避免继续在单文件追加。

## Snapshot 构建模块

```txt
src/editor/core/render-backend/worker/
  PageRenderSnapshotBuilder.ts              # 对外 facade，组合各分域 builder
  PageRenderSnapshotBase.ts                 # 共享上下文与基础工具
  PageRenderSnapshotValidator.ts            # page / version / resource 校验
  PageRenderSnapshotFrameCommands.ts        # frame、页眉页脚、页码等页面框架命令
  PageRenderSnapshotPageBaseCommands.ts     # 页面背景、清屏、基础 base 命令
  PageRenderSnapshotPageDecorationCommands.ts
  PageRenderSnapshotAreaCommands.ts
  PageRenderSnapshotRowCommands.ts
  PageRenderSnapshotRowElementCommands.ts
  PageRenderSnapshotRowBackgroundCommands.ts
  PageRenderSnapshotInlineMarkerCommands.ts
  PageRenderSnapshotInlineMediaCommands.ts
  PageRenderSnapshotInlineControlCommands.ts
  PageRenderSnapshotListCommands.ts
  PageRenderSnapshotTextStyleCommands.ts
  PageRenderSnapshotTextDecorationCommands.ts
  PageRenderSnapshotControlBorderCommands.ts
  PageRenderSnapshotTableCommands.ts
  PageRenderSnapshotTableBackgroundCommands.ts
  PageRenderSnapshotTableCellCommands.ts
  PageRenderSnapshotTableCellBorderCommands.ts
  PageRenderSnapshotTableBorderCommands.ts
  PageRenderSnapshotPageCommands.ts         # 兼容 facade
  PageRenderSnapshotInlineCommands.ts       # 兼容 facade
  PageRenderSnapshotRowDecorations.ts       # 兼容 facade
```

## Worker 执行链路

```txt
src/editor/core/render-backend/worker/
  WorkerRenderProtocol.ts
  WorkerRenderScheduler.ts
  WorkerBitmapCompositor.ts
  offscreenRender.worker.ts
```

## Engine 入口

```txt
src/editor/core/render-backend/engines/
  OffscreenCanvasRenderEngine.ts
  WebGLImageRenderEngine.ts
  SvgDomBlockRenderEngine.ts
```

## 维护约束

1. 新增 worker 命令时，先判断属于页面框架、行、行内元素、文本装饰、控件、列表还是表格，再放入对应模块。
2. `PageRenderSnapshotBuilder.ts` 只能负责组合和对外入口，不再承载具体绘制分支。
3. 大于约 8KB 的 snapshot 模块需要继续按职责拆分，不能把新能力重新堆回 facade。
4. 兼容 facade 只保留旧 import 边界，不承接新增逻辑。
