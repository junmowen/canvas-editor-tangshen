# Page Setup Render

`render/` 存放页面设置相关渲染编排。

## 位置说明

- 所属业务：`page-setup`
- 所属层级：页面框架渲染层
- 上游调度：`draw/render/PageContentPainter.ts`
- 下游依赖：页边距、页眉页脚、页码、行号、页边框、签章、水印和浮动图片渲染器

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `PageFrameRenderer.ts` | 编排页边距、页眉页脚、页码、行号、页边框、签章和水印渲染 |
| `PageMarginIndicatorRenderer.ts` | 非打印、非连续页模式下的页边距指示器绘制 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `PageFrameRenderer.ts` | `constructor(draw)` | 注入 `Draw` 运行时，并创建页眉页脚浮动图片渲染器。 | `draw/render/PageContentPainter.ts` 构造函数 |
| `PageFrameRenderer.ts` | `getVisibleSegmentRange(surface, offsetY)` | 连续页模式下计算当前 surface 可见的分页段范围。 | `PageFrameRenderer.renderContinuousFrame()` |
| `PageFrameRenderer.ts` | `renderPagedFrame(ctx, payload)` | 分页模式下绘制页边距、页眉页脚、页码、行号、页边框、签章和水印。 | `draw/render/PageContentPainter.ts` 的 `drawPageToSurface()` |
| `PageFrameRenderer.ts` | `renderContinuousFrame(ctx, payload, surface, offsetY)` | 连续页模式下绘制总高度框架、页眉页脚浮动图片、页边框、签章和可见分段水印。 | `draw/render/PageContentPainter.ts` 的 `drawPageToSurface()` |
| `PageMarginIndicatorRenderer.ts` | `constructor(draw)` | 注入 `Draw` 运行时，用于访问页边距渲染对象。 | `draw/render/PageContentPainter.ts` 构造函数 |
| `PageMarginIndicatorRenderer.ts` | `render(ctx, pageNo, pageMode, isPrintMode)` | 非打印且非连续页模式下绘制页边距指示器。 | `draw/render/PageContentPainter.ts` 的 `drawPageToSurface()` |

## 维护规则

- 页面框架渲染编排留在本目录，不再堆回 `draw/render/PageContentPainter.ts`。
- 公共页面绘制器只负责正文绘制顺序和 surface 生命周期。
