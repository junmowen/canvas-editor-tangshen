# Control Interactive 目录说明

`control/runtime/interactive/` 存放控件运行期搜索高亮等交互态能力。

## 位置说明

- 所属业务：`control`
- 所属层级：控件运行时 / 交互态
- 上游调用：`Control.ts`、搜索和渲染链路
- 下游依赖：控件元素、搜索关键字和 canvas 绘制

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `ControlSearch.ts` | 控件内容搜索命中、高亮列表计算和渲染。 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `ControlSearch.ts` | `getControlHighlight()` / `computeHighlightList()` | 计算控件搜索命中。 | search、control runtime |
| `ControlSearch.ts` | `getHighlightMatchResult()` / `getHighlightList()` / `setHighlightList()` | 读取或写入控件高亮状态。 | command query、render |
| `ControlSearch.ts` | `renderHighlightList(ctx, pageIndex)` | 绘制控件搜索高亮。 | control render 链路 |
