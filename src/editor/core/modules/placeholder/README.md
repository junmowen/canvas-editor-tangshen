# Placeholder 模块

`placeholder/` 承接空文档和区域占位内容的临时布局与渲染。

## 子目录说明

| 目录 | 职责 |
| --- | --- |
| `render/` | 占位内容参与页面绘制的编排 |
| `runtime/` | 占位内容元素构造、临时行布局、position 计算和绘制 |

## 维护规则

- 占位内容运行对象留在本模块，不再放回 `draw/frame/Placeholder.ts`。
- 占位内容页级渲染调度留在 `render/`，不要内联回 `draw/render/PageContentPainter.ts`。
- 通用行布局能力继续通过 Draw 布局服务复用。

## 位置说明

- 所属层级：业务模块层 / 占位内容
- 上游调用：page render、area render
- 下游依赖：`runtime/`、`render/`

## 文件说明

| 目录 | 职责 |
| --- | --- |
| `runtime/` | 占位元素构造、临时布局、position 和绘制。 |
| `render/` | 占位内容页级渲染调度。 |

## 函数说明

| 目录 | 主要入口 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `runtime/Placeholder.ts` | placeholder runtime 方法 | 构造并绘制空文档或区域占位内容。 | page render |
| `render/` | placeholder render helper | 调度占位内容绘制。 | `PageContentPainter` |
