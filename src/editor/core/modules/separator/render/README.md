# Separator Render 目录索引

`render/` 存放分隔符参与行绘制时的业务编排。

## 位置说明

- 所属业务：`separator`
- 所属层级：正文行级渲染层
- 上游调度：`draw/render/RowRenderer.ts`
- 下游依赖：`components.separatorParticle`

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `SeparatorRowRenderer.ts` | 分隔符行内绘制分发 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `SeparatorRowRenderer.ts` | `canRender(element)` | 判断当前行内元素是否为分隔符元素。 | `draw/render/RowRenderer.ts` 的 `renderRowElement()` |
| `SeparatorRowRenderer.ts` | `render(ctx, element, x, y, zone, separatorParticle)` | 将分隔符元素交给分隔符粒子绘制，并透传当前编辑区域信息。 | `draw/render/RowRenderer.ts` 的 `renderRowElement()` |

## 维护规则

- 分隔符行内渲染规则留在本目录。
- `draw/render/RowRenderer.ts` 只负责调度分隔符渲染入口。
