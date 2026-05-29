# Footer Runtime

`runtime/` 存放页脚运行对象。

## 位置说明

- 所属业务：`footer`
- 所属层级：页脚运行对象
- 注册位置：`draw/runtime/DrawComponentRegistry.ts`
- 主要调用：`page-setup/render/PageFrameRenderer.ts`、`draw/data/DrawDataAccess.ts`、`draw/track-change/TrackChangeService.ts`

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `Footer.ts` | 页脚元素列表、行布局、position 计算、连页高度同步和页脚绘制 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `Footer.ts` | `getRowList()` / `getElementList()` / `getPositionList()` | 读取页脚行、元素和 position 缓存。 | `draw/data/DrawDataAccess.ts`、`draw/track-change/TrackChangeService.ts` |
| `Footer.ts` | `setElementList(elementList)` | 替换页脚元素列表并触发重算。 | 页面数据设置和运行时恢复链路 |
| `Footer.ts` | `compute()` / `syncPositionForPage(pageNo)` | 计算页脚行布局，并按目标页同步 position 坐标。 | `draw/render/DrawRenderFinalizeService.ts`、页脚数据变更链路 |
| `Footer.ts` | `recovery()` | 从原始数据恢复页脚元素和布局状态。 | 页面数据恢复链路 |
| `Footer.ts` | `getFooterBottom()` / `getMaxHeight()` / `getHeight()` / `getRowHeight()` / `getExtraHeight()` | 读取页脚边界、高度和额外占位信息。 | 页面框架、表格布局和 chunk 布局链路 |
| `Footer.ts` | `render(ctx, pageNo, options)` | 在目标页绘制页脚内容。 | `page-setup/render/PageFrameRenderer.ts` |
