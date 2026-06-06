# Header Runtime

`runtime/` 存放页眉运行对象。

## 位置说明

- 所属业务：`header`
- 所属层级：页眉运行对象
- 注册位置：`draw/runtime/DrawComponentRegistry.ts`
- 主要调用：`page-setup/render/PageFrameRenderer.ts`、`draw/data/DrawDataAccess.ts`、`draw/track-change/TrackChangeService.ts`

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `Header.ts` | 页眉作用域元素列表、行布局、position 计算、活动态透明度和页眉绘制 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `Header.ts` | `getRowList(pageNo)` / `getElementList(pageNo)` / `getPositionList(pageNo)` | 按页读取页眉行、元素和 position。 | `draw/data/DrawDataAccess.ts`、`draw/track-change/TrackChangeService.ts` |
| `Header.ts` | `setPageScopes(pageScopes)` / `ensureElementList(pageNo)` | 替换或懒创建页眉作用域元素列表。 | 页面数据设置、区域编辑和运行时恢复链路 |
| `Header.ts` | `compute()` | 计算页眉作用域行布局。 | 页眉数据变更、恢复和初始化链路 |
| `Header.ts` | `recovery()` | 从原始数据恢复页眉元素和布局状态。 | 页面数据恢复链路 |
| `Header.ts` | `getHeaderTop()` / `getMaxHeight()` / `getHeight()` / `getRowHeight()` / `getExtraHeight()` | 读取页眉边界、高度和额外占位信息。 | 页面框架、表格布局和 chunk 布局链路 |
| `Header.ts` | `render(ctx, pageNo)` | 在目标页绘制页眉内容。 | `page-setup/render/PageFrameRenderer.ts` |
