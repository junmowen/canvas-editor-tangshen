# Inline 目录索引

`inline/` 存放超链接、日期等内联业务元素的交互和渲染编排。

## 子目录说明

| 目录 | 职责 |
| --- | --- |
| `command/` | 超链接等内联业务命令参数归一化和元素创建 |
| `contextmenu/` | 超链接、日期等内联元素的右键菜单定义 |
| `particle/` | 超链接、日期和其他内联业务元素的绘制入口 |
| `render/` | 超链接、日期等内联业务元素参与行绘制的编排 |

## 维护规则

- 超链接弹层、跳转和日期选择器等内联元素副作用放在这里。
- 超链接命令复用规则放在 `command/`。
- 超链接右键菜单配置放在 `contextmenu/`。
- 编辑器外部点击触发的内联浮层清理放在 `interaction/`。
- 内联业务元素行级绘制规则归属 `render/`，不要内联回 `draw/render/RowRenderer.ts`。
- event intent 只负责把命中元素、位置和事件传进来，不直接判断具体内联元素类型。
- 具体 DOM 粒子仍由 `particle/` 承担，行级绘制编排由 `render/` 承担。

## 位置说明

- 所属层级：业务模块层 / 内联元素
- 上游调用：pointer、command、row render
- 下游依赖：`command/`、`contextmenu/`、`interaction/`、`particle/`、`render/`

## 文件说明

| 目录 | 职责 |
| --- | --- |
| `command/` | 超链接等内联命令参数和元素创建。 |
| `contextmenu/` | 内联元素右键菜单。 |
| `interaction/` | 指针副作用和全局清理。 |
| `particle/` | 超链接、日期等 DOM / 绘制粒子。 |
| `render/` | 内联元素行级渲染调度。 |

## 函数说明

| 目录 | 主要入口 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `interaction/applyInlinePointerEffects.ts` | `applyInlinePointerEffects()` | 应用内联元素点击副作用。 | pointer selection |
| `interaction/GlobalInlineEffects.ts` | `clearGlobalInlineEffects()` | 清理内联浮层副作用。 | `GlobalEvent` |
| `command/` | inline command helper | 创建或更新内联元素。 | command |
| `render/` | inline render helper | 绘制内联元素视觉效果。 | `RowRenderer` |
