# Richtext 模块

`richtext/` 承接文本装饰业务运行对象，包括下划线、删除线、高亮和上下标。

## 子目录说明

| 目录 | 职责 |
| --- | --- |
| `command/` | 上标、下标等富文本命令状态切换 |
| `layout/` | 上下标等富文本元素的行内测量修正 |
| `particle/` | 上标、下标等文本装饰粒子绘制 |
| `render/` | 行级富文本高亮、控件高亮合并绘制等渲染编排 |
| `runtime/` | 文本装饰运行对象、fill rect 缓存和装饰绘制 |

## 维护规则

- 富文本装饰运行对象留在本模块，不再放回 `draw/richtext/`。
- 上标/下标命令切换规则留在 `command/`，不要内联回 `core/command/CommandAdaptRichText.ts`。
- 上下标粒子留在本模块，不再放回 `draw/particle/`。
- 上下标测量修正留在 `layout/`，不要内联回 `draw/layout/InlineElementLayout.ts`。
- 行级高亮合并绘制留在 `render/`，不要内联回 `draw/render/RowRenderer.ts`。
- 通用文本粒子仍保留在 `draw/particle/`。

## 位置说明

- 所属层级：业务模块层 / 富文本装饰
- 上游调用：command、layout、row render
- 下游依赖：`command/`、`layout/`、`particle/`、`render/`、`runtime/`

## 文件说明

| 目录 | 职责 |
| --- | --- |
| `command/` | 上标、下标等命令切换。 |
| `layout/` | 富文本元素行内测量修正。 |
| `particle/` | 上下标等文本装饰粒子。 |
| `render/` | 行级高亮和装饰渲染。 |
| `runtime/` | 文本装饰运行对象和 fill rect 缓存。 |

## 函数说明

| 目录 | 主要入口 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `command/` | richtext command helper | 切换上标、下标等文本样式。 | command |
| `layout/` | richtext measure helper | 修正上下标等元素尺寸。 | `InlineElementLayout` |
| `particle/` / `render/` | richtext particle / render helper | 绘制文本装饰和高亮。 | `RowRenderer` |
| `runtime/` | underline / strikeout / highlight runtime | 缓存并绘制富文本装饰区域。 | row render |
