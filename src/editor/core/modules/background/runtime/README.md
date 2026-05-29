# Background Runtime

`runtime/` 存放背景运行对象。

## 位置说明

- 所属业务：`background`
- 所属层级：页面背景运行对象
- 注册位置：`draw/runtime/DrawComponentRegistry.ts`
- 主要调用：`modules/background/render/PageBackgroundRenderer.ts`、`modules/background/export/BackgroundExportPreloadPolicy.ts`

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `Background.ts` | 页面背景色绘制、背景图片加载缓存和按页应用背景图 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `Background.ts` | `preloadImage()` | 预加载背景图片并缓存图片对象，避免导出或绘制时图片未就绪。 | `background/export/BackgroundExportPreloadPolicy.ts` |
| `Background.ts` | `render(ctx, pageNo)` | 按页面背景配置绘制背景色或背景图。 | `background/render/PageBackgroundRenderer.ts` |
