# List 目录索引

`list/` 存放列表相关的键盘、指针和段落业务规则。

## 子目录说明

| 目录 | 职责 |
| --- | --- |
| `command/` | 列表命令查询和适配中的业务规则 |
| `hittest/` | 列表行首区域和 checkbox 符号命中 |
| `particle/` | 列表行头符号绘制和结构操作入口 |
| `render/` | 列表行头标记参与行绘制的编排 |

## 维护规则

- Tab 缩进、Enter 退出空列表、Shift+Enter 列表内换行等键盘规则放在这里。
- 列表命令查询中的元素类型判断留在 `command/`，不要内联回 `core/command`。
- 列表 checkbox 符号和行首区域的命中测试放在 `hittest/`。
- 列表选区、列表拖拽上下文复制等指针触发条件放在 `interaction/`。
- 列表行头标记渲染规则放在 `render/`，不要内联回 `draw/render/RowRenderer.ts`。
- event intent 只负责传入当前元素、段落元素和方向，不直接判断 `listId` / `listWrap`。
- 列表具体绘制和修改仍由 `particle/` 执行，行级调度由 `render/` 承担。

## 位置说明

- 所属层级：业务模块层 / 列表
- 上游调用：keyboard、pointer、command、row render
- 下游依赖：`interaction/`、`command/`、`hittest/`、`particle/`、`render/`

## 文件说明

| 目录 | 职责 |
| --- | --- |
| `interaction/` | 列表键盘、拖拽和选区规则。 |
| `command/` | 列表命令查询和适配。 |
| `hittest/` | 列表行首和 checkbox 命中。 |
| `particle/` | 列表符号绘制和结构操作。 |
| `render/` | 列表行头渲染调度。 |

## 函数说明

| 目录 | 主要入口 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `interaction/ListKeyboardInteraction.ts` | `tryIndentListOnTab()` / `tryUnsetEmptyListOnEnter()` | 处理列表键盘编辑规则。 | keyboard intents |
| `interaction/ListDragDropContext.ts` | `appendListDragDropCopyAttrs()` | 拖拽复制列表上下文。 | drag-drop mutation |
| `interaction/ListSelectionPolicy.ts` | `hasListSelectionContext()` | 判断列表选区上下文。 | range、drag |
| `particle/` / `render/` | list particle / render helper | 绘制列表符号并修改列表结构。 | row render、command |
