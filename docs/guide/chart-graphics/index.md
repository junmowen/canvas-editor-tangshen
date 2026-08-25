# 图表与图形类功能模块设计

## 背景

当前编辑器已经具备文本、表格、图片、控件、公式、块级嵌入和多渲染后端等基础能力，但缺少面向医疗文书和通用报表的图表 / 图形类元素。典型缺口包括：

- 体温单
- 心电图
- 月经图
- 产程图
- 折线图
- 牙位图
- 麻醉记录曲线图

这些能力不能简单按图片处理。它们需要参与文档数据模型、编辑、命中、导出、打印、业务字段绑定和模板复用，同时还要适配现有分页、缩放、Worker snapshot 和 Canvas2D / SVG / WebGL 边界。

## 目标

第一批目标是建立统一的图表 / 图形能力模块，让不同业务图形共享模型、渲染、命中和导出基础设施。

1. 提供统一元素类型和数据模型，支持图表预设、业务数据源、样式主题和交互状态。
2. 支持医疗专用图形和通用图表共用一套坐标、网格、曲线、符号、标注、区域和图例模型。
3. 支持静态查看、模板编辑、业务数据填充和局部点位编辑。
4. 支持 Canvas 编辑区渲染、打印 / 图片导出、后续 OOXML / PDF 映射和 Worker snapshot。
5. 保持模块边界清晰，不把图表业务分支散落到 `draw`、`event`、`range` 或通用 render 管线。

## 非目标

第一批不直接实现复杂图表编辑器的全部能力：

- 不做完整 BI 图表系统。
- 不内置远程数据查询协议，只定义数据绑定输入和刷新接口。
- 不在图表内部实现自由文本排版，标注文本只做图表局部绘制。
- 不把心电图实时采集、牙科影像识别等外部专业算法纳入编辑器核心。
- 不要求第一批完成 DOCX 完整双向还原，可先输出图片 / SVG fallback。

## 总体架构

新增业务模块建议放在：

```txt
src/editor/core/modules/chart-graphics/
  README.md
  command/
  contextmenu/
  hittest/
  interaction/
  layout/
  model/
  position/
  render/
  runtime/
  selection/
  serializer/
  presets/
  utils/
```

模块职责：

| 子目录 | 职责 |
| --- | --- |
| `model/` | 图表通用模型、坐标轴、网格、序列、符号、区域、标注、牙位和医疗专用结构定义 |
| `presets/` | 体温单、心电图、月经图、产程图、折线图、牙位图、麻醉记录曲线图预设 |
| `runtime/` | 图表实例缓存、数据归一化、资源缓存、主题解析、测量缓存 |
| `layout/` | 图表元素尺寸、基线、分页策略和最小可见区域计算 |
| `render/` | Canvas2D 绘制、SVG 导出、Worker snapshot 命令构建 |
| `hittest/` | 点、线、区域、牙位、控制柄、标注和图例命中 |
| `selection/` | 图表内部选择态、点位范围、多选和活动编辑对象投影 |
| `interaction/` | 拖拽点位、编辑标注、缩放查看、牙位勾选、快捷输入 |
| `command/` | 插入图表、更新数据、套用预设、切换主题、刷新业务绑定 |
| `contextmenu/` | 图表右键菜单、点位菜单、牙位菜单和预设操作 |
| `position/` | 图表参与 positionList、浮动 / 行内定位和页面坐标换算 |
| `serializer/` | JSON schema 校验、剪贴板、导入导出和 fallback 资源生成 |

## 元素模型

建议新增元素类型：

```ts
export enum ElementType {
  // ...
  CHART_GRAPHIC = 'chartGraphic'
}
```

图表元素继续作为文档元素参与布局：

```ts
export interface IChartGraphicElement extends IElementBasic, IElementStyle {
  type: ElementType.CHART_GRAPHIC
  chartGraphic: IChartGraphic
}
```

核心模型：

```ts
export type ChartGraphicKind =
  | 'vital-signs'
  | 'ecg'
  | 'menstrual'
  | 'partogram'
  | 'line'
  | 'dental'
  | 'anesthesia'
  | 'custom'

export interface IChartGraphic {
  version: 1
  kind: ChartGraphicKind
  presetId?: string
  title?: string
  size: IChartGraphicSize
  coordinate?: IChartCoordinate
  series?: IChartSeries[]
  marks?: IChartMark[]
  regions?: IChartRegion[]
  annotations?: IChartAnnotation[]
  dental?: IDentalChartModel
  source?: IChartDataSourceBinding
  theme?: IChartGraphicTheme
  interaction?: IChartInteractionState
  fallback?: IChartFallbackResource
}
```

模型拆分原则：

1. `kind` 决定业务预设和默认渲染器。
2. `coordinate`、`series`、`marks`、`regions`、`annotations` 是通用图形骨架。
3. `dental` 只承载牙位图这种非连续坐标图形的专用模型。
4. `source` 记录外部字段绑定，不直接存远程查询逻辑。
5. `fallback` 存放 SVG / PNG 缓存，供导出、剪贴板和旧环境降级。

## 通用图形语义

通用图形层需要覆盖医疗图形中的高频结构。

| 结构 | 用途 |
| --- | --- |
| `coordinate` | 时间轴、数值轴、分类轴、牙位布局坐标和自定义网格 |
| `grid` | 主网格、次网格、心电图小格、体温单日期格、麻醉记录时间格 |
| `series` | 折线、曲线、散点、柱状、阶梯线、事件序列、区间序列 |
| `marks` | 体温点、脉搏点、呼吸点、胎心点、宫缩点、用药事件、月经符号 |
| `regions` | 经期范围、产程阶段、麻醉时段、异常区间、牙位分组 |
| `annotations` | 文本标注、箭头、阈值说明、医生备注、关键时间点 |
| `legend` | 体温 / 脉搏 / 血压等多序列图例和符号说明 |

坐标模型建议支持：

```ts
export interface IChartCoordinate {
  xAxis?: IChartAxis
  yAxis?: IChartAxis
  grid?: IChartGrid
  padding?: IChartPadding
  transform?: IChartTransform
}

export interface IChartAxis {
  type: 'time' | 'linear' | 'category' | 'ordinal'
  min?: number | string
  max?: number | string
  categories?: string[]
  tickInterval?: number
  labelFormatter?: string
  reverse?: boolean
}
```

## 功能范围矩阵

图表 / 图形模块按三层能力推进：基础对象、业务预设、专业编辑。

| 能力 | 折线图 | 体温单 | 心电图 | 月经图 | 产程图 | 牙位图 | 麻醉记录 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 插入 / 删除 / 复制 | P0 | P0 | P0 | P1 | P1 | P0 | P1 |
| 固定尺寸 / 自适应宽度 | P0 | P0 | P0 | P1 | P1 | P0 | P1 |
| Canvas 静态渲染 | P0 | P0 | P0 | P1 | P1 | P0 | P1 |
| SVG / 图片导出 | P0 | P0 | P0 | P1 | P1 | P0 | P1 |
| 数据绑定刷新 | P1 | P0 | P1 | P1 | P1 | P1 | P0 |
| 点位编辑 | P0 | P0 | P2 | P1 | P1 | 不适用 | P1 |
| 专用符号 | P1 | P0 | P1 | P1 | P0 | P0 | P0 |
| 跨页续图 | 不适用 | P0 | P2 | P2 | P1 | 不适用 | P0 |
| 高密度抽稀 | P1 | P1 | P0 | 不适用 | P1 | 不适用 | P0 |
| Worker snapshot | P1 | P1 | P1 | P2 | P2 | P1 | P1 |

优先级说明：

- `P0`：模块第一批必须覆盖，满足医疗模板可用闭环。
- `P1`：进入业务使用前需要补齐，允许在第一批后半段完成。
- `P2`：增强能力，不阻塞基础模板上线。

## 医疗图形预设清单

图表 / 图形模块不应按每一种业务图形单独拆模块。推荐做法是用统一 `chart-graphics` 内核承载预设，只有牙位图、人体部位图、烧伤面积图这类非坐标轴图形才增加专用子模型。

优先级口径：

- `P0`：医疗模板高频基础能力，第一批应进入设计和最小实现。
- `P1`：专科模板常用能力，依赖 P0 内核稳定后推进。
- `P2`：增强或专科深水区能力，可先保留 preset 入口和数据结构扩展点。

### P0 预设

| 预设 | 所属场景 | 复用能力 | 是否需要专用模型 | 说明 |
| --- | --- | --- | --- | --- |
| 体温单 | 护理文书 | 时间轴、网格、多序列、事件栏 | 否 | 第一批核心医疗网格图，验证跨页续图和固定表头 |
| 折线图 / 趋势图 | 通用报表 | 坐标轴、序列、图例、阈值 | 否 | 所有趋势类图形的基础 |
| 血糖监测曲线 | 护理 / 内分泌 | 折线图、阈值区间、事件点 | 否 | 可作为折线图医疗预设，不单独建模型 |
| 疼痛评分图 | 护理评估 | 折线图、等级轴、标注 | 否 | 0-10 分固定 y 轴，适合作为基础可编辑用例 |
| 心电图 | 检查图形 | 高密度波形、标准网格、导联布局 | 否 | 需要 waveform 序列和抽稀策略，但不必独立于图表内核 |
| 牙位图 | 口腔文书 | 图例、标注、状态渲染 | 是 | 需要牙位、牙面、牙列和编码模型 |
| 麻醉记录曲线图 | 麻醉文书 | 时间轴、多序列、事件轨道、跨页 | 否 | 验证高密度时间轴和事件轨道 |
| 检验指标趋势图 | 检验 / 病程 | 折线图、异常区间、危急值标记 | 否 | 复用通用趋势图，增加参考范围和异常点 |

### P1 预设

| 预设 | 所属场景 | 复用能力 | 是否需要专用模型 | 说明 |
| --- | --- | --- | --- | --- |
| 月经图 | 妇科文书 | 日历轴、区间、符号、备注 | 否 | 用 regions + marks 表示经期、排卵期、症状 |
| 产程图 | 产科文书 | 时间轴、双曲线、警戒线、事件 | 否 | 固定医学坐标，预设需要锁定坐标 |
| 胎心监护图 | 产科检查 | 时间轴、波形、宫缩曲线、事件 | 否 | 可复用心电图 / 麻醉曲线的高密度曲线能力 |
| 出入量统计图 | 护理文书 | 堆叠柱、折线、时间轴 | 否 | 可作为复合图表预设 |
| 用药时间轴 | 治疗记录 | 时间轴、事件、区间、标签 | 否 | 给药、停药、泵注、疗程都可映射到 mark / region |
| 输液 / 泵注记录图 | 护理 / 麻醉 | 时间轴、区间、剂量曲线 | 否 | 与麻醉用药轨道共享模型 |
| 伤口 / 压疮部位图 | 护理文书 | 部位标注、符号、备注 | 是 | 需要人体部位或局部皮肤区域模型 |
| 手术时间轴 | 手术记录 | 时间轴、事件、区间 | 否 | 适合复用通用 timeline 预设 |

### P2 预设

| 预设 | 所属场景 | 复用能力 | 是否需要专用模型 | 说明 |
| --- | --- | --- | --- | --- |
| 儿童生长发育曲线 | 儿科 | 多参考曲线、百分位、点位 | 否 | 需要内置参考曲线资源或业务侧注入 |
| 孕周 / 宫高 / 腹围趋势图 | 产科 | 折线图、参考区间、孕周轴 | 否 | 可从趋势图扩展 |
| 血气分析趋势图 | ICU / 检验 | 多序列、参考范围、危急值 | 否 | 与检验趋势图共享模型 |
| 抗菌药物疗程图 | 药学 / 感控 | 时间轴、疗程区间、事件 | 否 | 属于用药时间轴增强 |
| 人体部位图 | 病历 / 护理 | 区域、标注、状态、图例 | 是 | 可作为解剖标注图基础模型 |
| 烧伤面积图 | 急诊 / 外科 | 人体区域、面积权重、状态 | 是 | 需要区域权重和面积统计 |
| 皮肤病损分布图 | 皮肤科 | 人体区域、点位、病损类型 | 是 | 复用人体部位图模型 |
| 关节活动度图 | 康复 | 极坐标 / 角度刻度、区间 | 可选 | 可先用自定义坐标模型承载 |
| 肌力评分图 | 康复 | 等级轴、左右肢体对比 | 否 | 可作为评分趋势或人体标注增强 |
| 神经感觉分布图 | 神经内外科 | 人体区域、感觉等级、标注 | 是 | 复用人体部位图模型 |

### 预设归类

按模型复杂度归类：

| 类型 | 预设 | 模型策略 |
| --- | --- | --- |
| 趋势类 | 折线图、血糖、疼痛评分、检验趋势、血气分析、孕周趋势 | 复用 `series + coordinate + regions + marks` |
| 高密度波形类 | 心电图、胎心监护、麻醉生命体征 | 复用 `waveform series + grid + downsampling` |
| 时间轴事件类 | 用药时间轴、输液泵注、手术时间轴、麻醉事件轨道 | 复用 `marks + regions + timeline axis` |
| 医疗网格类 | 体温单、产程图、麻醉记录 | 复用 `locked coordinate + grid + repeated header + page fragment` |
| 牙科类 | 牙位图 | 使用 `dental` 专用模型 |
| 解剖标注类 | 人体部位图、伤口压疮、烧伤面积、皮肤病损、神经感觉分布 | 使用 `body-map` 专用模型 |
| 评分等级类 | 疼痛评分、肌力评分、跌倒风险、压疮风险 | 复用 ordinal / linear 轴和 mark 状态 |

### P0 落地建议

第一批不宜同时铺开所有医疗图形。建议 P0 选择 5 个样板，覆盖后续扩展需要的关键技术：

| 样板 | 覆盖能力 |
| --- | --- |
| 折线图 | 坐标轴、曲线、图例、点位编辑、通用导出 |
| 体温单 | 医疗网格、固定表头、跨页续图、多序列符号 |
| 心电图 | 标准网格、高密度波形、导联布局、峰值保留抽稀 |
| 牙位图 | 非坐标轴专用模型、区域命中、状态图例 |
| 麻醉记录曲线图 | 高密度时间轴、事件轨道、多序列和跨页 |

血糖、疼痛评分和检验趋势不单独占样板名额，作为折线图医疗预设跟随交付。上述 5 个样板稳定后，产程图、月经图、胎心监护和解剖标注图都能在同一内核上继续扩展。

## 用户入口

编辑器侧建议提供三个入口：

1. 插入菜单：`插入 -> 图表 / 图形`。
2. 右键菜单：选中图表后提供编辑数据、编辑样式、套用预设、导出图表。
3. 属性面板：在图表选中或内部编辑态展示图表配置。

插入菜单分组：

| 分组 | 选项 |
| --- | --- |
| 通用图表 | 折线图、空白自定义图 |
| 护理文书 | 体温单、月经图 |
| 产科文书 | 产程图 |
| 麻醉文书 | 麻醉记录曲线图 |
| 检查图形 | 心电图、牙位图 |

属性面板分为固定标签：

| 标签 | 内容 |
| --- | --- |
| 数据 | 序列、点位、事件、牙位状态、外部字段绑定 |
| 样式 | 主题、线型、符号、颜色、网格、字体 |
| 坐标 | 轴类型、范围、刻度、时间窗口、固定比例 |
| 预设 | 预设名称、版本、业务锁定项、默认字段 |
| 导出 | SVG / PNG fallback 状态、导出比例、打印策略 |

面板约束：

- 医疗预设中的关键坐标和比例默认锁定，只允许在模板设计模式中调整。
- 文档普通编辑模式只暴露数据录入、备注和可编辑点位。
- 表单模式下，图表内部编辑态遵循只读、必填、校验失败高亮等控件同类约束。

## 状态流转

图表元素需要区分文档对象选择态和内部业务编辑态。

```txt
idle
  -> selected
  -> resizing
  -> internal-editing
       -> point-editing
       -> region-editing
       -> annotation-editing
       -> dental-surface-editing
  -> readonly-preview
```

状态说明：

| 状态 | 触发 | 行为 |
| --- | --- | --- |
| `idle` | 未命中图表 | 正常文档编辑 |
| `selected` | 单击图表外框 | 显示边框、尺寸控制柄和右键菜单 |
| `resizing` | 拖拽控制柄 | 更新元素宽高，医疗锁定比例时等比缩放 |
| `internal-editing` | 双击图表或面板进入 | 展示内部可编辑对象命中态 |
| `point-editing` | 命中点位 | 修改数值、时间、符号、备注 |
| `region-editing` | 命中区间 | 调整开始 / 结束时间和区间类型 |
| `annotation-editing` | 命中标注 | 修改文本、锚点和箭头 |
| `dental-surface-editing` | 命中牙位 / 牙面 | 修改牙位状态和牙面状态 |
| `readonly-preview` | 只读文档或只读图表 | 允许查看和复制，不允许改写数据 |

退出规则：

- `Esc` 从内部编辑态退回 `selected`。
- 再次 `Esc` 或点击外部退回 `idle`。
- 删除键在 `selected` 删除整个图表，在内部编辑态删除当前点位 / 标注。
- 拖拽点位和尺寸调整必须进入现有历史栈，支持撤销。

## 预设设计

### 体温单

体温单不是普通曲线图，也不是插入一张图片后只能查看的静态资源。标准预设是一张可填写的医院固定表单：一次插入一个图表元素，表单内包含连续 7 天、每天 6 个时间格、体温 / 脉搏刻度、患者信息和护理记录行。体温和脉搏曲线只是在表单数据被填写后覆盖到网格上的记录结果。

模型要点：

- 标准 `medical.vitalSigns.standard` 固定为 7 天 × 6 时间格，单次插入不会生成 7 张体温单。
- 患者姓名、年龄、性别、科别、床号、入院日期、住院病历号，以及呼吸、血氧、出入量、大便、小便、体重、身高、血压均以结构化字段保存，不依赖图片文字。
- 可通过 `executeUpdateChartGraphicVitalSignsField()` 写入字段值；字段声明了推荐的 `text`、`number` 或 `date` 控件类型，宿主可以据此绑定或生成填写控件。
- 体温、脉搏和呼吸序列默认为空，只有业务填写或数据源刷新后才绘制曲线，避免插入模板时出现虚假数据。
- 显式使用 `time-window` 仅适用于业务传入的长周期记录；标准七日模板使用 `vertical-slice`，保证表单主体只插入一次。

建议预设：

```ts
presetId: 'medical.vitalSigns.standard'
kind: 'vital-signs'
```

数据样例：

```ts
{
  kind: 'vital-signs',
  presetId: 'medical.vitalSigns.standard',
  size: { width: 760, height: 920, lockAspectRatio: false },
  coordinate: {
    xAxis: { type: 'linear', min: 1, max: 42 },
    yAxis: { type: 'linear', min: 34, max: 42 },
    grid: { majorStep: 1, minorStep: 0.2 }
  },
  series: [
    {
      id: 'temperature',
      name: '体温',
      type: 'line',
      unit: 'celsius',
      symbol: 'circle',
      data: [
        { x: '2026-06-01T08:00:00', y: 36.8 },
        { x: '2026-06-01T14:00:00', y: 37.6 }
      ]
    },
    {
      id: 'pulse',
      name: '脉搏',
      type: 'line',
      unit: 'bpm',
      symbol: 'dot',
      data: [
        { x: '2026-06-01T08:00:00', y: 78 },
        { x: '2026-06-01T14:00:00', y: 88 }
      ]
    }
  ],
  marks: [
    {
      id: 'event-1',
      type: 'event',
      x: '2026-06-01T10:30:00',
      label: '入院'
    }
  ]
}
```

填写患者信息和护理记录：

```ts
editor.command.executeUpdateChartGraphicVitalSignsField(
  'vital-signs-1',
  'patient-name',
  { value: '张三' }
)

editor.command.executeUpdateChartGraphicVitalSignsField(
  'vital-signs-1',
  'footer-blood-pressure',
  { value: '120/80' }
)
```

`chartGraphic.vitalSigns.fields` 保存字段定义和值；Canvas 编辑区、SVG 打印导出和 Worker 快照都会读取同一份结构化数据。字段为空时显示下划线占位，填写后显示实际值，因此体温单始终是可再次编辑的数据模型，而不是图片。

### 心电图

心电图核心是高密度时间序列和标准网格。

模型要点：

- 支持标准纸速和增益配置，如 `25mm/s`、`10mm/mV`。
- 支持多导联分段展示。
- 支持主 / 次网格、粗线、浅色小格。
- 支持波形数据降采样、峰值保留和局部放大。
- 第一批可按静态波形渲染，不接实时采集。

当前已落地的 ECG 静态渲染能力：

- `medical.ecg.standard` 默认提供 12 导联 waveform 序列，按 3 行 x 4 列导联分区渲染。
- `ChartGraphicEcgRenderPolicy` 统一输出标准纸小格 / 大格、导联标签、`25mm/s 10mm/mV` 元信息和 `1mV` 标定脉冲。
- Canvas 编辑区、SVG 打印导出、Worker snapshot 和内部命中共用导联分区布局。
- 高密度 waveform 序列按导联绘图区宽度抽稀，每个像素列保留首点、尾点、最小值和最大值，避免 QRS 峰谷被平均抹平。

数据样例：

```ts
{
  kind: 'ecg',
  presetId: 'medical.ecg.standard',
  size: { width: 760, height: 420, lockAspectRatio: true },
  coordinate: {
    xAxis: { type: 'linear', min: 0, max: 10, tickInterval: 0.2 },
    yAxis: { type: 'linear', min: -2, max: 2, tickInterval: 0.5 },
    grid: {
      majorStep: 5,
      minorStep: 1,
      unit: 'mm',
      paperSpeed: 25,
      gain: 10
    }
  },
  series: [
    {
      id: 'lead-II',
      name: 'II',
      type: 'waveform',
      sampleRate: 500,
      dataEncoding: 'float32-delta',
      data: [0, 0.02, 0.04, 0.01]
    }
  ]
}
```

### 月经图

月经图通常是按日期展示经期、流量、症状和用药事件。

模型要点：

- 横轴按月 / 周期日展示。
- `regions` 表示经期范围、排卵期、异常出血区间。
- `marks` 表示流量等级、疼痛、体征、用药和备注。
- 支持周期对齐和多周期对比。

功能细化：

- 周期视图：按自然月或周期日展示。
- 流量标记：无、少量、中等、大量、点滴出血。
- 症状标记：腹痛、乳房胀痛、头痛、情绪、用药。
- 区间标记：经期、排卵期、异常出血。
- 数据录入：日期选择 + 快捷符号面板。

### 产程图

产程图关注时间、宫口扩张、胎头下降、宫缩、胎心等。

模型要点：

- 支持警戒线、处理线和产程阶段区域。
- 支持宫口扩张曲线、胎头下降曲线、胎心点位。
- 支持宫缩强度和持续时间标记。
- 支持破膜、用药、检查等事件标注。
- 支持模板固定坐标，不允许随内容随意缩放导致医学含义变化。

功能细化：

- 固定坐标：宫口扩张 0-10cm、胎头下降按站位或自定义刻度。
- 警戒线 / 处理线：作为 `regions` 或 `annotations` 固定渲染。
- 事件轨道：破膜、缩宫素、镇痛、检查、医嘱。
- 双曲线：宫口和胎头下降可共用时间轴，使用不同 y 轴映射。

### 折线图

折线图作为通用图表预设，服务报表、趋势和普通业务数据。

模型要点：

- 支持单 / 多序列。
- 支持时间轴、分类轴和数值轴。
- 支持图例、阈值线、点位标注。
- 支持平滑线、折线、阶梯线。

功能细化：

- 支持 `line`、`smoothLine`、`stepLine` 三种线型。
- 支持隐藏点符号，只显示 hover / 选中命中点。
- 支持阈值线和异常区间。
- 支持最小数据表编辑器，便于模板设计时手动录入样例数据。

### 牙位图

牙位图不是传统坐标轴图表，建议使用专用 `dental` 模型。

模型要点：

- 支持恒牙、乳牙和混合牙列。
- 支持 FDI、Universal、Palmer 编码。
- 支持牙面：近中、远中、颊 / 唇、舌 / 腭、咬合面。
- 支持缺失、龋坏、补牙、根管、冠、种植、松动度等状态。
- 支持单牙、牙面、象限和全口选择。

牙位模型建议：

```ts
export interface IDentalChartModel {
  notation: 'FDI' | 'Universal' | 'Palmer'
  dentition: 'permanent' | 'primary' | 'mixed'
  teeth: IDentalToothState[]
}

export interface IDentalToothState {
  code: string
  status?: DentalToothStatus[]
  mobility?: 0 | 1 | 2 | 3
  surfaces?: Partial<Record<DentalSurface, DentalSurfaceStatus[]>>
  notes?: string
}

export type DentalSurface = 'mesial' | 'distal' | 'buccal' | 'lingual' | 'occlusal'
```

交互细化：

- 单击牙冠区域选中整牙。
- 单击牙面区域选中具体牙面。
- Shift 点击支持多牙选择。
- 右键可设置缺失、龋坏、补牙、根管、冠、种植等状态。
- 状态图例可配置颜色、斜线、填充和符号。

当前已落地的牙位状态视觉规则：

| 状态 | 文案 | 底色 | 标记 |
| --- | --- | --- | --- |
| `missing` | 缺失 | 浅灰 | 红色交叉线 |
| `caries` | 龋坏 | 浅红 | 右上角红点 |
| `filled` | 充填 | 浅蓝 | 底部蓝色横条 |
| `rootCanal` | 根管 | 浅紫 | 中央紫色竖线 |
| `crown` | 冠修复 | 浅黄 | 顶部黄色横条 |
| `implant` | 种植 | 浅绿 | 绿色种植体线和圆点 |

这些状态在 Canvas 编辑区、SVG 打印导出和 Worker snapshot 中使用同一套策略，并在牙位图底部输出图例。多状态牙位按优先状态决定底色，所有状态标记叠加显示。牙冠和五牙面使用共享 Path2D / SVG path 几何；命中使用同一套牙面多边形数据，避免编辑区、导出和 Worker snapshot 的形状漂移。

### 麻醉记录曲线图

麻醉记录曲线图本质是高密度时间轴上的多序列生命体征和用药事件。

模型要点：

- 横轴按手术 / 麻醉时间连续推进。
- 支持血压、心率、血氧、呼末二氧化碳、体温等多序列。
- 支持给药、输液、插管、切皮、体位变化等事件轨道。
- 支持局部密集点位和跨页续图。
- 支持按分钟、5 分钟、15 分钟粒度切换。

功能细化：

- 生命体征轨道：血压、心率、血氧、呼末二氧化碳、体温。
- 事件轨道：入室、麻醉开始、插管、切皮、手术结束、拔管、出室。
- 用药轨道：药品名、剂量、给药时间、持续泵注区间。
- 输液轨道：液体类型、开始 / 结束、总量。
- 跨页续图：每页固定时间窗口，重复时间轴和图例。

数据样例：

```ts
{
  kind: 'anesthesia',
  presetId: 'medical.anesthesia.standard',
  coordinate: {
    xAxis: { type: 'time', tickInterval: 5 },
    yAxis: { type: 'linear', min: 0, max: 220 }
  },
  series: [
    {
      id: 'hr',
      name: '心率',
      type: 'line',
      unit: 'bpm',
      data: [
        { x: '2026-06-01T08:30:00', y: 82 },
        { x: '2026-06-01T08:35:00', y: 86 }
      ]
    },
    {
      id: 'sbp',
      name: '收缩压',
      type: 'line',
      unit: 'mmHg',
      data: [
        { x: '2026-06-01T08:30:00', y: 128 },
        { x: '2026-06-01T08:35:00', y: 122 }
      ]
    }
  ],
  marks: [
    {
      id: 'drug-1',
      type: 'medication',
      x: '2026-06-01T08:32:00',
      label: '丙泊酚 80mg'
    }
  ]
}
```

## 预设注册

预设不直接写死在渲染器中，需要通过注册表提供默认模型、样式、校验和锁定策略。

```ts
export interface IChartGraphicPreset {
  id: string
  kind: ChartGraphicKind
  name: string
  version: string
  defaultSize: IChartGraphicSize
  defaultCoordinate?: IChartCoordinate
  defaultSeries?: IChartSeries[]
  defaultTheme?: IChartGraphicTheme
  constraints?: IChartGraphicConstraints
  normalize?: (input: unknown) => Partial<IChartGraphic>
  validate?: (chart: IChartGraphic) => IChartGraphicValidationResult
}
```

图表实例会保存创建或上次升级时使用的 `presetVersion`。业务侧动态注册同 id
高版本预设后，可以先用 `getChartGraphicPresetUpgradeInfo(id)` 判断实例是否落后，再调用
`executeUpgradeChartGraphicPreset(id)` 执行保守升级。升级只吸收预设默认主题、交互、分页和
`defaultSource` 字段映射，不覆盖业务曲线、牙位状态、标记、区间和标注数据。

模板打开或上线前也可以使用 `getChartGraphicPresetUpgradeInfoList()` 审计整篇文档，再通过
`executeUpgradeChartGraphicPresets()` 批量升级所有可写且可升级的图表；只读图表、预设缺失、
类型不匹配或已是最新的实例会进入 skipped 统计。

预设约束：

```ts
export interface IChartGraphicConstraints {
  lockAspectRatio?: boolean
  lockCoordinate?: boolean
  lockGrid?: boolean
  allowPointDrag?: boolean
  allowResize?: boolean
  minWidth?: number
  minHeight?: number
  maxSeriesCount?: number
  allowedSeriesTypes?: string[]
}
```

注册入口：

```ts
ChartGraphicPresetRegistry.register({
  id: 'medical.vitalSigns.standard',
  kind: 'vital-signs',
  name: '标准体温单',
  version: '1.0.0',
  defaultSize: { width: 720, height: 520 },
  constraints: {
    lockCoordinate: true,
    allowPointDrag: true,
    allowResize: true
  }
})
```

当前实现说明：

- 当前代码通过 `registerChartGraphicPreset()` 开放业务侧预设注册，同 id 注册会临时覆盖当前版本，注销后恢复上一版本；`findChartGraphicPresetById()` 和 `resolveChartGraphicPreset()` 负责预设解析。
- 已内置预设包括：`common.line.basic`、`medical.vitalSigns.standard`、`medical.ecg.standard`、`medical.menstrual.standard`、`medical.partogram.standard`、`medical.dental.fdi`、`medical.anesthesia.standard`。
- `normalizeChartGraphic()` 会在插入、整体 patch 和套用预设时统一合并默认尺寸、坐标、主题、序列、牙位默认模型和 `presetVersion`。

## 渲染链路

图表渲染分三层：

```txt
ChartGraphicRuntime
  -> ChartGraphicLayoutPolicy
  -> ChartGraphicRenderer
       -> Canvas2DChartPainter
       -> SvgChartExporter
       -> WorkerChartSnapshotCommands
```

Canvas 编辑区：

1. `layout/` 计算图表盒模型、内容区、坐标区和图例区。
2. `render/` 在行级或块级位置绘制图表背景、网格、序列、符号、标注和选择态。
3. 高频交互态进入 overlay 绘制，避免拖拽点位时整页重排。

Worker snapshot：

1. 把图表绘制命令拆成可序列化命令。
2. 大数据序列在主线程预归一化，只传递绘制需要的点位和样式。
3. 心电图、麻醉曲线等高密度序列需要启用抽稀和峰值保留策略。

当前 Worker snapshot 已覆盖：

- 通用图表 frame / grid / title。
- `line`、`stepLine`、`scatter`、`waveform` 等序列基础绘制。
- `regions`、`marks`、`annotations`。
- 牙位图布局、牙冠 / 牙面 SVG path、牙位状态标记和状态图例。
- ECG 标准纸网格、12 导联分区裁剪、导联标签和 1mV 标定脉冲。
- 纵向 fragment 的页面级 clip + translate，以及 time-window fragment 的完整图表快照。

导出：

1. 优先输出 SVG，保留网格、线条和文本清晰度。
2. `getImage()` 走 Canvas raster 输出，作为图片导出路径。
3. 打印、PDF、图片导出和 Worker snapshot 使用同一套图表布局、fragment 和专业图形几何。
4. `fallback` 字段保留 SVG / PNG 兼容资源承载位，供剪贴板、旧环境和后续缓存策略复用。

绘制顺序：

| 顺序 | 图层 | 内容 |
| --- | --- | --- |
| 1 | background | 背景、纸张、图表外框 |
| 2 | grid | 主网格、次网格、特殊医学网格 |
| 3 | axis | 坐标轴、刻度、时间标签、单位 |
| 4 | region | 阶段区间、异常范围、经期区间 |
| 5 | series | 曲线、波形、散点、阶梯线、柱状 |
| 6 | mark | 事件、用药、符号、体征点 |
| 7 | annotation | 文本标注、箭头、说明 |
| 8 | legend | 图例、符号说明 |
| 9 | overlay | 选中态、控制柄、hover 命中 |

Worker 命令建议：

```ts
type ChartRenderCommand =
  | { type: 'chartGrid'; payload: ChartGridRenderPayload }
  | { type: 'chartAxis'; payload: ChartAxisRenderPayload }
  | { type: 'chartPolyline'; payload: ChartPolylineRenderPayload }
  | { type: 'chartSymbol'; payload: ChartSymbolRenderPayload }
  | { type: 'chartRegion'; payload: ChartRegionRenderPayload }
  | { type: 'chartText'; payload: ChartTextRenderPayload }
  | { type: 'chartDentalTooth'; payload: ChartDentalToothRenderPayload }
```

## 布局策略

图表元素默认按块级对象处理，后续可扩展行内小图。

| 场景 | 策略 |
| --- | --- |
| 普通图表 | 单个图表元素占据固定宽高，按当前行宽缩放或使用显式宽高 |
| 体温单 / 麻醉记录 | 支持跨页续图，重复表头和坐标头 |
| 心电图 | 默认不跨页切割单个导联片段，必要时按导联 / 时间窗口切片 |
| 牙位图 | 不跨页切割，空间不足时整体移至下一页 |
| 小型折线图 | 可支持行内对象，按图片元素类似策略参与行布局 |

分页建议：

- `splittable: false`：牙位图、普通小图、完整心电图卡片。
- `splittable: by-time-window`：体温单、麻醉记录、心电图长波形。
- `splittable: by-section`：产程图多区域、体温单分栏。

布局输出：

```ts
export interface IChartGraphicLayoutSnapshot {
  elementId: string
  pageNo: number
  fragmentIndex?: number
  box: DOMRect
  plotArea: DOMRect
  legendArea?: DOMRect
  axisArea?: {
    x?: DOMRect
    y?: DOMRect
  }
  timeWindow?: {
    start: string | number
    end: string | number
  }
  renderCommands: ChartRenderCommand[]
}
```

跨页规则：

1. 布局阶段先根据预设计算图表的逻辑总宽 / 总时长。
2. 若 `splittable` 为 `by-time-window`，按页面可用高度和预设时间窗口生成多个 fragment。
3. 每个 fragment 共享同一个 `pagingId`，并保留 `pagingIndex`。
4. 编辑某个 fragment 的点位时，反写逻辑图表数据，而不是只改当前分页片段。

当前实现说明：

- `ChartGraphicElementLayout.ts` 负责块级测量和超宽等比缩放，`ChartGraphicLayoutEngine.ts` 与 `ChartGraphicFragmentPolicy.ts` 负责纵向 fragment 和按横轴时间窗口生成分页片段。
- 体温单默认按 7 天窗口、麻醉记录默认按 60 分钟窗口分页；后续窗口强制从新页开始，并重复医疗表头、时间轴和事件栏。
- Canvas2D、内部命中、SVG 和 Worker snapshot 使用同一 fragment 图表快照。窗口内点位保留源序列 `dataIndex`，跨页编辑会写回逻辑图表的原始数据。

## 交互设计

第一批交互按“文档编辑器内轻量编辑”设计，不做完整制图软件。

基础交互：

- 单击选中图表。
- 双击进入图表内部编辑态。
- 拖拽控制柄调整图表尺寸。
- 右键打开图表菜单。
- 键盘删除、复制、粘贴和撤销走现有历史栈。

内部编辑态：

- 点位命中后可修改数值、时间、符号和备注。
- 曲线点可拖拽，拖拽结果反写 `series.data`。
- 牙位图可点击牙位 / 牙面切换状态。
- 医疗预设可限制坐标缩放和点位范围，避免破坏业务含义。

面板能力：

- 预设选择。
- 数据源绑定。
- 主题和线型配置。
- 坐标轴 / 网格配置。
- 医疗专用字段配置，如体温单班次、产程警戒线、麻醉事件轨道。

命中结果：

```ts
export interface IChartGraphicHitResult {
  elementId: string
  kind: ChartGraphicKind
  target:
    | 'frame'
    | 'resize-handle'
    | 'plot-area'
    | 'series-point'
    | 'series-line'
    | 'mark'
    | 'region'
    | 'annotation'
    | 'legend'
    | 'dental-tooth'
    | 'dental-surface'
  seriesId?: string
  dataIndex?: number
  markId?: string
  regionId?: string
  annotationId?: string
  toothCode?: string
  dentalSurface?: DentalSurface
  cursor?: string
}
```

交互优先级：

1. resize handle
2. annotation
3. dental surface / tooth
4. mark
5. series point
6. series line
7. region
8. legend
9. plot area / frame

这样可以避免点位、标注和网格密集时命中不稳定。

当前已落地基础 hit-test 策略：

| 图形 | 已覆盖目标 |
| --- | --- |
| 坐标图 | `annotation`、`mark`、`series-point`、`region`、`plot-area`、`frame` |
| 牙位图 | `dental-surface`、`dental-tooth`、`legend`、`frame` |

该策略已经同时提供纯几何函数和公开命令查询：

- `hitTestChartGraphic({ chart, width, height, x, y })`：图表本地坐标命中，供内部渲染 / 测试策略复用。
- `editor.command.getChartGraphicHit({ pageNo, x, y })`：文档坐标命中，返回图表元素、图表模型、本地坐标和内部目标，供事件层、右键菜单、hover 态和内部编辑态复用。

`getChartGraphicHit` 传入 `pageNo` 时 `x/y` 按页内坐标解析；不传 `pageNo` 时 `y` 按跨页文档坐标解析。

当前图表元素也已接入通用媒体 direct-hit 链路：点击图表矩形区域会进入可选中媒体态并显示 resizer。通过 resizer 改变尺寸时，元素 `width` / `height` 会同步回写到 `chartGraphic.size`，避免渲染尺寸、导出尺寸和业务模型尺寸分叉。

当前实现说明：

- 当前内核已经具备命中查询、结构化更新命令、默认的点位 / 标记 / 区间 / 标注拖拽提交，以及 `interaction.internalEditing` 状态读写命令；属性面板和 overlay 控件仍属于后续 UI 增强。
- 牙位图已通过右键菜单和命中命令支持整牙 / 牙面状态切换、清除、备注编辑，并进入历史栈，支持撤销恢复。
- 当前 hit-test 实际覆盖 `annotation`、`mark`、`series-point`、`series-line`、`region`、`plot-area`、`frame`、`dental-surface`、`dental-tooth`、`legend`；牙位图的 `dental-surface` / `dental-tooth` 命中基于共享牙冠与牙面路径几何。

## 命令与 API

当前已落地命令：

| 命令 | 作用 |
| --- | --- |
| `executeInsertChartGraphic(payload)` | 插入图表 / 图形元素 |
| `executeUpdateChartGraphic(id, patch)` | 更新图表配置或数据 |
| `executeApplyChartGraphicPreset(id, presetId)` | 将现有图表切换为指定预设默认模型；同类型切换保留 `source`，跨类型切换清理旧数据源绑定 |
| `executeUpgradeChartGraphicPreset(id)` | 将图表实例升级到当前注册表中的同 id 最新预设版本，保留业务数据并合并新增默认主题、交互、分页和数据源字段映射 |
| `executeUpgradeChartGraphicPresets()` | 批量升级文档内所有可写且可升级的图表实例，返回检查、升级、跳过和失败统计 |
| `executeUpdateChartGraphicSeries(id, seriesId, patch)` | 按序列 id 更新曲线、散点或波形数据 |
| `executeUpdateChartGraphicVitalSignsField(id, fieldId, patch)` | 更新体温单患者信息或护理记录字段；字段值以结构化数据保存 |
| `executeInsertChartGraphicSeriesPoint(id, seriesId, point)` | 在指定序列中插入单个点位 |
| `executeUpdateChartGraphicSeriesPoint(id, seriesId, dataIndex, patch)` | 更新指定序列中的单个点位 |
| `executeDeleteChartGraphicSeriesPoint(id, seriesId, dataIndex)` | 删除指定序列中的单个点位 |
| `executeUpsertChartGraphicMark(id, mark)` | 新增或更新事件 / 用药 / 警示标记 |
| `executeDeleteChartGraphicMark(id, markId)` | 删除指定标记 |
| `executeUpsertChartGraphicRegion(id, region)` | 新增或更新阶段 / 范围 / 异常区间 |
| `executeDeleteChartGraphicRegion(id, regionId)` | 删除指定区间 |
| `executeUpsertChartGraphicAnnotation(id, annotation)` | 新增或更新文字标注 |
| `executeDeleteChartGraphicAnnotation(id, annotationId)` | 删除指定文字标注 |
| `executeUpdateChartGraphicDentalTooth(id, code, patch)` | 更新指定牙位状态或备注 |
| `executeUpdateChartGraphicDentalSurface(id, code, surface, statusList)` | 更新指定牙面的状态数组；传 `null` 或空数组时删除该牙面状态 |
| `executeToggleChartGraphicDentalToothStatus(id, code, status)` | 切换指定整牙的单个状态；存在则移除，不存在则追加 |
| `executeToggleChartGraphicDentalSurfaceStatus(id, code, surface, status)` | 切换指定牙面的单个状态；存在则移除，不存在则追加 |
| `executeToggleChartGraphicDentalStatusByHit(payload)` | 按文档坐标命中牙位图后自动切换整牙或牙面的单个状态 |
| `executeClearChartGraphicDentalStatusByHit(payload)` | 按文档坐标命中牙位图后清除命中目标状态；整牙会清空整牙和牙面状态 |
| `executeInsertChartGraphicSeriesPointByHit(payload)` | 按文档坐标命中 `series-line` 后直接插入点位 |
| `executeInsertChartGraphicMarkByHit(payload)` | 按文档坐标命中 `plot-area / series-line / series-point` 后直接插入图表标记 |
| `executeInsertChartGraphicAnnotationByHit(payload)` | 按文档坐标命中 `plot-area / series-line / series-point` 后直接插入文字标注 |
| `executeUpdateChartGraphicSeriesPointByHit(payload)` | 按文档坐标命中 `series-point` 后直接更新点位 |
| `executeDeleteChartGraphicTargetByHit(payload)` | 按文档坐标命中后直接删除 `series-point / mark / region / annotation`；命中牙位图时清除对应牙位或牙面状态 |
| `executeRefreshChartGraphicSource(id, options?)` | 根据已注册 provider 和 `source` 绑定刷新图表数据；`options.preview` 允许只读预览刷新且不写入历史 |
| `executeRefreshChartGraphicSources({ sourceId?, refreshMode? }, options?)` | 批量刷新匹配条件的图表数据源，返回成功、跳过和失败的图表 id；`options.preview` 支持只读预览 |
| `executeSetChartGraphicInternalEditing(id, state)` | 设置或清除图表内部编辑态；只读图表只允许进入 `readonly-preview` |
| `executeSetChartGraphicInternalSelection(id, selection)` | 设置图表内部多选目标，覆盖点位、标记、区间、标注、整牙和牙面 |
| `executeDeleteChartGraphicInternalSelection(id)` | 删除当前图表内部多选目标；牙位目标会清空整牙或牙面状态 |
| `registerChartGraphicDataProvider(provider)` | 注册图表数据源 provider，返回取消注册函数 |
| `getChartGraphic(id)` | 读取图表完整模型 |
| `getChartGraphicInternalEditing(id)` | 读取当前图表内部编辑态 |
| `getChartGraphicInternalSelection(id)` | 读取当前图表内部多选目标 |
| `getChartGraphicSnapshot(id)` | 读取渲染归一化快照，供调试和导出 |
| `getChartGraphicValidation(id)` | 读取图表结构化校验结果，覆盖尺寸、坐标轴、序列数据、牙位状态、数据源、预设治理 / 锁定项、fallback 和性能阈值 warning |
| `getChartGraphicValidationList()` | 批量读取文档内所有图表的结构化校验结果 |
| `getChartGraphicValidationIssueList()` | 扁平读取文档内所有图表校验问题，返回带 `chartId`、图表类型、标题、预设信息和 severity 的问题列表 |
| `getChartGraphicValidationSummary()` | 读取文档级图表校验汇总，返回 `valid`、无效图表、warning 图表、issue 总数和扁平问题列表 |
| `getChartGraphicDataSourceStateList()` | 读取每个图表的数据源绑定、刷新模式、版本、最近错误和 provider 可用状态 |
| `getChartGraphicDataSourceSummary()` | 汇总已绑定、未绑定、provider 缺失、最近失败以及 `manual / on-open / on-print` 分布和对应图表 id |
| `getChartGraphicTemplateAuditSummary()` | 汇总模板发布前图表审计，组合结构校验、数据源状态和预设治理，并返回 `publishable` 与阻断原因 |
| `getChartGraphicHit(payload)` | 按文档坐标读取图表内部命中目标 |
| `getChartGraphicPresetCompatibility(presetId, host)` | 检查预设声明的最低 / 最高宿主版本和所需能力是否满足 |
| `getChartGraphicPresetUpgradeInfo(id)` | 查询图表实例记录的 `presetVersion` 是否落后于当前注册表中的最新预设 |
| `getChartGraphicPresetUpgradeInfoList()` | 批量查询文档内所有图表实例的预设升级状态，供模板治理和上线审计使用 |

插入示例：

```ts
editor.command.executeInsertChartGraphic({
  kind: 'line',
  presetId: 'common.line.basic',
  width: 520,
  height: 260,
  series: [
    {
      id: 'temperature',
      name: '体温',
      type: 'line',
      data: [
        { x: '2026-06-01 08:00', y: 36.8 },
        { x: '2026-06-01 12:00', y: 37.2 }
      ]
    }
  ]
})
```

更新序列数据示例：

```ts
editor.command.executeUpdateChartGraphicSeries('chart-1', 'hr', {
  data: [
    { x: '2026-06-01T08:30:00', y: 82 },
    { x: '2026-06-01T08:35:00', y: 86 },
    { x: '2026-06-01T08:40:00', y: 91 }
  ]
})
```

更新标记、区间和文字标注示例：

```ts
editor.command.executeUpsertChartGraphicMark('chart-1', {
  id: 'drug-1',
  type: 'medication',
  x: '2026-06-01T08:32:00',
  y: 120,
  label: '丙泊酚 80mg'
})

editor.command.executeUpsertChartGraphicRegion('chart-1', {
  id: 'active-phase',
  type: 'phase',
  xStart: 4,
  xEnd: 10,
  yStart: 0,
  yEnd: 10,
  label: '活跃期'
})

editor.command.executeUpsertChartGraphicAnnotation('chart-1', {
  id: 'note-1',
  x: 6,
  y: 8,
  text: '复查胎心'
})
```

更新牙位状态示例：

```ts
editor.command.executeUpdateChartGraphicDentalTooth('dental-1', '18', {
  status: ['missing', 'implant'],
  notes: '种植修复'
})

editor.command.executeUpdateChartGraphicDentalSurface(
  'dental-1',
  '18',
  'occlusal',
  ['filled']
)

editor.command.executeToggleChartGraphicDentalSurfaceStatus(
  'dental-1',
  '18',
  'occlusal',
  'filled'
)

editor.command.executeToggleChartGraphicDentalStatusByHit({
  pageNo: 0,
  x: 120,
  y: 240,
  status: 'filled'
})
```

查询命中目标示例：

```ts
const hit = editor.command.getChartGraphicHit({
  pageNo: 0,
  x: 120,
  y: 240
})

if (hit?.hit.target === 'dental-tooth') {
  editor.command.executeUpdateChartGraphicDentalTooth(
    hit.elementId!,
    hit.hit.toothCode!,
    { status: ['caries'] }
  )
}
```

注册 provider 并刷新数据示例：

```ts
const unregister = editor.command.registerChartGraphicDataProvider({
  sourceId: 'ward-vitals',
  async load(payload) {
    return {
      series: [
        {
          id: 'temperature',
          name: '体温',
          type: 'line',
          data: [
            { x: '2026-06-08T08:00:00', y: 36.8 },
            { x: '2026-06-08T12:00:00', y: 37.2 }
          ]
        }
      ],
      source: {
        ...payload.source,
        version: '2026-06-08T12:00:00'
      }
    }
  }
})

await editor.command.executeRefreshChartGraphicSource('chart-1')
unregister()
```

批量刷新示例：

```ts
await editor.command.executeRefreshChartGraphicSources({
  refreshMode: 'on-print'
})
```

该命令既可由调用方手动触发，也已接入当前打开与打印 / PDF 导出链路：`executeSetValue()` / 文档打开后会自动触发一次 `refreshMode: 'on-open'` 的批量刷新，且不写入撤销历史；如果 provider 在文档设值后才注册，`registerChartGraphicDataProvider()` 会补刷匹配 `sourceId` 的 `on-open` 图表；`getPdfBlob()` 和 `executePrint()` 会在生成打印载荷前自动触发一次 `refreshMode: 'on-print'` 的批量刷新。未绑定 `source`、`sourceId` 不匹配、`refreshMode` 不匹配或缺少 provider 的图表会进入 `skippedChartIds`；provider 抛错或返回无法写回的 patch 会进入 `failedChartIds`。

局部 patch 示例：

```ts
editor.command.executeUpdateChartGraphic('chart-1', {
  theme: {
    palette: ['#1f77b4', '#d62728'],
    fontFamily: 'Microsoft YaHei'
  },
  interaction: {
    readonly: false,
    activeSeriesId: 'hr'
  }
})
```

命令约束：

- 命令层负责合并 preset 默认值、生成 id、校验尺寸和写入历史。
- 业务 provider 注入的数据必须先归一化，再写入文档模型。
- `executeUpdateChartGraphic` 只接受结构化 patch，不接受任意函数。
- 如果 patch 触发预设锁定项变更，需要返回失败或要求模板设计模式。

## 数据绑定

图表数据源绑定只保存描述，不直接耦合业务服务：

```ts
export interface IChartDataSourceBinding {
  sourceId?: string
  fieldMap?: Record<string, string>
  fieldTransforms?: Record<string, IChartDataSourceFieldTransform>
  mergeStrategy?: 'replace' | 'append' | 'merge'
  refreshMode?: 'manual' | 'on-open' | 'on-print'
  version?: string
  lastRefreshAt?: string
  lastSuccessAt?: string
  refreshDurationMs?: number
  lastError?: string
}

export interface IChartDataSourceFieldTransform {
  trim?: boolean
  emptyAs?: number
  unit?:
    | 'fahrenheit-to-celsius'
    | 'celsius-to-fahrenheit'
    | 'mgdl-to-mmol-l'
    | 'mmol-l-to-mgdl'
  scale?: number
  offset?: number
  precision?: number
}
```

刷新流程：

1. 业务侧通过 API 注入数据或注册 provider。
2. `executeRefreshChartGraphicSource(id)` 根据 `chart.source.sourceId` 查找 provider。
3. provider 可直接返回结构化 patch，也可返回 `records` 并交给命令层按 `fieldMap` 归一化。
4. patch 写入 `series`、`marks`、`regions`、`annotations`、`dental` 或 `source.version`。
5. 触发图表重绘和历史记录。

模板预设可声明 `defaultSource`，实例插入时会与业务传入的 `source` 合并；`fieldMap` 会按字段级合并，便于模板保存通用字段语义，业务侧只覆盖实际字段名或版本。手动 `executeUpdateChartGraphic` 仍遵守 `interaction.coordinateLocked`，但 provider 刷新允许更新锁定坐标，用于模板根据外部数据批次切换时间窗或量程。

`source.mergeStrategy` 可声明默认写回策略，provider 单次返回的 `strategy` 优先级更高：

| 策略 | 行为 |
| --- | --- |
| `replace` | 默认值；按原有语义整段替换 provider 返回的 `series / marks / regions / annotations` |
| `append` | 同 id 序列追加点位，新增序列追加到末尾；标记、区间和标注按返回顺序追加 |
| `merge` | 同 id 序列合并，点位对象按 `x` 覆盖或追加，波形 `number[]` 追加；标记、区间和标注按 `id` upsert |

当前 `executeSetValue()` / 文档打开后会自动触发一次 `refreshMode: 'on-open'` 的批量刷新，刷新结果写回图表模型但不写入撤销历史；如果 provider 在设值之后才注册，注册时会补刷同 `sourceId` 的 `on-open` 图表。需要等待数据刷新完成时可调用 `executeSetValueAsync()`，其 Promise 返回批量刷新结果；精确恢复离线快照时可传 `{ isRefreshChartGraphicOnOpen: false }` 关闭自动刷新。`getPdfBlob()` 和 `executePrint()` 会在生成打印载荷前自动触发一次 `refreshMode: 'on-print'` 的批量刷新。

同一图表并发触发多次刷新时，命令层按图表 id 维护刷新序列，只允许最新请求写回模型。
旧请求在 provider 返回后会被跳过，不覆盖新数据、不写入 `lastError`；在批量刷新结果中计入
`skippedChartIds`，单图刷新 API 则返回 `false`。

只读或打印预览场景可调用：

```ts
await editor.command.executeRefreshChartGraphicSource('chart-1', {
  preview: true
})

await editor.command.executeRefreshChartGraphicSources(
  { sourceId: 'patient-vitals' },
  { preview: true }
)
```

preview 刷新允许绕过只读模式下的命令禁用，并强制不写入撤销历史；未传
`preview: true` 时，现有只读拦截和普通刷新历史语义保持不变。

刷新生命周期可通过事件总线订阅：

```ts
const handleRefresh = event => {
  if (event.phase === 'before') {
    showLoading(event.chartId)
  }
  if (event.phase === 'error') {
    showError(event.chartId, event.error)
  }
  if (event.phase === 'complete') {
    hideLoading(event.chartId)
  }
}

editor.eventBus.on('chartGraphicDataSourceRefresh', handleRefresh)
```

事件 `phase` 包括 `before`、`success`、`error`、`skipped` 和 `complete`。
payload 会携带 `chartId`、`sourceId`、`refreshMode`、`version`、`status`、
`reason`、`error`、`refreshDurationMs`、`cached` 和 `preview` 等字段，便于业务侧接入
loading、埋点、错误提示和发布审计面板联动。provider 缺失会发出
`skipped -> complete`，provider 抛错会发出 `before -> error -> complete`。

数据源刷新对幂等结果做了缓存：同一 `chartId`、`sourceId`、`version`、
`fieldMap`、`fieldTransforms`、`mergeStrategy` 和图表类型一致时，`replace` 会直接
复用缓存；`merge` 只在序列点位与标记 / 区间 / 标注都是幂等写回时缓存。
`append` 和 `preview: true` 不缓存，避免重复追加或影响只读预览的临时刷新语义。

数据源审计可在文档打开后、打印前或模板发布检查中直接读取，不会触发 provider、
修改图表或写入历史：

```ts
const states = editor.command.getChartGraphicDataSourceStateList()
const summary = editor.command.getChartGraphicDataSourceSummary()

if (summary.providerMissing || summary.failed) {
  console.warn({
    providerMissingChartIds: summary.providerMissingChartIds,
    failedChartIds: summary.failedChartIds
  })
}
```

`bound` 表示图表声明了非空 `sourceId`；`providerMissing` 只统计已绑定但当前未注册
匹配 provider 的图表；`failed` 根据持久化的 `source.lastError` 统计最近刷新失败，
因此可与 provider 当前是否已恢复独立观察。`attempted`、`succeeded` 和
`neverRefreshed` 分别统计至少尝试过刷新、至少成功刷新过一次、已绑定但从未尝试刷新的
图表。`states[].refreshable` 仅表示当前绑定和 provider 均可用，不代表已经执行刷新。

模板发布前可以使用统一审计入口：

```ts
const audit = editor.command.getChartGraphicTemplateAuditSummary()

if (!audit.publishable) {
  console.warn(audit.blockingReasons, audit.blockingChartIds)
}
```

`getChartGraphicTemplateAuditSummary()` 不会触发 provider、不修改图表、不写入历史。
它把 `getChartGraphicValidationSummary()`、`getChartGraphicDataSourceSummary()` 和
`getChartGraphicPresetUpgradeInfoList()` 组合成发布视角结果。以下情况会让
`publishable` 变为 `false`：

- 存在图表校验 error。
- 已绑定数据源但缺少 provider。
- 最近一次数据源刷新失败。
- 已绑定数据源但从未执行过刷新。
- 图表实例引用的预设缺失。
- 图表实例引用的预设与当前图表类型不匹配。

普通校验 warning、静态未绑定图表和可升级预设会进入 `warnings`，不直接阻断发布。

Provider 接口：

```ts
export interface IChartGraphicDataProvider {
  sourceId: string
  load(
    payload: IChartGraphicDataLoadPayload
  ): IChartGraphicDataResult | Promise<IChartGraphicDataResult>
}

export interface IChartGraphicDataLoadPayload {
  chartId: string
  kind: ChartGraphicKind
  chart: IChartGraphic
  source: IChartDataSourceBinding
  fieldMap?: Record<string, string>
  fieldTransforms?: Record<string, IChartDataSourceFieldTransform>
  mergeStrategy?: 'replace' | 'append' | 'merge'
}

export interface IChartGraphicDataResult {
  strategy?: 'replace' | 'append' | 'merge'
  title?: string
  size?: IChartGraphicSize
  coordinate?: IChartCoordinate
  series?: IChartSeries[]
  records?: Record<string, unknown>[]
  fieldMap?: Record<string, string>
  fieldTransforms?: Record<string, IChartDataSourceFieldTransform>
  marks?: IChartMark[]
  regions?: IChartRegion[]
  annotations?: IChartAnnotation[]
  dental?: IDentalChartModel
  source?: IChartDataSourceBinding
  theme?: IChartGraphicTheme
  interaction?: IChartInteractionState
  fallback?: IChartFallbackResource
}
```

`records` 映射规则：

- `x`、`y` 同时存在时生成 `series`；`y` 可写成逗号分隔字段列表，一次生成多序列。
- `seriesId`、`seriesName`、`label` 为可选字段；多序列时会优先复用同 id 或同名的模板序列样式。
- `markX` 或 `markLabel` 存在时生成 `marks`；`markY`、`markType`、`markId` 为可选字段。
- `regionXStart` / `regionXEnd` / `regionLabel` 可生成 `regions`；`regionYStart`、`regionYEnd`、`regionType`、`regionId`、`regionColor` 为可选字段。
- `annotationText` 可生成 `annotations`；`annotationX`、`annotationY`、`annotationId` 为可选字段。
- `fieldTransforms` 可用 fieldMap 映射键或真实业务字段名作为 key；执行顺序为 trim、空值替换、单位转换、scale、offset、precision。
- 内置单位转换包括华氏 / 摄氏互转，以及血糖 `mg/dL` 和 `mmol/L` 互转。
- provider 已显式返回 `series` 或 `marks` 时，显式结构优先。
- 默认写回策略为 `replace`；`append` 适合实时采样追加，`merge` 适合同一时间点或同 id 业务事件的增量修正。
- 每次实际调用 provider 都会写入 `source.lastRefreshAt` 和 `source.refreshDurationMs`。
- 刷新成功会写入 `source.lastSuccessAt`、合并 `source` 并清除 `source.lastError`。
- provider 抛错时保留旧图和上一次 `lastSuccessAt`，写入 `source.lastError`，校验命令返回 `chart.source.lastError` warning。
- 生命周期字段属于图表模型，会随 `getValue()` 和文档序列化保存，供打开后、打印前和模板发布审计使用。

数据绑定错误处理：

| 错误 | 行为 |
| --- | --- |
| provider 未注册 | 保留旧数据，刷新命令返回失败或批量 skipped |
| 字段缺失 | 缺失序列不渲染，校验结果返回 `chart.source.fieldMapIncomplete` warning |
| 数据越界 | 按预设策略截断、标红或拒绝写入 |
| 刷新失败 | 不清空旧图，写入 `source.lastError` 并允许手动重试 |
| 只读文档 | 允许临时预览刷新，不写入历史和文档数据 |

## 性能策略

高密度图形必须避免每次编辑都全量重绘。

| 风险 | 策略 |
| --- | --- |
| 心电图点位过多 | 按像素列抽稀，保留最小值 / 最大值 / 首尾点 |
| 麻醉记录多序列密集 | 分层绘制：网格缓存、曲线层、事件层、交互 overlay |
| 体温单跨页 | 按页和时间窗口缓存 layout snapshot |
| 牙位图多状态 | 预编译牙位路径，状态变化只重绘命中牙位区域 |
| 导出慢 | SVG 路径合并，Canvas fallback 使用缓存位图 |

缓存分层：

- `gridCache`：网格、轴线、固定表头。
- `seriesCache`：归一化后的屏幕点位。
- `symbolCache`：医疗符号和牙位路径。
- `fallbackCache`：导出用 SVG / PNG。

抽稀策略：

```txt
原始数据 -> 按时间窗口裁剪 -> 按像素列聚合 -> 保留 min/max/first/last -> 生成屏幕点位
```

当前已落地基础抽稀策略：

- `ChartGraphicSeriesPointPolicy` 统一负责序列点位归一化和抽稀。
- `bar` 序列默认不启用抽稀，避免柱体被按像素列合并后丢失分组宽度语义。
- `waveform` 序列在原始点数超过绘图区宽度 2 倍时启用抽稀。
- 普通序列在原始点数超过绘图区宽度 4 倍时启用抽稀。
- 每个横向像素列保留首点、尾点、最小 y 点和最大 y 点，避免心电图、胎心监护、麻醉曲线丢峰。
- Canvas2D 行级渲染、SVG 打印导出和 Worker snapshot 共用该策略。
- 心电图按导联分区后的绘图区宽度计算抽稀阈值，12 导联布局下每个导联独立保留峰谷。

抽稀约束：

- 折线图可以按视觉点位抽稀。
- 心电图必须保留峰值，不能只取平均值。
- 麻醉记录需要保留事件点和用药点，不随曲线抽稀丢弃。
- 后续内部选择态落地后，用户选中的点位必须强制保留。

## 与现有模块的边界

| 现有模块 | 关系 |
| --- | --- |
| `image/` | 图表不能退化成图片；只在导出和剪贴板 fallback 时复用图片能力 |
| `block/` | SVG block 可作为降级宿主，但图表主模型不放在 block 内 |
| `table/` | 体温单看起来像表格，但医学网格和曲线绘制独立，不复用表格单元格模型 |
| `control/` | 图表可绑定控件值，但图表内部点位不是表单控件 |
| `render-backend/` | 图表需要新增 worker snapshot 命令和 Canvas2D fallback |
| `command/` | 通过命令适配层暴露插入、更新和读取能力 |
| `event/` | 只分发图表命中后的交互入口，不承载图表业务判断 |

## 序列化与兼容

图表模型需要版本号：

```ts
version: 1
```

兼容策略：

1. 新字段必须可选，旧文档打开时使用 preset 默认值补齐。
2. 预设升级不能直接改写用户文档，只有用户套用新版预设时才更新。
3. 不认识的 `kind` 使用 `fallback` 渲染，并保留原始数据。
4. 剪贴板优先复制完整图表 payload，外部粘贴降级为 SVG / PNG。

剪贴板格式：

| MIME | 内容 |
| --- | --- |
| `data-ce-chart-graphic-payload` | HTML / SVG data 属性中的完整 `IChartGraphicElement` payload |
| `image/svg+xml` | SVG fallback |
| `image/png` | PNG fallback |
| `text/plain` | 图表标题或简短摘要 |

导入优先级：

1. 识别 HTML / SVG 中的 `data-ce-chart-graphic-payload`，恢复为 `CHART_GRAPHIC`。
2. 识别 SVG fallback 中的 `data-chart-graphic` 元数据，保留降级入口。
3. 不能恢复时按图片或 SVG block 插入。

## 校验规则

图表校验分为结构校验、预设校验和业务校验。

| 校验 | 示例 |
| --- | --- |
| 结构校验 | `kind` 必填，`size.width` / `size.height` 必须大于 0 |
| 预设校验 | 体温单坐标不能被普通编辑模式改写 |
| 数据校验 | 体温值超出预设范围时标记异常或拒绝 |
| 性能校验 | 心电图原始点位超过阈值时必须启用抽稀 |
| 导出校验 | fallback 缺失时导出前必须重新生成 |

当前 fallback 校验按 warning 输出：已声明 `fallback` 但没有可用 SVG/PNG 时返回
`chart.fallback.empty`；SVG fallback 缺少 `data-ce-chart-graphic-payload` 或
`data-chart-graphic` 元数据时返回 `chart.fallback.svgMetadataMissing`；PNG fallback
不是 `data:image/png` 数据地址时返回 `chart.fallback.pngInvalid`；未知 `kind` 且没有
fallback 时返回 `chart.fallback.missingForUnsupportedKind`。标准图表未缓存 fallback
不会报警，因为当前 Canvas / SVG / Worker 链路可以实时生成导出内容。

性能阈值校验同样按 warning 输出，不阻断编辑：单序列点位超过 30000 返回
`chart.performance.seriesPointCountHigh`；图表总点位超过 80000 返回
`chart.performance.totalPointCountHigh`；渲染面积超过 2000000 像素返回
`chart.performance.renderAreaLarge`；`time-window` 预计片段超过 24 个返回
`chart.performance.timeWindowFragmentCountHigh`；`time-window.windowSize` 缺失或不大于 0
返回 `chart.performance.timeWindowSizeInvalid`；纵向分页图表高度超过 6000 返回
`chart.performance.verticalSliceTall`。

预设锁定项校验用于模板发布巡检：当当前注册预设声明
`defaultInteraction.coordinateLocked` 且实例仍处于 `coordinateLocked` 时，如果实例坐标
已偏离预设默认坐标，返回 `chart.preset.lockedCoordinateChanged`。当预设
`defaultSize.lockAspectRatio` 为 true 时，实例关闭 `lockAspectRatio` 会返回
`chart.preset.lockedAspectRatioDisabled`，尺寸比例偏离预设比例会返回
`chart.preset.lockedAspectRatioChanged`。

校验结果：

```ts
export interface IChartGraphicValidationResult {
  valid: boolean
  errors?: IChartGraphicValidationIssue[]
  warnings?: IChartGraphicValidationIssue[]
}

export interface IChartGraphicValidationIssue {
  code: string
  message: string
  path?: string
  severity: 'error' | 'warning'
}
```

当前已落地 `getChartGraphicValidation(id)`、`getChartGraphicValidationList()`、
`getChartGraphicValidationIssueList()` 和 `getChartGraphicValidationSummary()` 只读查询命令。
`valid` 只受 `errors` 影响；`warnings` 表示仍可渲染但建议业务侧在保存、刷新数据源或
导出前提示用户。`getChartGraphicValidationIssueList()` 会把所有图表问题扁平化，并附带
`chartId`、图表类型、标题、预设信息和 severity，便于问题面板、保存前弹窗和定位功能直接消费。
当前校验覆盖：

- 图表类型、尺寸和绘图区尺寸。
- 坐标轴 `min` / `max` 可转换性和顺序。
- 序列 id 唯一性、类型支持、data 数组和有效点位数量。
- 高密度波形采样信息提示。
- 牙位图 dental 模型、牙位编码重复、FDI 恒牙编码范围和状态枚举。
- 数据源刷新失败和字段映射缺口 warning。
- 预设缺失、预设类型不匹配、实例版本落后或高于当前注册表版本 warning。
- 第一批医疗业务范围 warning：体温、经量等级、宫口扩张、麻醉心率和收缩压。

## 测试计划

单元测试：

- 坐标换算、网格 tick 计算、点位抽稀。
- 医疗符号归一化。
- 牙位编码和牙面命中。
- 预设默认值合并。
- 序列化版本兼容。

Cypress 回归：

- 插入各类图表后页面非空白。
- 缩放、分页、连续页和打印预览渲染一致。
- 图表选中、拖拽尺寸、内部点位编辑。
- 牙位图点击牙位和撤销恢复。
- 体温单 / 麻醉记录跨页续图。
- 心电图高密度数据渲染性能和像素非空。

导出回归：

- `getImage()` 输出图表并通过 PNG 非空像素校验。
- SVG 打印输出图表节点、区间、标记、标注、牙位状态和图例。
- PDF blob 支持 ASCII 图表 SVG 烟测。
- fallback PNG 可用。
- 后续 OOXML 输出不丢失图表占位。

验收用例清单：

| 用例 | 输入 | 预期 |
| --- | --- | --- |
| 插入折线图 | 两条序列、10 个点 | 页面显示坐标、图例、折线和点位 |
| 拖拽折线点 | 修改一个点 y 值 | 数据反写、撤销后恢复 |
| 插入体温单 | 7 天体温、脉搏、事件 | 网格、曲线、事件栏正确显示 |
| 体温单跨页 | 超过单页时间窗口 | 分页片段重复表头，数据连续 |
| 插入牙位图 | FDI 恒牙 | 32 颗牙布局正确 |
| 编辑牙面 | 设置 16 近中龋坏 | 仅对应牙面状态变化 |
| 插入心电图 | 500Hz 波形 | 网格清晰、波形非空、峰值保留 |
| 插入麻醉记录 | 2 小时生命体征和用药 | 时间轴、曲线、事件轨道正确 |
| 只读预览 | 图表 readonly | 可选中查看，不可拖拽修改 |
| 导出图片 | 包含图表的文档 | 图表在导出图中非空且比例一致 |
| 导出 PDF | ASCII 图表打印 SVG | 生成 `application/pdf` blob 且以 `%PDF` 开头 |

## 当前实现映射（2026-08）

下表用于把本文的设计口径和仓库里的真实代码位置对齐，后续继续推进时优先以这里为准：

| 主题 | 当前代码位置 | 当前状态 |
| --- | --- | --- |
| 元素类型与模型 | `src/editor/dataset/enum/Element.ts`、`src/editor/core/modules/chart-graphics/model/ChartGraphic.ts`、`src/editor/interface/Element.ts` | 已落地 `ElementType.CHART_GRAPHIC`、`IChartGraphic` 和图表元素挂载字段 |
| 预设与归一化 | `src/editor/core/modules/chart-graphics/presets/ChartGraphicPreset.ts`、`src/editor/core/modules/chart-graphics/presets/index.ts` | 已内置 8 个预设，具备独立预设模块出口，并支持业务侧动态注册、同 id 临时覆盖、注销恢复、基础结构校验、kind 一致性回退、宿主版本 / 能力兼容查询和实例预设版本升级治理 |
| 插入与 patch 命令 | `src/editor/core/modules/chart-graphics/command/ChartGraphicCommandPolicy.ts`、`src/editor/core/command/Command.ts`、`src/editor/core/command/CommandAdaptMedia.ts` | 已支持插入、整体 patch、切换预设、更新序列 / 标记 / 区间 / 标注 / 牙位，以及设值后的 `on-open` 自动刷新 |
| 布局测量 | `src/editor/core/modules/chart-graphics/layout/ChartGraphicElementLayout.ts`、`src/editor/core/modules/chart-graphics/layout/ChartGraphicLayoutEngine.ts`、`src/editor/core/modules/chart-graphics/layout/ChartGraphicFragmentPolicy.ts` | 已支持块级测量、超宽等比缩放、超高图表纵向 fragment，以及体温单 / 麻醉记录按时间窗口跨页续图 |
| Canvas 编辑区渲染 | `src/editor/core/modules/chart-graphics/render/ChartGraphicRowRenderer.ts` | 已支持 frame、grid、regions、line / stepLine / scatter / waveform / bar、marks、annotations、牙位图和图例 |
| 点位抽稀 | `src/editor/core/modules/chart-graphics/render/ChartGraphicSeriesPointPolicy.ts` | 已落地峰值保留抽稀，Canvas2D、SVG 打印和 Worker snapshot 共用 |
| 心电图渲染 | `src/editor/core/modules/chart-graphics/render/ChartGraphicEcgRenderPolicy.ts`、`src/editor/core/modules/chart-graphics/presets/ChartGraphicPreset.ts` | 已支持 12 导联 ECG 预设、标准纸网格、导联分区、1mV 标定脉冲、高密度抽稀、Canvas / SVG / Worker 和内部命中 |
| 内部命中 | `src/editor/core/modules/chart-graphics/hittest/ChartGraphicHitTest.ts`、`src/editor/core/command/CommandAdaptQuery.ts` | 已支持本地坐标命中和文档坐标命令查询，覆盖点位 / 标记 / 区间 / 标注 / 牙位 / 图例 |
| 内部编辑态 | `src/editor/core/modules/chart-graphics/model/ChartGraphic.ts`、`src/editor/core/command/CommandAdaptMedia.ts` | 已支持 `interaction.internalEditing` 读写、内部多选目标、批量删除、目标有效性检查和只读预览约束 |
| 默认内部拖拽 | `src/editor/core/modules/chart-graphics/interaction/ChartGraphicDragInteraction.ts`、`src/editor/core/event/pointer/PointerSession.ts` | 已支持 `series-point / mark / region / annotation` 拖拽预览和 `mouseup` 单步历史提交，`readonly` 图表仍阻止改写 |
| 校验与快照 | `src/editor/core/modules/chart-graphics/model/ChartGraphicValidationPolicy.ts`、`src/editor/core/modules/chart-graphics/runtime/ChartGraphicSnapshotPolicy.ts` | 已支持单图和文档级结构化校验、数据源 warning、预设治理 / 锁定项 warning、fallback warning、性能阈值 warning、医疗业务范围 warning 和归一化快照读取 |
| Worker snapshot | `src/editor/core/modules/chart-graphics/render/ChartGraphicWorkerSnapshotPolicy.ts`、`src/editor/core/render-backend/worker/WorkerRenderProtocol.ts` | 已输出后台绘制命令，覆盖坐标图、牙位图、ECG、纵向 fragment、time-window fragment、内部 clip 平移和 OffscreenCanvas 路径绘制 |
| 打印 / 图片导出 | `src/editor/core/modules/chart-graphics/render/ChartGraphicSvgExporter.ts`、`src/editor/utils/print/svg/inline.ts`、`src/editor/core/command/CommandAdaptQuery.ts` | 已接入 SVG 打印、PDF、`getImage()` raster 导出、纵向 fragment clip、ECG 导联 clip、时间窗口快照和 PDF 导出前 `on-print` 刷新 |
| 剪贴板恢复 | `src/editor/core/modules/chart-graphics/serializer/ChartGraphicClipboardSerializer.ts`、`src/editor/utils/elementDom.ts`、`src/editor/core/modules/chart-graphics/render/ChartGraphicSvgExporter.ts` | 已在复制 HTML 和打印 SVG 中写入 `data-ce-chart-graphic-payload`，粘贴 HTML / SVG 时可恢复为 `CHART_GRAPHIC` 元素 |
| Demo 入口 | `src/app/toolbar.ts` | 已提供“插入图表”下拉，可直接插入 8 个预设 |
| 回归测试 | `cypress/e2e/chart-graphics/chart-graphics.cy.ts` | 已覆盖插入、patch、预设切换、provider 刷新、命中、校验、Worker、打印 PDF，以及医疗图表时间窗口跨页和后续窗口编辑 |
| CG-00 收口 | 模型、预设、命令、序列化、Demo | 已完成；预设 / payload / 查询结果互相隔离，覆盖 `getValue -> JSON -> setValue` 往返，并具备单图与文档级 `presetVersion` 升级治理 |

## 当前差距

- 预设层已支持动态注册、同 id 覆盖、注销恢复和宿主兼容查询；自动迁移旧版本文档仍属于后续能力。
- 已落地纵向跨页和医疗时间窗口续图；跨页 fragment 的增量缓存、窗口懒渲染和更复杂的业务表头配置仍可继续增强。
- 已内建 `series-point / mark / region / annotation` 的默认拖拽编辑、内部编辑态命令和内部目标批量选择 / 删除；overlay 控件仍未实现。
- 牙位图已落地共享牙冠 / 牙面 Path2D 几何、命中、菜单编辑、撤销、Canvas / SVG / Worker 导出；后续可继续增强多牙选择、象限批量操作和更贴近真实牙体外形的专业图形资源。
- 设计文中的完整 `ChartGraphicRuntime`、`ChartGraphicLayoutPolicy` 抽象仍属于后续目标；当前运行态策略已按 `runtime/` 分层落地，布局能力已由 `layout/` 下的元素测量、fragment policy 和 layout engine 承载。

## 推进阶段

| 阶段 | 范围 | 验收 |
| --- | --- | --- |
| CG-00 | 模型、预设接口、模块目录和命令草案 | **100% 已完成**：可插入最小折线图、动态注册预设、查询 / 执行单图与批量预设版本升级，并完成 JSON 序列化往返 |
| CG-01 | Canvas2D 通用图表渲染和命中 | **100% 已完成**：通用坐标、网格、折线 / 平滑线 / 阶梯线 / 散点 / 柱状、符号和图例可渲染并命中，尺寸与点位编辑支持撤销 |
| CG-02 | 医疗预设第一批 | **100% 已完成**：体温单医疗网格与事件栏、产程图固定坐标/警戒线/双曲线、麻醉记录事件轨道，以及按时间窗口重复表头跨页续图可用 |
| CG-03 | 牙位图专用模型和交互 | **100% 已完成**：FDI 牙位模型、牙冠 / 牙面 Path2D 几何、整牙 / 牙面命中、状态菜单、撤销和导出可用 |
| CG-04 | 心电图高密度渲染 | **100% 已完成**：12 导联布局、标准纸网格、标定脉冲、峰值保留抽稀、Canvas / SVG / Worker 导出和命中可用 |
| CG-05 | Worker snapshot 和导出收口 | **100% 已完成**：Canvas / SVG / PDF / 图片导出 / Worker snapshot 共用布局快照，纵向 fragment、time-window、牙位 path 和 ECG 导联 clip 一致 |
| CG-06 | 数据绑定和模板化 | **100% 已完成**：模板默认数据源、provider records 映射、锁定模板刷新和失败校验提示可用 |

## 实现任务拆分

CG-00 任务：

- [x] 新增 `ElementType.CHART_GRAPHIC` 和公开接口类型。
- [x] 建立 `chart-graphics/model`、`presets`、`command`、`render` 基础目录。
- [x] 实现预设注册表和默认折线图预设。
- [x] 接入插入命令和 JSON 序列化。
- [x] 增加最小 demo 菜单入口。

CG-01 任务：

- [x] 实现通用坐标、网格、折线、平滑线、阶梯线、散点、柱状、符号和图例绘制。
- [x] 实现图表外框命中、尺寸拖拽和删除 / 撤销。
- [x] 实现点位命中和点位拖拽。
- [x] 补 Cypress 非空渲染、通用图形命中和点位编辑回归。

CG-02 任务：

- [x] 实现体温单预设、多序列医疗符号和护理事件栏。
- [x] 实现产程图固定坐标、警戒线、处理线和双曲线。
- [x] 实现麻醉记录基础时间轴、生命体征曲线和麻醉事件轨道。
- [x] 建立按横轴时间窗口分页、重复表头和跨后端共享的 layout snapshot。

CG-03 任务：

- [x] 实现牙位模型和 FDI 布局。
- [x] 实现牙位 / 牙面 Path2D 生成和命中。
- [x] 实现牙位状态菜单、图例和撤销。
- [x] 补牙位图导出和回归。

CG-04 任务：

- [x] 实现心电图标准网格、导联布局和波形绘制。
- [x] 实现高密度点位抽稀和峰值保留。
- [x] 建立性能基线，避免大数据输入阻塞当前页交互。

CG-05 任务：

- [x] 图表 render command 接入 Worker snapshot。
- [x] 实现 SVG exporter 和图片 raster 导出。
- [x] 打印、图片导出和编辑区共用 layout snapshot。

CG-06 任务：

- [x] 实现数据 provider 注册和刷新命令。
- [x] 接入模板设计模式中的预设锁定策略。
- [x] 增加业务字段映射、校验失败提示和刷新失败提示。

## 风险与约束

| 风险 | 应对 |
| --- | --- |
| 医疗图形含义被自由编辑破坏 | 预设可声明锁定坐标、固定比例、合法范围和只读字段 |
| 图表模型膨胀 | 通用模型只保留几何和绘制语义，业务专用字段放到 preset / extension |
| 心电图性能不足 | 先做静态快照、抽稀和分段渲染，实时能力不进第一批 |
| 体温单被误做成表格 | 数据和绘制按图表模型处理，只在视觉上模拟表格网格 |
| 导出不一致 | 编辑区、打印、图片导出共用 layout snapshot |
| 与现有图片 / block 能力冲突 | 图表使用独立 `ElementType.CHART_GRAPHIC`，fallback 才进入图片 / SVG block 路径 |

## 结束定义

第一批图表 / 图形模块达到可进入业务模板的标准：

1. 支持插入、选中、删除、复制、撤销和序列化。
2. 折线图、体温单、牙位图至少完成可编辑闭环。
3. 心电图和麻醉记录至少完成静态渲染、导出和性能基线。
4. 图表渲染不破坏现有文本、表格、图片和控件回归。
5. 文档站提供模型、命令、预设和测试入口说明。
