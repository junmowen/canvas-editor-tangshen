# Area 目录索引

`area/` 存放区域元素相关的编辑规则。

| 目录 | 职责 |
| --- | --- |
| `interaction/` | 区域上下文在键盘插入、换行等操作中的继承和清理规则 |
| `render/` | 区域辅助层参与页面绘制的编排 |
| `runtime/` | 区域元素插入、删除、定位、渲染、取值和属性更新 |

## 维护规则

- 区域上下文在键盘插入、换行等操作中的继承/清理规则放在这里。
- 区域运行实现放在 `runtime/`，不要重新散回 `draw/interactive/Area.ts`。
- 区域页级渲染调度留在 `render/`，不要内联回 `draw/render/PageContentPainter.ts`。
- keyboard intent 不直接判断 `areaId` 边界。

## 位置说明

- 所属层级：业务模块层 / 区域
- 上游调用：command、keyboard、page render
- 下游依赖：`interaction/`、`render/`、`runtime/`

## 文件说明

| 目录 | 职责 |
| --- | --- |
| `interaction/` | 区域上下文继承和清理规则。 |
| `render/` | 区域辅助层页级绘制。 |
| `runtime/` | 区域插入、删除、定位、取值和渲染。 |

## 函数说明

| 目录 | 主要入口 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `interaction/AreaEnterPolicy.ts` | `normalizeAreaContextForEnter()` | 规范化回车后的区域上下文。 | keyboard Enter 链路 |
| `render/PageAreaRenderer.ts` | `render()` | 调度区域辅助层绘制。 | `PageContentPainter` |
| `runtime/Area.ts` | `insertArea()` / `deleteArea()` / `setAreaValue()` / `render()` | 区域结构和渲染运行能力。 | command、render |
