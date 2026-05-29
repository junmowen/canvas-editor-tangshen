# Draw 目录索引

`draw/` 存放布局、渲染、坐标、数据访问和页面调度等公共编排。

## 位置说明

- 所属层级：公共绘制与布局编排层
- 主要出口：`Draw.ts`
- 主要下钻：`coordinate/`、`cursor/`、`data/`、`dom/`、`export/`、`history/`、`layout/`、`particle/`、`query/`、`render/`、`runtime/`、`state/`、`track-change/`、`viewport/`

## 文件说明

| 文件 / 目录 | 职责 |
| --- | --- |
| `Draw.ts` | Draw 门面，聚合数据、渲染、布局、命中、导出和状态接口 |
| `coordinate/` | 坐标、positionList 和光标坐标计算 |
| `cursor/` | 光标 DOM 和移动 / 恢复 |
| `data/` | 文档数据读写、目标解析和 mutation |
| `layout/` | 行布局、chunk 布局、页分割和度量 |
| `render/` | 行、页、渲染管线和渲染后处理 |
| `runtime/` | Draw 注册表和运行时对象组装 |
| `viewport/` | 可见页、懒渲染和 overlay 刷新 |

## 函数说明

| 文件 | 函数 / 方法 | 作用 | 调用位置 |
| --- | --- | --- | --- |
| `Draw.ts` | `computeRowList(payload)` | 统一计算 row 列表。 | 布局和重绘链路 |
| `Draw.ts` | `drawRow(ctx, payload)` / `drawSelection(ctx, payload)` | 绘制单行正文和选区。 | `render/PageRenderer.ts`、`render/RowRenderer.ts` |
| `Draw.ts` | `render(payload?)` | 触发完整渲染流程。 | 外部调用入口 |
| `Draw.ts` | `getTargetResolver()` / `getServices()` / `getComponents()` | 暴露核心服务和组件聚合。 | 业务模块和事件链路 |
| `layout/RowLayoutEngine.ts` | `computeRowList(payload)` | 由元素流生成 row。 | `Draw.computeRowList()` |
| `layout/DrawLayoutPipeline.ts` | `compute(layoutPatch?)` | 编排整篇布局、分页和搜索高亮计算。 | `Draw` 和 render pipeline |
| `render/PageRenderer.ts` | `drawPage(payload)` / `drawPageToSurface(payload, surface, selectionCtx, options)` | 页面级渲染编排。 | `draw/render/PageContentPainter.ts` |
| `render/DrawRenderFacadeService.ts` | `render(payload)` | 选择可见页、render backend 和 surface。 | `Draw.render()` |
| `render/DrawRenderPipeline.ts` | `render(payload)` | 选择渲染策略。 | `DrawRenderFacadeService` |

