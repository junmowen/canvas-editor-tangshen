# Watermark Runtime

`runtime/` 存放水印运行对象。

## 位置说明

- 所属业务：`watermark`
- 所属层级：页面框架运行对象
- 注册位置：`draw/runtime/DrawComponentRegistry.ts`
- 主要调用：`modules/page-setup/render/PageFrameRenderer.ts`

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `Watermark.ts` | 水印文本 / 图片绘制、图片缓存和异步图片加载后的渲染触发 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `Watermark.ts` | `renderText(ctx, pageNo)` | 按水印配置绘制文本水印。 | `Watermark.render()` |
| `Watermark.ts` | `renderImage(ctx)` | 加载并绘制图片水印，图片加载完成后触发重新渲染。 | `Watermark.render()` |
| `Watermark.ts` | `render(ctx, pageNo)` | 根据水印类型分发文本或图片水印绘制。 | `page-setup/render/PageFrameRenderer.ts` |

## 维护规则

- 水印渲染属于 watermark 业务模块，不再放回 `draw/frame/`。
- 页面边距和页面边框等页面设置对象归属 `modules/page-setup/runtime/`。
