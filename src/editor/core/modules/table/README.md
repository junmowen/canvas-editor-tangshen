# Table 目录索引

`table/` 存放表格通用服务。表格能力会跨 `command`、`draw`、`event` 和 `render-backend`，这里负责沉淀可复用的表格基础能力。

| 目录 | 职责 |
| --- | --- |
| `contextmenu/` | 表格专属右键菜单 |
| `hittest/` | 表格命中测试、pointer 命中请求入口和表格浮动命中结果 |
| `interaction/` | 表格工具条等交互副作用 |
| `layout/` | 表格布局快照、访问器和布局引擎 |
| `layout/engine/` | 表格布局、跨页拆分、chunk 索引和局部重分页实现 |
| `navigation/` | 表格内横向、纵向、退格等导航 |
| `particle/` | 表格绘制、表格工具条、表格操作和合并拆分 |
| `position/` | 表格上下文 positionList 解析、分页片段归并和单元格内部 position 计算 |
| `render/` | 表格覆盖层渲染、失效管理和辅助渲染 |
| `selection/` | 表格选择类型、起始状态和公开选区投影 |
| `target/` | 表格上下文、目标和快照切片解析 |
| `track-change/` | 表格参与修订留痕的递归遍历和分页片段位置策略 |
| `utils/` | 表格通用工具 |

## 维护规则

- 通用表格遍历放在 `table/utils/`。
- 表格参与行级断行和行内表格判断放在 `table/layout/`。
- 表格布局引擎、跨页拆分和表格局部重分页放在 `table/layout/engine/`。
- 表格绘制、工具条和结构操作放在 `table/particle/`。
- 表格覆盖层、渲染失效和渲染特例 helper 放在 `table/render/`。
- 表格目标、上下文和快照切片解析放在 `table/target/`。
- 表格参与修订留痕的形态判断、单元格递归和分页片段位置遍历放在 `table/track-change/`。
- 表格 pointer 命中统一从 `table/hittest/resolveTablePointerHit.ts` 进入，event 和 range 不直接调用命中服务。
- 表格浮动图片命中结果由 `table/hittest/resolveTableFloatImageHit.ts` 组装，Position 不直接拼接表格上下文字段。
- 表格上下文 positionList 解析和单元格内部 position 计算放在 `table/position/`，Position 不直接维护分页片段归并与单元格递归定位细节。
- 表格选择起点、渲染范围和公开 range/cursor 投影放在 `table/selection/`。
- 表格右键菜单定义放在 `table/contextmenu/`，通用 contextmenu 只做运行时装配。
- 表格工具条渲染/销毁等交互副作用放在 `table/interaction/`，事件 intent 只做调用。
- 表格布局快照访问应收口在 resolver 或 snapshot accessor 后面。
- 新增表格 Cypress 专项放入 `cypress/e2e/table/`。

## 位置说明

- 所属层级：业务模块层 / 表格
- 上游调用：command、draw layout、event pointer、range、render
- 下游依赖：`layout/`、`hittest/`、`selection/`、`position/`、`target/`、`particle/`、`render/`

## 文件说明

| 目录 | 职责 |
| --- | --- |
| `hittest/` | 表格 pointer 和浮动图片命中。 |
| `layout/` | 表格布局快照、布局引擎和局部重分页。 |
| `selection/` | 表格选择类型、起点和公开 range 投影。 |
| `position/` | 表格上下文 position 计算。 |
| `target/` | 表格上下文、目标和快照切片解析。 |
| `particle/` / `render/` | 表格绘制、工具条、覆盖层和失效管理。 |
| `utils/` | 表格单元格遍历工具。 |

## 函数说明

| 目录 | 主要入口 | 作用 | 调用地方 |
| --- | --- | --- | --- |
| `hittest/TableHitTestService.ts` | `resolve()` | 解析表格命中结果。 | pointer hit、Position |
| `hittest/resolveTablePointerHit.ts` | `resolveTablePointerHit()` | 表格 pointer 命中入口。 | event pointer |
| `utils/TableCellTraversal.ts` | `forEachTableCell()` / `resolveTableCellByIndex()` | 遍历或定位表格单元格。 | layout、command、shared traversal |
| `layout/` | table layout engine / snapshot accessor | 计算表格布局和分页快照。 | draw layout |
| `selection/` / `position/` / `target/` | table helper | 处理表格选区、position 和目标解析。 | range、position、command |
| `particle/` / `render/` | table particle / renderer | 绘制表格、工具条和覆盖层。 | page render |
