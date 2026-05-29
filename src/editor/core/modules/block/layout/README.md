# Block Layout

`layout/` 存放 block 元素参与行内布局测量的业务规则。

## 位置说明

- 所属业务：`block`
- 所属层级：行内布局测量层
- 上游调度：`draw/layout/InlineElementLayout.ts`、`draw/layout/RowLayoutEngine.ts`
- 下游依赖：`imageObserver`、SVG block 栅格预加载

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `BlockElementLayout.ts` | block 行内尺寸测量、block 元素识别和 SVG block 导出前栅格图预加载 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `BlockElementLayout.ts` | `isBlockElement(element)` | 判断元素是否为 block 元素，供断行和测量入口做业务识别。 | `draw/layout/RowLayoutEngine.ts`、`BlockElementLayout.measure()` |
| `BlockElementLayout.ts` | `constructor(draw)` | 注入 `Draw` 运行时，用于 SVG block 预加载时访问图片观察器。 | `draw/layout/InlineElementLayout.ts` 构造函数 |
| `BlockElementLayout.ts` | `measure(payload)` | 按可用宽度、元素宽高和缩放计算 block 行内 metrics，并触发 SVG block 栅格预加载。 | `draw/layout/InlineElementLayout.ts` 的行内测量流程 |
| `BlockElementLayout.ts` | `preloadSvgBlockRasterImage(element)` | 将 SVG block 转换为图片加载任务，保证导出到 Canvas2D 时可同步绘制。 | `BlockElementLayout.measure()` |

## 维护规则

- block 宽高、自适应可用宽度和 SVG 预加载规则留在本目录，不内联回 `draw/layout/InlineElementLayout.ts`。
- block 参与断行的判断留在本目录，不内联回 `draw/layout/RowLayoutEngine.ts`。
