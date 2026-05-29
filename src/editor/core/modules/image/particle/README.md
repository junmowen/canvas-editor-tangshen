# Image Particle 目录索引

`image/particle/` 存放图片业务元素的绘制、预览和图片化公式能力。

## 位置说明

- 所属业务：`image`
- 所属层级：图片粒子绘制层
- 注册位置：`draw/runtime/DrawComponentRegistry.ts`
- 主要调用：`modules/image/render/*`、`draw/Draw.ts` 调试统计、`draw/runtime/DrawLifecycleService.ts`

## 文件说明

| 文件 / 目录 | 职责 |
| --- | --- |
| `ImageParticle.ts` | 图片绘制、浮动图片拖拽、原图列表读取和预览 bitmap 缓存 |
| `latex/` | LaTeX 转 SVG 和公式图片化绘制 |
| `previewer/` | 图片预览弹窗、拖拽缩放选区和当前页交互状态 |

## 函数说明

| 文件 / 目录 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `ImageParticle.ts` | `getOriginalMainImageList()` | 读取正文中的原始图片元素列表。 | `previewer/Previewer.ts` |
| `ImageParticle.ts` | `createFloatImage(element)` / `dragFloatImage(deltaX, deltaY)` / `destroyFloatImage()` | 创建、拖拽和销毁当前浮动图片交互状态。 | 图片指针交互链路 |
| `ImageParticle.ts` | `getPreviewBitmapCacheStats()` / `resetPreviewBitmapCacheStats()` / `clearPreviewBitmapCache()` | 读取、重置和清理图片预览 bitmap 缓存。 | `draw/Draw.ts`、`draw/runtime/DrawLifecycleService.ts` |
| `ImageParticle.ts` | `render(ctx, element, x, y, options?)` | 绘制行内或浮动图片，处理预览缓存和导出场景。 | `image/render/InlineImageRenderer.ts`、`image/render/FloatImageRenderer.ts` |
| `latex/LaTexParticle.ts` | `convertLaTextToSVG(laTex)` / `render(...)` | 将 LaTeX 转为 SVG 并按图片粒子能力绘制。 | `image/render/LaTexRowRenderer.ts` |
| `previewer/Previewer.ts` | `render()` / `drawResizer()` / `updateResizer()` / `clearResizer()` | 渲染图片预览器并维护缩放框。 | 图片预览交互链路 |

## 子目录

| 目录 | 职责 |
| --- | --- |
| `latex/` | LaTeX 转 SVG 和公式图片化绘制 |
| `previewer/` | 图片预览弹窗、拖拽缩放选区和当前页交互状态 |

## 维护规则

- 图片、LaTeX 图片化和图片预览相关绘制能力放在这里。
- 通用文本、脚本和非图片元素绘制仍归属 `core/draw/particle/`。
- 图片命令、命中、定位和剪贴板规则分别放在 `image/command`、`image/hittest`、`image/position`、`image/clipboard`。
