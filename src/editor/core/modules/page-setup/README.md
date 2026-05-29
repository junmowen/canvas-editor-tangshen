# Page Setup 模块

`page-setup/` 承接页面设置相关运行对象，负责页面模式、缩放、纸张尺寸、页边距指示器、页面边框和边框边界计算。

## 子目录说明

| 目录 | 职责 |
| --- | --- |
| `runtime/` | 页面模式、缩放、纸张尺寸、页边距指示器、页面边框和页眉/页脚边框边界计算 |
| `render/` | 页边距、页眉页脚、页码、行号、页边框、签章和水印的页面框架渲染编排 |

## 维护规则

- 页面设置相关运行对象留在本模块，不再放回 `draw/frame/`。
- 页面框架渲染编排留在 `render/`，不再堆回 `draw/render/`。
- `draw/` 只负责渲染管线调度，通过组件注册表持有本模块运行对象。

## 位置说明

- 所属层级：业务模块层 / 页面设置
- 上游调用：draw API、page render、global wheel
- 下游依赖：`runtime/`、`render/`

## 文件说明

| 目录 | 职责 |
| --- | --- |
| `runtime/` | 页面模式、缩放、纸张、边距、页边框和边界计算。 |
| `render/` | 页面框架渲染编排。 |

## 函数说明

| 目录 | 主要入口 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `runtime/PageSetupService.ts` | page setup runtime 方法 | 设置页面模式、缩放、纸张尺寸和边距。 | `Draw.ts`、command |
| `runtime/PageBorder.ts` / `Margin.ts` | page frame runtime 方法 | 计算并绘制页边距和页边框。 | page frame render |
| `render/` | page frame renderer | 调度页眉页脚、页码、行号、水印等框架元素。 | `PageContentPainter` |
