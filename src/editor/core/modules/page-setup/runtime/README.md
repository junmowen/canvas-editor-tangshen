# Page Setup Runtime

`runtime/` 存放页面设置相关的运行对象。

## 位置说明

- 所属业务：`page-setup`
- 所属层级：页面设置运行对象
- 注册位置：`draw/runtime/DrawComponentRegistry.ts`、`draw/runtime/DrawServiceRegistry.ts`
- 主要调用：`draw/Draw.ts`、`modules/page-setup/render/*`、页面框架和布局度量链路

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `Margin.ts` | 渲染当前页四角页边距指示器 |
| `PageBorder.ts` | 组合页眉和页脚边界，渲染页面边框 |
| `HeaderPageBorder.ts` | 计算页眉侧页面边框边界 |
| `FooterPageBorder.ts` | 计算页脚侧页面边框边界 |
| `PageSetupService.ts` | 编排页面模式、缩放、纸张尺寸、方向和页边距设置 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `Margin.ts` | `render(ctx, pageNo, pageHeight?)` | 按当前页尺寸和边距绘制四角页边距指示器。 | `page-setup/render/PageFrameRenderer.ts`、`PageMarginIndicatorRenderer.ts` |
| `PageBorder.ts` | `render(ctx, pageNo, pageHeight?)` | 组合页眉 / 页脚边界后绘制页面边框。 | `page-setup/render/PageFrameRenderer.ts` |
| `HeaderPageBorder.ts` | `getTop()` / `getLeft()` / `getWidth()` | 计算页眉侧页面边框的上边界、左边界和宽度。 | `PageBorder.ts` |
| `FooterPageBorder.ts` | `getBottom(pageHeight?)` | 计算页脚侧页面边框下边界。 | `PageBorder.ts` |
| `PageSetupService.ts` | `setMode(payload)` | 切换编辑器模式并触发必要的运行状态更新。 | `draw/Draw.ts` 对外页面设置入口 |
| `PageSetupService.ts` | `setPageMode(payload)` | 切换分页 / 连续页模式并触发重绘。 | `draw/Draw.ts` |
| `PageSetupService.ts` | `setPageScale(payload)` | 更新页面缩放比例并同步设备像素。 | `draw/Draw.ts` |
| `PageSetupService.ts` | `setPageDevicePixel()` | 根据当前环境刷新页面像素比。 | `draw/Draw.ts` |
| `PageSetupService.ts` | `setPaperSize(width, height)` / `setPaperDirection(payload)` / `setPaperMargin(payload)` | 更新纸张尺寸、方向或页边距并触发布局刷新。 | `draw/Draw.ts` |

## 维护规则

- 这里的对象可以依赖 `Draw` 门面读取页面尺寸、页边距和页眉页脚状态。
- 不在 `draw/frame/` 重建页面框架目录。
