/** 图表图形类型，决定预设、数据归一化和默认渲染策略。 */
export type ChartGraphicKind =
  | 'vital-signs'
  | 'ecg'
  | 'menstrual'
  | 'partogram'
  | 'line'
  | 'dental'
  | 'anesthesia'
  | 'custom'

/** 图表尺寸配置，使用编辑器内部像素单位。 */
export interface IChartGraphicSize {
  /** 宽度尺寸。 */
  width: number
  /** 高度尺寸。 */
  height: number
  /** 是否锁定宽高比。 */
  lockAspectRatio?: boolean
}

/** 图表坐标轴配置。 */
export interface IChartAxis {
  /** 坐标轴类型。 */
  type: 'time' | 'linear' | 'category' | 'ordinal'
  /** 最小值。 */
  min?: number | string
  /** 最大值。 */
  max?: number | string
  /** 分类轴标签。 */
  categories?: string[]
  /** 刻度间隔。 */
  tickInterval?: number
  /** 是否反向。 */
  reverse?: boolean
}

/** 图表网格配置。 */
export interface IChartGrid {
  /** 主网格间距。 */
  majorStep?: number
  /** 次网格间距。 */
  minorStep?: number
  /** 网格单位。 */
  unit?: string
  /** 纸速，心电图等波形图使用。 */
  paperSpeed?: number
  /** 增益，心电图等波形图使用。 */
  gain?: number
}

/** 图表内边距。 */
export interface IChartPadding {
  /** 上边距。 */
  top?: number
  /** 右边距。 */
  right?: number
  /** 下边距。 */
  bottom?: number
  /** 左边距。 */
  left?: number
}

/** 图表坐标配置。 */
export interface IChartCoordinate {
  /** 横轴配置。 */
  xAxis?: IChartAxis
  /** 纵轴配置。 */
  yAxis?: IChartAxis
  /** 网格配置。 */
  grid?: IChartGrid
  /** 绘图区内边距。 */
  padding?: IChartPadding
}

/** 图表数据点。 */
export interface IChartDataPoint {
  /** 横轴值。 */
  x: number | string
  /** 纵轴值。 */
  y: number
  /** 点位标签。 */
  label?: string
}

/** 单个序列点位的更新 patch。 */
export type ChartGraphicSeriesPointPatch = number | Partial<IChartDataPoint>

/** 图表序列。 */
export interface IChartSeries {
  /** 序列标识。 */
  id: string
  /** 序列名称。 */
  name?: string
  /** 序列类型。 */
  type: 'line' | 'smoothLine' | 'stepLine' | 'waveform' | 'scatter' | 'bar'
  /** 单位。 */
  unit?: string
  /** 点位符号。 */
  symbol?: 'circle' | 'dot' | 'square' | 'triangle' | 'none'
  /** 序列颜色。 */
  color?: string
  /** 采样率，高密度波形使用。 */
  sampleRate?: number
  /** 数据点。 */
  data: IChartDataPoint[] | number[]
}

/** 图表事件标记。 */
export interface IChartMark {
  /** 标记标识。 */
  id: string
  /** 标记类型。 */
  type: 'event' | 'medication' | 'warning' | 'custom'
  /** 横轴位置。 */
  x?: number | string
  /** 纵轴位置。 */
  y?: number
  /** 标记文本。 */
  label?: string
}

/** 图表区间标记。 */
export interface IChartRegion {
  /** 区间标识。 */
  id: string
  /** 区间类型。 */
  type: 'range' | 'phase' | 'warning' | 'custom'
  /** 横轴起点。 */
  xStart?: number | string
  /** 横轴终点。 */
  xEnd?: number | string
  /** 纵轴起点。 */
  yStart?: number
  /** 纵轴终点。 */
  yEnd?: number
  /** 区间文本。 */
  label?: string
  /** 区间颜色。 */
  color?: string
}

/** 图表文字标注。 */
export interface IChartAnnotation {
  /** 标注标识。 */
  id: string
  /** 横轴位置。 */
  x?: number | string
  /** 纵轴位置。 */
  y?: number
  /** 标注文本。 */
  text: string
}

/** 图表主题配置。 */
export interface IChartGraphicTheme {
  /** 颜色列表。 */
  palette?: string[]
  /** 字体。 */
  fontFamily?: string
  /** 文本颜色。 */
  textColor?: string
  /** 网格颜色。 */
  gridColor?: string
  /** 背景色。 */
  backgroundColor?: string
}

/** 图表分页策略。 */
export interface IChartGraphicPagination {
  /** 纵向裁切或按横轴窗口续图。 */
  mode: 'vertical-slice' | 'time-window'
  /** time-window 模式下每个片段覆盖的横轴跨度。 */
  windowSize?: number
  /** 后续片段是否强制从新页开始。 */
  pageBreakBetweenFragments?: boolean
  /** 每个片段重复绘制的医疗表头高度。 */
  repeatedHeaderHeight?: number
  /** 医疗事件轨道高度。 */
  eventTrackHeight?: number
}

/** 图表跨页片段描述，保留完整图表模型并声明当前可见窗口。 */
/** 体温单可填写字段。 */
export interface IChartVitalSignsField {
  /** 字段标识。 */
  id: string
  /** 字段标签。 */
  label: string
  /** 当前填写值。 */
  value?: string
  /** 空值时显示的占位文字。 */
  placeholder?: string
  /** 字段所在区域。 */
  section: 'patient' | 'footer'
  /** footer 区域行号。 */
  rowIndex?: number
  /** 推荐控件类型，供宿主生成文本 / 数值 / 日期控件。 */
  controlType?: 'text' | 'number' | 'date'
}
/** 医院体温单的固定版式配置。 */
export interface IChartVitalSignsLayout {
  /** 横向日期数量，标准模板为 7 天。 */
  dayCount: number
  /** 每天的时间格数量，标准模板为 6 格。 */
  slotsPerDay: number
  /** 日期表头文字。 */
  dayLabels: string[]
  /** 每天重复显示的时间文字。 */
  timeLabels: string[]
  /** 体温刻度，按摄氏度显示。 */
  temperatureTicks: number[]
  /** 脉搏刻度，和体温网格共用纵坐标。 */
  pulseTicks: number[]
  /** 底部护理记录行。 */
  footerRows: Array<{ label: string; unit?: string }>
  /** 是否显示患者信息表头。 */
  showPatientHeader?: boolean
  /** 可填写的患者和底部记录字段。 */
  fields?: IChartVitalSignsField[]
}
export interface IChartGraphicFragmentDescriptor {
  /** 当前片段在逻辑图表中的顺序。 */
  fragmentIndex: number
  /** 完整图表宽度，使用当前布局后的渲染尺寸。 */
  fullWidth: number
  /** 完整图表高度，使用当前布局后的渲染尺寸。 */
  fullHeight: number
  /** 当前片段在完整图表中的纵向起点。 */
  offsetY: number
  /** 当前片段的可见高度。 */
  fragmentHeight: number
  /** 当前片段使用的分页模式。 */
  mode?: IChartGraphicPagination['mode']
  /** time-window 片段的横轴起点。 */
  xMin?: number
  /** time-window 片段的横轴终点。 */
  xMax?: number
  /** 是否重复医疗表头。 */
  repeatedHeader?: boolean
  /** 逻辑图表的片段总数。 */
  fragmentCount?: number
  /** 当前片段前是否强制分页。 */
  pageBreakBefore?: boolean
}

/** 图表预设定义。 */
export interface IChartGraphicPreset {
  /** 预设标识。 */
  id: string
  /** 图表类型。 */
  kind: ChartGraphicKind
  /** 预设名称。 */
  name: string
  /** 预设版本。 */
  version: string
  /** 默认尺寸。 */
  defaultSize: IChartGraphicSize
  /** 默认坐标。 */
  defaultCoordinate?: IChartCoordinate
  /** 默认序列。 */
  defaultSeries?: IChartSeries[]
  /** 默认事件标记。 */
  defaultMarks?: IChartMark[]
  /** 默认区间标记。 */
  defaultRegions?: IChartRegion[]
  /** 默认主题。 */
  defaultTheme?: IChartGraphicTheme
  /** 默认交互约束。 */
  defaultInteraction?: IChartInteractionState
  /** 默认分页策略。 */
  defaultPagination?: IChartGraphicPagination
  /** 体温单默认固定版式。 */
  vitalSigns?: IChartVitalSignsLayout
  /** 默认数据源绑定，供模板预设声明业务字段映射。 */
  defaultSource?: IChartDataSourceBinding
  /** 预设要求的宿主版本和能力声明。 */
  compatibility?: IChartGraphicPresetCompatibility
}

/** 取消图表预设注册。 */
export type ChartGraphicPresetUnregister = () => void

/** 图表预设兼容性声明。 */
export interface IChartGraphicPresetCompatibility {
  /** 最低宿主版本，使用 semver 数字段比较。 */
  minHostVersion?: string
  /** 最高宿主版本，使用 semver 数字段比较。 */
  maxHostVersion?: string
  /** 预设要求宿主提供的能力标识。 */
  requiredFeatures?: string[]
}

/** 图表预设兼容性查询上下文。 */
export interface IChartGraphicPresetCompatibilityHost {
  /** 当前宿主版本。 */
  version?: string
  /** 当前宿主可用能力标识。 */
  features?: string[]
}

/** 图表预设兼容性查询结果。 */
export interface IChartGraphicPresetCompatibilityResult {
  /** 预设是否存在且满足宿主约束。 */
  compatible: boolean
  /** 预设是否存在。 */
  presetFound: boolean
  /** 预设标识。 */
  presetId?: string
  /** 预设版本。 */
  presetVersion?: string
  /** 兼容性 warning 编码。 */
  warnings?: string[]
}

/** 图表实例相对当前预设注册表的升级状态。 */
export interface IChartGraphicPresetUpgradeInfo {
  /** 图表元素标识；批量审计时返回。 */
  chartId?: string
  /** 当前图表是否可以升级到注册表中的最新预设版本。 */
  upgradable: boolean
  /** 预设是否存在。 */
  presetFound: boolean
  /** 当前图表类型是否与预设类型一致。 */
  kindMatched: boolean
  /** 预设标识。 */
  presetId?: string
  /** 图表实例记录的预设版本。 */
  currentVersion?: string
  /** 当前注册表中的预设版本。 */
  latestVersion?: string
  /** 升级状态 warning 编码。 */
  warnings?: string[]
}

/** 批量升级图表预设版本的执行结果。 */
export interface IChartGraphicPresetUpgradeResult {
  /** 检查过的图表数量。 */
  checked: number
  /** 成功升级数量。 */
  upgraded: number
  /** 跳过数量，包括已是最新、预设缺失、类型不匹配、只读或无可用 patch。 */
  skipped: number
  /** 升级失败数量。 */
  failed: number
  /** 成功升级的图表 id。 */
  upgradedChartIds: string[]
  /** 跳过的图表 id。 */
  skippedChartIds: string[]
  /** 升级失败的图表 id。 */
  failedChartIds: string[]
  /** 批量执行前的升级审计结果。 */
  infos: IChartGraphicPresetUpgradeInfo[]
}

/** 图表数据源写回策略。 */
export type ChartGraphicDataMergeStrategy = 'replace' | 'append' | 'merge'

/** 图表数据源绑定配置。 */
export interface IChartDataSourceBinding {
  /** 外部数据源标识。 */
  sourceId?: string
  /** 字段映射。 */
  fieldMap?: Record<string, string>
  /** 字段转换配置，key 可使用 fieldMap 映射键或真实业务字段名。 */
  fieldTransforms?: Record<string, IChartDataSourceFieldTransform>
  /** 默认写回策略；replace 为整段替换，append 追加数据，merge 按 id/x upsert。 */
  mergeStrategy?: ChartGraphicDataMergeStrategy
  /** 刷新模式。 */
  refreshMode?: 'manual' | 'on-open' | 'on-print'
  /** 数据版本。 */
  version?: string
  /** 最近一次发起刷新尝试的时间，使用 ISO 8601 字符串。 */
  lastRefreshAt?: string
  /** 最近一次成功刷新的时间，使用 ISO 8601 字符串。 */
  lastSuccessAt?: string
  /** 最近一次刷新耗时，单位毫秒。 */
  refreshDurationMs?: number
  /** 最近一次刷新错误，供业务侧保存前提示。 */
  lastError?: string
}

/** 图表数据源字段转换配置。 */
export interface IChartDataSourceFieldTransform {
  /** 是否在解析前裁剪字符串首尾空白。 */
  trim?: boolean
  /** 空值按指定数值写入；未设置时空值会被跳过。 */
  emptyAs?: number
  /** 常用单位转换。 */
  unit?:
    | 'fahrenheit-to-celsius'
    | 'celsius-to-fahrenheit'
    | 'mgdl-to-mmol-l'
    | 'mmol-l-to-mgdl'
  /** 数值乘数，在 unit 转换后应用。 */
  scale?: number
  /** 数值偏移，在 scale 后应用。 */
  offset?: number
  /** 数值小数位数。 */
  precision?: number
}

/** 图表数据源加载上下文。 */
export interface IChartGraphicDataLoadPayload {
  /** 图表元素标识。 */
  chartId: string
  /** 当前图表类型。 */
  kind: ChartGraphicKind
  /** 当前图表完整模型快照。 */
  chart: IChartGraphic
  /** 当前数据源绑定配置。 */
  source: IChartDataSourceBinding
  /** 字段映射快捷入口，等同于 source.fieldMap。 */
  fieldMap?: Record<string, string>
  /** 字段转换快捷入口，等同于 source.fieldTransforms。 */
  fieldTransforms?: Record<string, IChartDataSourceFieldTransform>
  /** 默认写回策略，等同于 source.mergeStrategy。 */
  mergeStrategy?: ChartGraphicDataMergeStrategy
}

/** 图表数据源加载结果，按结构化 patch 写回图表模型。 */
export interface IChartGraphicDataResult {
  /** 本次写回策略；未传时使用 source.mergeStrategy，默认 replace。 */
  strategy?: ChartGraphicDataMergeStrategy
  /** 原始业务记录；未显式返回 series 时可按 fieldMap 自动归一化为序列。 */
  records?: Record<string, unknown>[]
  /** 字段映射覆盖；未传时使用 source.fieldMap。 */
  fieldMap?: Record<string, string>
  /** 字段转换覆盖；未传时使用 source.fieldTransforms。 */
  fieldTransforms?: Record<string, IChartDataSourceFieldTransform>
  /** 标题。 */
  title?: string
  /** 尺寸。 */
  size?: IChartGraphicSize
  /** 坐标配置。 */
  coordinate?: IChartCoordinate
  /** 数据序列。 */
  series?: IChartSeries[]
  /** 事件标记。 */
  marks?: IChartMark[]
  /** 区间标记。 */
  regions?: IChartRegion[]
  /** 文字标注。 */
  annotations?: IChartAnnotation[]
  /** 牙位图专用模型。 */
  dental?: IDentalChartModel
  /** 外部数据源，可用于回写数据版本。 */
  source?: IChartDataSourceBinding
  /** 主题。 */
  theme?: IChartGraphicTheme
  /** 交互状态。 */
  interaction?: IChartInteractionState
  /** fallback 资源。 */
  fallback?: IChartFallbackResource
  /** 体温单专用固定版式。 */
  vitalSigns?: IChartVitalSignsLayout
  /** 分页策略。 */
  pagination?: IChartGraphicPagination
}

/** 图表数据源 provider。 */
export interface IChartGraphicDataProvider {
  /** 外部数据源标识，对应 chart.source.sourceId。 */
  sourceId: string
  /** 加载图表数据，返回结构化 patch。 */
  load(
    payload: IChartGraphicDataLoadPayload
  ): IChartGraphicDataResult | Promise<IChartGraphicDataResult>
}

/** 取消图表数据源 provider 注册。 */
export type ChartGraphicDataProviderUnregister = () => void

/** 批量刷新图表数据源的过滤条件。 */
export interface IRefreshChartGraphicSourcesPayload {
  /** 仅刷新指定 sourceId 的图表。 */
  sourceId?: string
  /** 仅刷新指定模式的图表。 */
  refreshMode?: IChartDataSourceBinding['refreshMode']
}

/** 图表数据源刷新执行选项。 */
export interface IRefreshChartGraphicSourceOption {
  /** 是否按临时预览刷新执行；允许只读模式并且不写入撤销历史。 */
  preview?: boolean
}

/** 批量刷新图表数据源的执行结果。 */
export interface IRefreshChartGraphicSourcesResult {
  /** 成功刷新数量。 */
  refreshed: number
  /** 跳过数量。 */
  skipped: number
  /** 失败数量。 */
  failed: number
  /** 成功刷新的图表 id。 */
  refreshedChartIds: string[]
  /** 被跳过的图表 id。 */
  skippedChartIds: string[]
  /** 刷新失败的图表 id。 */
  failedChartIds: string[]
}

/** 单个图表的数据源绑定与 provider 可用状态。 */
export interface IChartGraphicDataSourceState {
  /** 图表元素标识。 */
  chartId?: string
  /** 图表类型。 */
  kind: ChartGraphicKind
  /** 图表标题。 */
  title?: string
  /** 是否声明了 sourceId。 */
  bound: boolean
  /** 数据源标识。 */
  sourceId?: string
  /** 刷新模式。 */
  refreshMode?: IChartDataSourceBinding['refreshMode']
  /** 数据版本。 */
  version?: string
  /** 最近一次发起刷新尝试的时间。 */
  lastRefreshAt?: string
  /** 最近一次成功刷新的时间。 */
  lastSuccessAt?: string
  /** 最近一次刷新耗时，单位毫秒。 */
  refreshDurationMs?: number
  /** 最近一次刷新错误。 */
  lastError?: string
  /** 当前是否已注册匹配 provider。 */
  providerRegistered: boolean
  /** 当前是否具备可执行刷新的绑定和 provider。 */
  refreshable: boolean
}

/** 文档级图表数据源状态汇总。 */
export interface IChartGraphicDataSourceSummary {
  /** 检查过的图表数量。 */
  checked: number
  /** 已声明 sourceId 的图表数量。 */
  bound: number
  /** 未声明 sourceId 的图表数量。 */
  unbound: number
  /** 缺少匹配 provider 的图表数量。 */
  providerMissing: number
  /** 存在最近刷新错误的图表数量。 */
  failed: number
  /** 至少执行过一次刷新尝试的图表数量。 */
  attempted: number
  /** 至少成功刷新过一次的图表数量。 */
  succeeded: number
  /** 已绑定但从未执行刷新尝试的图表数量。 */
  neverRefreshed: number
  /** manual 刷新图表数量。 */
  manual: number
  /** on-open 刷新图表数量。 */
  onOpen: number
  /** on-print 刷新图表数量。 */
  onPrint: number
  /** 未绑定图表 id。 */
  unboundChartIds: string[]
  /** 缺少 provider 的图表 id。 */
  providerMissingChartIds: string[]
  /** 存在最近刷新错误的图表 id。 */
  failedChartIds: string[]
  /** 至少执行过一次刷新尝试的图表 id。 */
  attemptedChartIds: string[]
  /** 至少成功刷新过一次的图表 id。 */
  succeededChartIds: string[]
  /** 已绑定但从未执行刷新尝试的图表 id。 */
  neverRefreshedChartIds: string[]
  /** manual 刷新图表 id。 */
  manualChartIds: string[]
  /** on-open 刷新图表 id。 */
  onOpenChartIds: string[]
  /** on-print 刷新图表 id。 */
  onPrintChartIds: string[]
  /** 每个图表的数据源状态。 */
  states: IChartGraphicDataSourceState[]
}

export type ChartGraphicTemplateAuditReason =
  | 'chart.validation.error'
  | 'chart.validation.warning'
  | 'chart.source.providerMissing'
  | 'chart.source.refreshFailed'
  | 'chart.source.neverRefreshed'
  | 'chart.source.unbound'
  | 'chart.preset.missing'
  | 'chart.preset.kindMismatch'
  | 'chart.preset.upgradable'

export type ChartGraphicDataSourceRefreshPhase =
  | 'before'
  | 'success'
  | 'error'
  | 'skipped'
  | 'complete'

export type ChartGraphicDataSourceRefreshStatus =
  | 'refreshed'
  | 'failed'
  | 'skipped'

export type ChartGraphicDataSourceRefreshSkipReason =
  | 'source-missing'
  | 'provider-missing'
  | 'stale'
  | 'empty-result'
  | 'apply-failed'
  | 'provider-error'

export type ChartGraphicDataSourceRefreshReason =
  | ChartGraphicDataSourceRefreshSkipReason
  | 'cache-hit'

/** 图表数据源刷新生命周期事件。 */
export interface IChartGraphicDataSourceRefreshEvent {
  /** 生命周期阶段。 */
  phase: ChartGraphicDataSourceRefreshPhase
  /** 图表元素标识。 */
  chartId?: string
  /** 图表类型。 */
  kind?: ChartGraphicKind
  /** 图表标题。 */
  title?: string
  /** 数据源标识。 */
  sourceId?: string
  /** 刷新模式。 */
  refreshMode?: IChartDataSourceBinding['refreshMode']
  /** 刷新前或刷新后的数据版本。 */
  version?: string
  /** 本次刷新状态，complete 阶段一定返回。 */
  status?: ChartGraphicDataSourceRefreshStatus
  /** 跳过、失败或缓存命中原因。 */
  reason?: ChartGraphicDataSourceRefreshReason
  /** 错误信息。 */
  error?: string
  /** 刷新开始时间，ISO 8601 字符串。 */
  refreshStartedAt?: string
  /** 刷新结束时间，ISO 8601 字符串。 */
  refreshEndedAt?: string
  /** 刷新耗时，单位毫秒。 */
  refreshDurationMs?: number
  /** 是否使用了数据源缓存。 */
  cached?: boolean
  /** 是否为只读预览刷新。 */
  preview?: boolean
}

/** 文档级图表预设治理审计汇总。 */
export interface IChartGraphicTemplatePresetAuditSummary {
  /** 检查过的图表数量。 */
  checked: number
  /** 可升级的图表数量。 */
  upgradable: number
  /** 预设缺失的图表数量。 */
  missing: number
  /** 预设类型不匹配的图表数量。 */
  kindMismatch: number
  /** 有预设治理 warning 的图表数量。 */
  warned: number
  /** 可升级图表 id。 */
  upgradableChartIds: string[]
  /** 预设缺失图表 id。 */
  missingChartIds: string[]
  /** 预设类型不匹配图表 id。 */
  kindMismatchChartIds: string[]
  /** 有预设治理 warning 的图表 id。 */
  warningChartIds: string[]
  /** 每个图表的预设升级审计结果。 */
  infos: IChartGraphicPresetUpgradeInfo[]
}

/** 图表模板发布前审计汇总。 */
export interface IChartGraphicTemplateAuditSummary {
  /** 是否可发布；只受 blockingReasons 影响。 */
  publishable: boolean
  /** 检查过的图表数量。 */
  checked: number
  /** 机器可读阻断原因。 */
  blockingReasons: ChartGraphicTemplateAuditReason[]
  /** 机器可读非阻断提示。 */
  warnings: ChartGraphicTemplateAuditReason[]
  /** 涉及阻断项的图表 id。 */
  blockingChartIds: string[]
  /** 涉及非阻断提示的图表 id。 */
  warningChartIds: string[]
  /** 结构和业务校验汇总。 */
  validation: IChartGraphicValidationSummary
  /** 数据源绑定和刷新状态汇总。 */
  dataSource: IChartGraphicDataSourceSummary
  /** 预设版本治理汇总。 */
  preset: IChartGraphicTemplatePresetAuditSummary
}

/** 图表交互状态。 */
export interface IChartInteractionState {
  /** 是否只读。 */
  readonly?: boolean
  /** 当前活动序列。 */
  activeSeriesId?: string
  /** 是否锁定医学坐标，锁定后普通 patch 不允许修改 coordinate。 */
  coordinateLocked?: boolean
  /** 当前内部编辑态，供属性面板或 overlay 控件投影。 */
  internalEditing?: IChartGraphicInternalEditingState
}

/** 图表内部编辑模式。 */
export type ChartGraphicInternalEditingMode =
  | 'chart'
  | 'point'
  | 'mark'
  | 'region'
  | 'annotation'
  | 'dental-tooth'
  | 'dental-surface'
  | 'readonly-preview'

/** 图表内部编辑态。 */
export interface IChartGraphicInternalEditingState {
  /** 当前编辑模式。 */
  mode: ChartGraphicInternalEditingMode
  /** 当前活动序列。 */
  seriesId?: string
  /** 当前活动点位索引。 */
  dataIndex?: number
  /** 当前活动标记。 */
  markId?: string
  /** 当前活动区间。 */
  regionId?: string
  /** 当前活动标注。 */
  annotationId?: string
  /** 当前活动牙位。 */
  toothCode?: string
  /** 当前活动牙面。 */
  dentalSurface?: DentalSurface
  /** 当前内部多选目标，供属性面板、overlay 或批量命令使用。 */
  selection?: IChartGraphicInternalSelectionTarget[]
}

/** 图表内部可批量选择目标。 */
export interface IChartGraphicInternalSelectionTarget {
  /** 选择目标类型。 */
  target:
    | 'series-point'
    | 'mark'
    | 'region'
    | 'annotation'
    | 'dental-tooth'
    | 'dental-surface'
  /** 序列标识。 */
  seriesId?: string
  /** 点位索引。 */
  dataIndex?: number
  /** 标记标识。 */
  markId?: string
  /** 区间标识。 */
  regionId?: string
  /** 标注标识。 */
  annotationId?: string
  /** 牙位编码。 */
  toothCode?: string
  /** 牙面。 */
  dentalSurface?: DentalSurface
}

/** 图表 fallback 资源。 */
export interface IChartFallbackResource {
  /** SVG fallback。 */
  svg?: string
  /** PNG fallback。 */
  png?: string
}

/** 牙位记录模型。 */
export interface IDentalChartModel {
  /** 牙位编码体系。 */
  notation: 'FDI' | 'Universal' | 'Palmer'
  /** 牙列类型。 */
  dentition: 'permanent' | 'primary' | 'mixed'
  /** 牙位状态列表。 */
  teeth: IDentalToothState[]
}

/** 牙位状态。 */
export interface IDentalToothState {
  /** 牙位编码。 */
  code: string
  /** 整牙状态。 */
  status?: DentalToothStatus[]
  /** 牙面状态，供牙面级命中和业务扩展使用。 */
  surfaces?: Partial<Record<DentalSurface, DentalToothStatus[]>>
  /** 备注。 */
  notes?: string
}

/** 牙齿状态类型。 */
export type DentalToothStatus =
  | 'missing'
  | 'caries'
  | 'filled'
  | 'rootCanal'
  | 'crown'
  | 'implant'

/** 牙面类型。 */
export type DentalSurface =
  | 'mesial'
  | 'distal'
  | 'buccal'
  | 'lingual'
  | 'occlusal'

/** 图表图形模型。 */
export interface IChartGraphic {
  /** 模型版本。 */
  version: 1
  /** 图表类型。 */
  kind: ChartGraphicKind
  /** 预设标识。 */
  presetId?: string
  /** 图表创建或上次升级时使用的预设版本。 */
  presetVersion?: string
  /** 标题。 */
  title?: string
  /** 尺寸。 */
  size: IChartGraphicSize
  /** 坐标配置。 */
  coordinate?: IChartCoordinate
  /** 数据序列。 */
  series?: IChartSeries[]
  /** 事件标记。 */
  marks?: IChartMark[]
  /** 区间标记。 */
  regions?: IChartRegion[]
  /** 文字标注。 */
  annotations?: IChartAnnotation[]
  /** 牙位图专用模型。 */
  dental?: IDentalChartModel
  /** 外部数据源。 */
  source?: IChartDataSourceBinding
  /** 主题。 */
  theme?: IChartGraphicTheme
  /** 交互状态。 */
  interaction?: IChartInteractionState
  /** fallback 资源。 */
  fallback?: IChartFallbackResource
  /** 体温单专用固定版式。 */
  vitalSigns?: IChartVitalSignsLayout
  /** 分页策略。 */
  pagination?: IChartGraphicPagination
}

/** 图表序列渲染快照。 */
export interface IChartGraphicSeriesSnapshot {
  /** 序列标识。 */
  id: string
  /** 序列类型。 */
  type: IChartSeries['type']
  /** 原始有效点位数量。 */
  rawPointCount: number
  /** 当前尺寸下渲染点位数量。 */
  renderPointCount: number
}

/** 图表图形渲染 / 调试快照。 */
export interface IChartGraphicSnapshot {
  /** 图表元素标识。 */
  elementId?: string
  /** 图表类型。 */
  kind: ChartGraphicKind
  /** 图表宽度。 */
  width: number
  /** 图表高度。 */
  height: number
  /** 序列快照列表。 */
  series: IChartGraphicSeriesSnapshot[]
  /** 标记数量。 */
  markCount: number
  /** 区间数量。 */
  regionCount: number
  /** 标注数量。 */
  annotationCount: number
  /** 牙位数量。 */
  dentalToothCount: number
  /** 数据源标识。 */
  sourceId?: string
  /** 数据源版本。 */
  sourceVersion?: string
}

/** 图表图形校验结果。 */
export interface IChartGraphicValidationResult {
  /** 是否通过校验；存在 error 时为 false。 */
  valid: boolean
  /** 错误列表，会阻止后续保存或导出。 */
  errors?: IChartGraphicValidationIssue[]
  /** 警告列表，可继续渲染但需要业务侧关注。 */
  warnings?: IChartGraphicValidationIssue[]
}

/** 图表图形校验问题。 */
export interface IChartGraphicValidationIssue {
  /** 稳定问题编码。 */
  code: string
  /** 面向调用侧展示或记录的说明。 */
  message: string
  /** 问题所在模型路径。 */
  path?: string
  /** 问题等级。 */
  severity: 'error' | 'warning'
}

/** 单个图表的文档级校验条目。 */
export interface IChartGraphicValidationEntry {
  /** 图表元素标识。 */
  chartId?: string
  /** 图表校验结果。 */
  result: IChartGraphicValidationResult
}

/** 带图表上下文的文档级校验问题。 */
export interface IChartGraphicValidationIssueEntry
  extends IChartGraphicValidationIssue {
  /** 图表元素标识。 */
  chartId?: string
  /** 图表类型。 */
  kind: ChartGraphicKind
  /** 图表标题。 */
  title?: string
  /** 图表预设标识。 */
  presetId?: string
  /** 图表预设版本。 */
  presetVersion?: string
}

/** 文档级图表校验汇总。 */
export interface IChartGraphicValidationSummary {
  /** 文档内所有图表是否都没有 error。 */
  valid: boolean
  /** 检查过的图表数量。 */
  checked: number
  /** 包含 error 的图表数量。 */
  invalid: number
  /** 包含 warning 的图表数量。 */
  warned: number
  /** error 总数。 */
  errorCount: number
  /** warning 总数。 */
  warningCount: number
  /** 包含 error 的图表 id。 */
  invalidChartIds: string[]
  /** 包含 warning 的图表 id。 */
  warningChartIds: string[]
  /** 扁平化后的文档级校验问题，供问题面板或保存前提示直接使用。 */
  issueList: IChartGraphicValidationIssueEntry[]
  /** 每个图表的详细校验结果。 */
  entries: IChartGraphicValidationEntry[]
}

/** 插入图表图形命令载荷。 */
export interface IInsertChartGraphicPayload extends Partial<IChartGraphic> {
  /** 元素标识。 */
  id?: string
  /** 图表类型。 */
  kind: ChartGraphicKind
  /** 宽度尺寸。 */
  width?: number
  /** 高度尺寸。 */
  height?: number
}

/** 图表内部命中目标类型。 */
export type ChartGraphicHitTarget =
  | 'frame'
  | 'plot-area'
  | 'series-point'
  | 'series-line'
  | 'mark'
  | 'region'
  | 'annotation'
  | 'legend'
  | 'dental-tooth'
  | 'dental-surface'

/** 图表内部命中结果，坐标命中逻辑只描述图表内部对象。 */
export interface IChartGraphicHitResult {
  /** 命中的内部目标。 */
  target: ChartGraphicHitTarget
  /** 命中的序列标识。 */
  seriesId?: string
  /** 命中的数据点索引。 */
  dataIndex?: number
  /** 命中的标记标识。 */
  markId?: string
  /** 命中的区间标识。 */
  regionId?: string
  /** 命中的标注标识。 */
  annotationId?: string
  /** 命中的牙位编码。 */
  toothCode?: string
  /** 命中的牙面。 */
  dentalSurface?: DentalSurface
}

/** 图表文档坐标命中查询载荷。 */
export interface IChartGraphicHitQueryPayload {
  /** 横坐标；有 pageNo 时为页内坐标，无 pageNo 时为跨页文档坐标。 */
  x: number
  /** 纵坐标；有 pageNo 时为页内坐标，无 pageNo 时为跨页文档坐标。 */
  y: number
  /** 页码；传入后 x/y 按页内坐标解析。 */
  pageNo?: number
  /** 命中容差，默认由图表命中策略决定。 */
  tolerance?: number
}

/** 按命中结果切换牙位图状态的命令载荷。 */
export interface IToggleChartGraphicDentalStatusByHitPayload
  extends IChartGraphicHitQueryPayload {
  /** 需要切换的目标状态。 */
  status: DentalToothStatus
}

/** 按命中结果删除图表内部对象的命令载荷。 */
export interface IDeleteChartGraphicTargetByHitPayload
  extends IChartGraphicHitQueryPayload {}

/** 按命中结果清除牙位图状态的命令载荷。 */
export interface IClearChartGraphicDentalStatusByHitPayload
  extends IChartGraphicHitQueryPayload {}

/** 按命中结果更新图表点位的命令载荷。 */
export interface IUpdateChartGraphicSeriesPointByHitPayload
  extends IChartGraphicHitQueryPayload {
  /** 点位 patch。 */
  patch: ChartGraphicSeriesPointPatch
}

/** 按命中结果插入图表点位的命令载荷。 */
export interface IInsertChartGraphicSeriesPointByHitPayload
  extends IChartGraphicHitQueryPayload {
  /** 可选点位标签。 */
  label?: string
}

/** 按命中结果插入图表标注的命令载荷。 */
export interface IInsertChartGraphicAnnotationByHitPayload
  extends IChartGraphicHitQueryPayload {
  /** 可选标注 id；未传时自动生成。 */
  id?: string
  /** 标注文本。 */
  text: string
}

/** 按命中结果插入图表标记的命令载荷。 */
export interface IInsertChartGraphicMarkByHitPayload
  extends IChartGraphicHitQueryPayload {
  /** 可选标记 id；未传时自动生成。 */
  id?: string
  /** 标记类型；默认 event。 */
  type?: IChartMark['type']
  /** 标记文本。 */
  label?: string
}

/** 图表文档坐标命中查询结果。 */
export interface IChartGraphicHitQueryResult {
  /** 图表元素标识。 */
  elementId?: string
  /** 页码。 */
  pageNo: number
  /** 图表模型。 */
  chart: IChartGraphic
  /** 图表元素宽度。 */
  width: number
  /** 图表元素高度。 */
  height: number
  /** 命中点换算后的图表本地横坐标。 */
  localX: number
  /** 命中点换算后的图表本地纵坐标。 */
  localY: number
  /** 图表内部命中结果。 */
  hit: IChartGraphicHitResult
}
