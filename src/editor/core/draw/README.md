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
| `DrawBootstrapRegistry.ts` | 构造阶段依赖注册表，在组件注册完成前提供启动期依赖 |
| `DrawRenderBackendStatsSnapshot.ts` | 生成渲染后端统计快照 |
| `DrawRenderBackendDebugSnapshot.ts` | 生成调试面板消费的渲染后端快照 |
| `DrawRenderBackendDebugPanelController.ts` | 管理渲染后端调试面板生命周期 |
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
| `DrawRenderBackendStatsSnapshot.ts` | `createRenderBackendStatsSnapshot(draw)` | 聚合 surface、bitmap、worker、后端和文档文本存储统计。 | `Draw.getRenderBackendStats()` |
| `DrawRenderBackendDebugSnapshot.ts` | `createRenderBackendDebugSnapshot(draw)` | 把详细统计收敛为调试面板可读结构。 | `Draw.getRenderBackendDebugSnapshot()` |
| `DrawRenderBackendDebugPanelController.ts` | `sync(payload)` / `destroy()` | 按配置创建、刷新和销毁调试面板。 | `Draw.render()`、`Draw.destroy()` |

## Draw 门面约束

- `Draw.ts` 只保留跨模块门面和生命周期入口，具体逻辑下沉到 `runtime/`、`layout/`、`render/`、`data/` 等服务。
- 新增统计、调试、布局策略时优先新增 service/policy/controller，不在 `Draw.ts` 中继续堆私有分支。
- 不在主流程保留旧字段或旧 API 兼容别名；需要升级数据时应在明确的数据导入入口完成一次性转换。

## 渲染调试数据结构

| 结构 | 字段 | 说明 |
| --- | --- | --- |
| render backend stats | `failoverCount` | 渲染后端发生降级路径切换的次数。 |
| render backend stats | `backendFailoverCountMap` | 各后端作为降级目标的次数。 |
| worker stats | `lastFailoverReason` | 最近一次 worker 渲染转入同步路径的原因。 |
| debug snapshot | `backend` / `worker` / `memory` / `image` | 调试面板展示用的聚合统计，字段只保留当前模型命名。 |
