# Draw Export 目录说明

`export/` 存放导出期间的渲染状态捕获与恢复能力，避免图片 / 打印导出污染正常编辑状态。

## 位置说明

- 所属层级：公共绘制层 / 导出状态层
- 上游调用：`Draw.ts`、`DrawExportService`
- 下游依赖：`DrawRuntime`、页面模式和渲染状态

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `DrawExportStateService.ts` | 捕获导出前的渲染状态，并在导出完成后恢复。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `DrawExportStateService.ts` | `captureExportRenderState()` | 保存导出前页面模式、缩放、可见页和运行时状态。 | `Draw.ts`、`DrawExportService.ts` |
| `DrawExportStateService.ts` | `restoreExportRenderState()` | 将导出临时状态恢复为编辑态。 | `Draw.ts`、导出完成链路 |
