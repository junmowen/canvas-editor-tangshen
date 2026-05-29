# List Particle 目录索引

`list/particle/` 存放列表业务元素的绘制、测量和列表结构操作。

## 位置说明

- 所属业务：`list`
- 所属层级：列表粒子和结构操作层
- 注册位置：`draw/runtime/DrawComponentRegistry.ts`
- 主要调用：`command/CommandAdaptRichText.ts`、`draw/layout/RowLayoutEngine.ts`、`modules/list/render/ListRowMarkerRenderer.ts`

## 文件说明

| 文件 | 职责 |
| --- | --- |
| `ListParticle.ts` | 列表设置、取消、缩进、样式计算、宽度测量和行头绘制 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `ListParticle.ts` | `setList(listType, listStyle)` | 将当前段落设置为指定列表类型和样式。 | `command/CommandAdaptRichText.ts` |
| `ListParticle.ts` | `unsetList()` | 取消当前列表上下文。 | `list/interaction/ListKeyboardInteraction.ts` |
| `ListParticle.ts` | `indentList(delta)` | 调整当前列表缩进层级。 | `list/interaction/ListKeyboardInteraction.ts` |
| `ListParticle.ts` | `computeListStyle(...)` | 计算当前文档的列表序号 / 标记样式映射。 | `draw/layout/RowLayoutEngine.ts` |
| `ListParticle.ts` | `getListStyleKey(element)` / `getListStyleWidth(...)` | 解析列表样式 key 和行头占位宽度。 | `draw/layout/RowLayoutEngine.ts` |
| `ListParticle.ts` | `drawListStyle(...)` | 绘制列表行头符号或序号。 | `list/render/ListRowMarkerRenderer.ts` |

## 维护规则

- 列表样式计算、缩进、取消列表和列表符号绘制放在这里。
- 列表键盘触发条件放在 `list/interaction/`，不要写回事件层。
