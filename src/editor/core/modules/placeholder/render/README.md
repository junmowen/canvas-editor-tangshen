# Placeholder Render 目录索引

`render/` 存放占位内容参与页面绘制时的业务编排。

## 位置说明

- 所属业务：`placeholder`
- 所属层级：页面内容渲染层
- 上游调度：`draw/render/PageContentPainter.ts`
- 下游依赖：`components.placeholder`

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `PagePlaceholderRenderer.ts` | 空文档占位内容绘制 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `PagePlaceholderRenderer.ts` | `constructor(draw)` | 注入 `Draw` 运行时，用于读取占位内容可用状态和组件实例。 | `draw/render/PageContentPainter.ts` 构造函数 |
| `PagePlaceholderRenderer.ts` | `render(ctx)` | 在原始主占位内容可用时，绘制空文档占位内容。 | `draw/render/PageContentPainter.ts` 的 `drawPageToSurface()` |

## 维护规则

- 占位内容页级渲染规则留在本目录。
- `draw/render/PageContentPainter.ts` 只负责调度占位内容渲染入口。
