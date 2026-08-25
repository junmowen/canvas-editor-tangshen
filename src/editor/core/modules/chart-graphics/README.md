# chart-graphics 模块

`chart-graphics/` 承载图表和医疗图形类元素的模型、命令、布局和渲染能力。

CG-00/CG-01/CG-02/CG-03/CG-04/CG-05/CG-06 已完成：

- `ElementType.CHART_GRAPHIC`
- 公开 `IChartGraphic` 模型
- 折线图、体温单、心电图、月经图、产程图、牙位图和麻醉记录基础预设
- 插入命令、整体更新命令和图表内部数据更新命令
- 套用预设命令，可将现有图表切换为预设默认模型
- 开放式预设注册表，支持业务侧动态注册、临时覆盖和恢复图表预设
- 预设宿主版本 / 能力兼容查询，支持模板上线前检查能力依赖
- 图表实例记录 `presetVersion`，支持查询是否落后于当前预设，并支持单图或整篇文档批量保守升级
- 独立 `presets/` 模块出口，统一承载内置预设和注册表边界
- 图表模型实例、注册预设和公开查询结果深克隆隔离
- `getValue -> JSON -> setValue` 图表模型序列化往返
- HTML / SVG 剪贴板 fallback payload 恢复，可从 `data-ce-chart-graphic-payload` 还原图表元素
- `interaction.internalEditing` 内部编辑态读写命令，覆盖点位、标记、区间、标注、牙位、内部多选和只读预览
- 数据源 provider 注册、单图手动刷新和按 `sourceId` / `refreshMode` 批量刷新命令
- 模板 `defaultSource`、业务 `fieldMap` 合并，以及 provider `records` 到多 `series` / `marks` / `regions` / `annotations` 的标准映射
- 数据源 `fieldTransforms` 支持 records 映射前的 trim、单位转换、scale / offset、precision 和空值替换
- 数据源刷新支持 `replace / append / merge` 写回策略，覆盖实时追加和按 id / x 增量修正
- 版本化数据源支持幂等 provider 结果缓存，减少 on-open / on-print 重复拉取
- 刷新失败写入 `source.lastError`，校验命令输出数据绑定 warning
- 刷新生命周期写入 `source.lastRefreshAt / lastSuccessAt / refreshDurationMs`，支持成功率和耗时审计
- 数据源刷新通过 `chartGraphicDataSourceRefresh` 事件暴露 before / success / error / skipped / complete 生命周期
- 同一图表并发刷新只允许最新请求写回，旧请求返回后按 skipped 处理，避免慢请求覆盖新数据
- 文档级数据源审计，汇总绑定、provider 缺失、最近失败和刷新模式分布
- 模板发布前统一审计，组合结构校验、数据源状态和预设治理，并返回 `publishable` 阻断结果
- provider 刷新可更新模板锁定坐标，人工 patch 继续受 `coordinateLocked` 保护
- `executeSetValue` / 文档打开后自动触发 `refreshMode: 'on-open'` 图表刷新，且不写入撤销历史；provider 后注册时会补刷匹配 `sourceId` 的 on-open 图表
- `executeSetValueAsync` 可等待 on-open 刷新完成并返回批量刷新结果；`isRefreshChartGraphicOnOpen: false` 可关闭自动刷新
- 单图和批量数据刷新支持 `{ preview: true }`，允许只读模式临时刷新并且不写入撤销历史
- PDF 导出和浏览器打印前自动触发 `refreshMode: 'on-print'` 图表刷新
- 块级测量
- Canvas2D 行级渲染，包含网格、折线、平滑线、阶梯线、散点、柱状、点符号、区间、事件标记和文字标注
- 平滑线 Canvas / SVG 几何与命中共用三次贝塞尔策略
- 体温单多序列医疗网格、护理事件栏和按 7 日窗口跨页续图
- 产程图锁定医学坐标、警戒线、处理线和双曲线
- 麻醉记录生命体征曲线、事件轨道和按 60 分钟窗口跨页续图
- time-window fragment 在 Canvas、命中、SVG 和 Worker 间共用窗口 snapshot
- 高密度序列点位归一化和峰值保留抽稀，Canvas2D、SVG 打印和 Worker snapshot 共用
- 心电图 12 导联布局、标准纸网格、导联标签、1mV 标定脉冲和按导联分区的高密度波形渲染
- 牙位图 FDI 布局、牙冠 / 牙面 Path2D 几何、牙位状态渲染和状态图例
- 坐标图和牙位图内部 hit-test 策略，覆盖点位、事件标记、区间、文字标注、牙位、牙面和图例
- 坐标图点位、事件标记、区间和文字标注拖拽编辑，释放时单步提交历史
- 坐标图和牙位图内部目标批量选择 / 删除，牙位目标支持清空整牙或单个牙面状态
- 牙位图右键菜单状态切换、清除、备注编辑和撤销恢复
- 文档坐标命中查询命令，支持业务侧从页内坐标定位图表内部对象
- 通用媒体 direct-hit 选中和 resizer 尺寸同步，resize 后保持元素宽高与 `chartGraphic.size` 一致
- 结构化校验命令，覆盖尺寸、坐标轴、序列数据、牙位状态、数据源 warning、预设治理 / 锁定项 warning、fallback warning、性能阈值 warning 和第一批医疗业务范围 warning
- SVG 打印、`getImage()` 图片导出、PDF blob、纵向 fragment clip、time-window 快照和 ECG 导联 clip，供打印和导出链路复用
- Worker snapshot 命令输出，支持坐标图、牙位图、ECG、医疗时间窗口、纵向 fragment 和后台 OffscreenCanvas 路径绘制

已暴露命令：

- `executeInsertChartGraphic`
- `executeUpdateChartGraphic`
- `executeApplyChartGraphicPreset`
- `executeUpgradeChartGraphicPreset`
- `executeUpgradeChartGraphicPresets`
- `executeUpdateChartGraphicSeries`
- `executeInsertChartGraphicSeriesPoint`
- `executeUpdateChartGraphicSeriesPoint`
- `executeDeleteChartGraphicSeriesPoint`
- `executeUpsertChartGraphicMark`
- `executeDeleteChartGraphicMark`
- `executeUpsertChartGraphicRegion`
- `executeDeleteChartGraphicRegion`
- `executeUpsertChartGraphicAnnotation`
- `executeDeleteChartGraphicAnnotation`
- `executeUpdateChartGraphicDentalTooth`
- `executeUpdateChartGraphicDentalSurface`
- `executeToggleChartGraphicDentalToothStatus`
- `executeToggleChartGraphicDentalSurfaceStatus`
- `executeToggleChartGraphicDentalStatusByHit`
- `executeClearChartGraphicDentalStatusByHit`
- `executeInsertChartGraphicMarkByHit`
- `executeInsertChartGraphicAnnotationByHit`
- `executeInsertChartGraphicSeriesPointByHit`
- `executeUpdateChartGraphicSeriesPointByHit`
- `executeDeleteChartGraphicTargetByHit`
- `executeSetChartGraphicInternalEditing`
- `executeSetChartGraphicInternalSelection`
- `executeDeleteChartGraphicInternalSelection`
- `registerChartGraphicPreset`
- `executeRefreshChartGraphicSource`
- `executeRefreshChartGraphicSources`
- `registerChartGraphicDataProvider`
- `getChartGraphic`
- `getChartGraphicPresetList`
- `getChartGraphicPresetCompatibility`
- `getChartGraphicPresetUpgradeInfo`
- `getChartGraphicPresetUpgradeInfoList`
- `getChartGraphicSnapshot`
- `getChartGraphicInternalEditing`
- `getChartGraphicInternalSelection`
- `getChartGraphicValidation`
- `getChartGraphicValidationList`
- `getChartGraphicValidationIssueList`
- `getChartGraphicValidationSummary`
- `getChartGraphicDataSourceStateList`
- `getChartGraphicDataSourceSummary`
- `getChartGraphicHit`

后续专科交互、命中、导出和 Worker snapshot 都应继续复用这个模块，不再散落到图片、block 或表格分支。

目录实现说明：

- `model/ChartGraphic.ts`：图表公开模型和模块内规范来源。
- `presets/ChartGraphicPreset.ts`：内置预设、注册表、归一化和版本治理。
- `runtime/`：数据绑定、数据合并和渲染快照。
- `interaction/`、`selection/`、`position/`、`utils/`：分别承载交互、内部选择、文档位置和模块工具策略。
- `render/ChartGraphicSvgExporter.ts`：图表 SVG 导出实现。
