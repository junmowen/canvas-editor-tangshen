# Page Break 目录索引

`page-break/` 存放分页符相关业务规则。

## 子目录说明

| 目录 | 职责 |
| --- | --- |
| `command/` | 分页符命令、元素创建和插入规则 |
| `layout/` | 分页符参与行内布局的尺寸测量 |
| `particle/` | 分页符在编辑态的可视化绘制 |
| `render/` | 分页符参与行绘制的模式判断和渲染分发 |

## 维护规则

- 分页符命令和元素创建规则放在这里。
- command 适配层只负责调用分页符规则并插入元素。
- 分页符测量规则归属 `layout/`，不要内联回 `draw/layout/InlineElementLayout.ts`。
- 分页符行内渲染规则归属 `render/`，不要内联回 `draw/render/RowRenderer.ts`。

## 位置说明

- 所属层级：业务模块层 / 分页符
- 上游调用：command、layout、row render
- 下游依赖：`command/`、`layout/`、`particle/`、`render/`

## 文件说明

| 目录 | 职责 |
| --- | --- |
| `command/` | 分页符命令、元素创建和插入规则。 |
| `layout/` | 分页符行内尺寸测量。 |
| `particle/` | 编辑态分页符可视化绘制。 |
| `render/` | 分页符行级渲染调度。 |

## 函数说明

| 目录 | 主要入口 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `command/` | page break command helper | 创建并插入分页符元素。 | command |
| `layout/` | page break measure | 计算分页符行内尺寸。 | `InlineElementLayout` |
| `particle/` / `render/` | page break particle / render helper | 绘制分页符。 | `RowRenderer` |
