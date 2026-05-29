# Block Module 目录索引

`block/` 存放块级嵌入元素业务能力，例如 iframe、video、svg 和 html block。

## 子目录说明

| 目录 | 职责 |
| --- | --- |
| `layout/` | block 元素行内尺寸测量和 SVG 导出预加载 |
| `particle/` | 块级嵌入元素的 DOM 宿主、页面定位和渲染运行态 |
| `render/` | 导出、打印或截图链路中的块级嵌入元素 Canvas 回退绘制 |

## 维护规则

- block 属于业务元素，相关绘制和 DOM 宿主管理放在 `modules/block/`。
- block 行内测量和 SVG 导出预加载放在 `layout/`，不要内联到 `draw/layout/InlineElementLayout.ts`。
- block 导出态回退绘制放在 `render/`，不要内联到 `draw/render/RowRenderer.ts`。
- `draw/particle/` 只保留文本、换行、上下标等通用基础粒子。

## 位置说明

- 所属层级：业务模块层 / 块级嵌入
- 上游调用：inline layout、row render、export render
- 下游依赖：`layout/`、`particle/`、`render/`

## 文件说明

| 目录 | 职责 |
| --- | --- |
| `layout/` | block 尺寸测量和 SVG 预加载。 |
| `particle/` | block DOM 宿主和运行态。 |
| `render/` | 导出 / 打印时 Canvas 回退绘制。 |

## 函数说明

| 目录 | 主要入口 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `layout/` | block measure / preload | 计算 block 行内尺寸并处理导出资源。 | `InlineElementLayout` |
| `particle/BlockParticle.ts` | block particle 方法 | 管理 block DOM 宿主和页面定位。 | row render、lifecycle |
| `particle/modules/` | `BaseBlock.render()` 等 | 渲染 iframe、video、svg、html block。 | `BlockParticle` |
| `render/` | block fallback renderer | 导出时绘制 block 回退内容。 | `RowRenderer` |
