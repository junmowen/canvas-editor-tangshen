# Separator 目录索引

`separator/` 存放分隔符相关业务规则。

## 子目录说明

| 目录 | 职责 |
| --- | --- |
| `command/` | 分隔符命令、元素创建和行头替换规则 |
| `layout/` | 分隔符参与行内布局的尺寸测量 |
| `particle/` | 分隔符绘制 |
| `render/` | 分隔符参与行绘制的渲染分发 |

## 维护规则

- 分隔符命令、元素创建和行头替换规则放在这里。
- command 适配层只负责组织选区上下文、调用分隔符规则并触发渲染。
- 分隔符测量规则归属 `layout/`，不要内联回 `draw/layout/InlineElementLayout.ts`。
- 分隔符行内渲染规则归属 `render/`，不要内联回 `draw/render/RowRenderer.ts`。

## 位置说明

- 所属层级：业务模块层 / 分隔符
- 上游调用：command、layout、row render
- 下游依赖：`command/`、`layout/`、`particle/`、`render/`

## 文件说明

| 目录 | 职责 |
| --- | --- |
| `command/` | 分隔符命令、元素创建和行头替换。 |
| `layout/` | 分隔符行内尺寸测量。 |
| `particle/` | 分隔符绘制。 |
| `render/` | 分隔符行级渲染调度。 |

## 函数说明

| 目录 | 主要入口 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `command/` | separator command helper | 创建分隔符元素并处理行头替换。 | command |
| `layout/` | separator measure helper | 计算分隔符尺寸。 | `InlineElementLayout` |
| `particle/` / `render/` | separator particle / render helper | 绘制分隔符。 | `RowRenderer` |
