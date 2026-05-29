# Background 模块

`background/` 承接页面背景业务运行对象，负责背景色、背景图缓存和背景渲染。

## 子目录说明

| 目录 | 职责 |
| --- | --- |
| `export/` | 背景参与导出链路的预加载策略 |
| `render/` | 背景参与页面绘制的编排 |
| `runtime/` | 背景运行对象、图片预加载缓存和背景绘制 |

## 维护规则

- 背景运行对象留在本模块，不再放回 `draw/frame/Background.ts`。
- 背景页级渲染调度留在 `render/`，不要内联回 `draw/render/PageContentPainter.ts`。
- 页面边距和页面边框等页面设置对象归属 `modules/page-setup/runtime/`。

## 位置说明

- 所属层级：业务模块层 / 背景
- 上游调用：page render、export
- 下游依赖：`export/`、`render/`、`runtime/`

## 文件说明

| 目录 | 职责 |
| --- | --- |
| `export/` | 导出时背景图预加载策略。 |
| `render/` | 页面背景渲染调度。 |
| `runtime/` | 背景配置、图片缓存和绘制。 |

## 函数说明

| 目录 | 主要入口 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `export/BackgroundExportPreloadPolicy.ts` | `preloadExportBackgroundIfNeeded()` | 导出前按需预加载背景图。 | `DrawExportService` |
| `render/PageBackgroundRenderer.ts` | `render()` | 绘制指定页背景。 | `PageContentPainter` |
| `runtime/Background.ts` | `preloadImage()` / `render()` | 缓存并绘制背景图或背景色。 | export、render |
