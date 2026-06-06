# Block Render 目录索引

`render/` 存放块级嵌入元素在 Canvas 输出链路中的业务渲染辅助。

## 位置说明

- 上游调用：`draw/render/RowRenderer.ts`、`draw/render/PageRenderer.ts`、`draw/render/PageContentPainter.ts`
- 下游依赖：`BlockParticle`、页面 block host、导出回退绘制
- 迁移目的：公共渲染管线只调度 block 渲染入口，不直接维护 block DOM host 生命周期和导出回退。

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `BlockRowRenderer.ts` | block 运行态 DOM host 和导出回退绘制切换 |
| `BlockExportCanvasRenderer.ts` | 导出态 block 的 Canvas2D 占位和 SVG 栅格化绘制 |
| `BlockRenderLifecycle.ts` | 页面 base surface 重绘前的 block 运行态 host 清理 |
| `BlockPageHostRenderer.ts` | base bitmap cache 命中后重放当前页 DOM/SVG block host |

## 函数说明

| 文件 | 函数/方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `BlockRowRenderer.ts` | `canRender(element)` | 判断当前行元素是否是 block 元素 | `RowRenderer` |
| `BlockRowRenderer.ts` | `render(payload)` | 在运行态调用 block 粒子渲染，导出/打印态走回退绘制 | `RowRenderer` |
| `BlockExportCanvasRenderer.ts` | `render(ctx, element, x, y)` | 导出态绘制 block 占位或 SVG 栅格化结果 | `BlockRowRenderer.render()` |
| `BlockRenderLifecycle.ts` | `clearRuntimeHosts()` | 清理所有运行态 block host | `PageRenderer` |
| `BlockRenderLifecycle.ts` | `clearPageRuntimeHosts(pageNo)` | 清理指定页的运行态 block host | `PageRenderer` |
| `BlockPageHostRenderer.ts` | `render(payload)` | base bitmap cache 命中后重放当前页 block host | `PageRenderer` |

## 维护规则

- block 行级调度、运行态 host 生命周期以及导出、打印或截图所需的 block 绘制回退留在本目录。
- `draw/render/RowRenderer.ts` 只负责调度 block 粒子或回退渲染器，不内联 block 业务细节。
