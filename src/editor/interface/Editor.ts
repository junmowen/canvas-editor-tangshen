import {
  EditorMode,
  PageMode,
  PaperDirection,
  RenderMode,
  WordBreak
} from '../dataset/enum/Editor'
import { IBackgroundOption } from './Background'
import { ICheckboxOption } from './Checkbox'
import { IRadioOption } from './Radio'
import {
  IControlAsyncValidator,
  IControlCrossValidateRule,
  IControlRemoteOptionLoader,
  IControlOption,
  IControlSchema,
  ISetControlProperties,
  ISetControlValueOption
} from './Control'
import { ICursorOption } from './Cursor'
import { IFooter } from './Footer'
import { IGroup } from './Group'
import { IHeader } from './Header'
import { ILineBreakOption } from './LineBreak'
import { IMargin, PageGutterPosition } from './Margin'
import { IPageBreak } from './PageBreak'
import { IPageNumber } from './PageNumber'
import { IPageColumns } from './PageColumns'
import { IPlaceholder } from './Placeholder'
import { ITitleOption } from './Title'
import { ITypographyOption } from './Typography'
import { IWatermark } from './Watermark'
import { IZoneOption } from './Zone'
import { ISeparatorOption } from './Separator'
import { ITableOption } from './table/Table'
import { ILineNumberOption } from './LineNumber'
import { IPageBorderOption } from './PageBorder'
import { IBadgeOption } from './Badge'
import { IElement } from './Element'
import { LocationPosition } from '../dataset/enum/Common'
import { IRange } from './Range'
import { IDocumentStyle } from './Style'

/** 页眉页脚内容作用域，按零基 pageNo 解析为首页、奇数页、偶数页或全页默认。 */
export type HeaderFooterPageScope = 'all' | 'first' | 'odd' | 'even'

/** 单个页眉页脚作用域数据，TS-07 后续渲染和导出会按 pageScope 选择 elementList。 */
export interface IHeaderFooterPageScopeData {
  /** 作用域标识：all 为全页默认语义，first/odd/even 对应页面类型。 */
  pageScope: HeaderFooterPageScope
  /** 当前作用域下的页眉或页脚元素列表。 */
  elementList: IElement[]
}

/** 编辑器数据契约，用于约束公开 API中传递的数据结构。 */
export interface IEditorData {
  /** 文档样式集合，保存正文、标题、引用、列表和表格样式定义。 */
  styles?: IDocumentStyle[]
  /** 按页取值时返回当前页解析后的页眉内容；运行时存储使用 headerPageScopes。 */
  header?: IElement[]
  /** 页眉按首页、奇数页、偶数页或全页划分的页面作用域数据。 */
  headerPageScopes?: IHeaderFooterPageScopeData[]
  /** main列表，保存同类数据的有序集合。 */
  main: IElement[]
  /** 按页取值时返回当前页解析后的页脚内容；运行时存储使用 footerPageScopes。 */
  footer?: IElement[]
  /** 页脚按首页、奇数页、偶数页或全页划分的页面作用域数据。 */
  footerPageScopes?: IHeaderFooterPageScopeData[]
}

/** 当前 runtime 数据，正文为必需项，页眉页脚以作用域模型作为存储来源。 */
export type IRuntimeEditorData = Required<Pick<IEditorData, 'main'>> &
  Pick<
    IEditorData,
    'styles' | 'header' | 'headerPageScopes' | 'footer' | 'footerPageScopes'
  >

/** 渲染backend选项，用于约束调用方可传入的可选配置。 */
export interface IRenderBackendOption {
  debugPanel?: {
    /** 是否启用，用于控制功能开关状态。 */
    enabled?: boolean
  }
  offscreenCanvas?: {
    /** 是否启用，用于控制功能开关状态。 */
    enabled?: boolean
    /** non当前页面基准开关，用于控制当前流程的判断分支。 */
    nonCurrentPageBase?: boolean
  }
  webgl?: {
    /** 是否启用，用于控制功能开关状态。 */
    enabled?: boolean
    /** 图片task开关，用于控制当前流程的判断分支。 */
    imageTask?: boolean
    /** force上下文lost开关，用于控制当前流程的判断分支。 */
    forceContextLost?: boolean
    /** WebGL 纹理缓存可保留的最大条目数。 */
    maxTextureCacheSize?: number
    /** 最大texture缓存bytes数值，用于当前布局、统计或索引计算。 */
    maxTextureCacheBytes?: number
  }
  svgDom?: {
    /** 是否启用，用于控制功能开关状态。 */
    enabled?: boolean
    /** blocktask开关，用于控制当前流程的判断分支。 */
    blockTask?: boolean
  }
}

/** trackchange选项，用于约束调用方可传入的可选配置。 */
export interface ITrackChangeOption {
  /** 是否默认开启留痕。 */
  enabled?: boolean
  /** 当前修订作者。 */
  author?: string
  /** 插入痕迹颜色。 */
  insertColor?: string
  /** 删除痕迹颜色。 */
  deleteColor?: string
}

/** 编辑器选项，用于约束调用方可传入的可选配置。 */
export interface IEditorOption {
  /** 模式标识，用于选择当前处理分支。 */
  mode?: EditorMode
  /** locale文本，用于标识、展示或匹配当前对象。 */
  locale?: string
  defaultType?: string
  /** 默认颜色，用于控制绘制外观。 */
  defaultColor?: string
  /** 默认font文本，用于标识、展示或匹配当前对象。 */
  defaultFont?: string
  /** 默认字号，作为未显式设置文本的排版尺寸。 */
  defaultSize?: number
  /** 最小字号，限制字号调整和样式归一化的下界。 */
  minSize?: number
  /** 最大字号，限制字号调整和样式归一化的上界。 */
  maxSize?: number
  /** 基础行距默认高度，用于计算段落行盒上下留白。 */
  defaultBasicRowMarginHeight?: number
  /** 默认段落行距，影响相邻行之间的垂直间隔。 */
  defaultRowMargin?: number
  /** Tab 默认占位宽度，按编辑器内部像素计算。 */
  defaultTabWidth?: number
  /** 中文排版细节配置，用于扩展单位不拆行和标点禁则。 */
  typography?: ITypographyOption
  /** 宽度尺寸，使用编辑器内部像素单位。 */
  width?: number
  /** 高度尺寸，使用编辑器内部像素单位。 */
  height?: number
  /** 缩放比例，用于把文档尺寸映射到显示尺寸。 */
  scale?: number
  /** 分页模式下相邻页面之间的屏幕间距。 */
  pageGap?: number
  /** underline颜色，用于控制绘制外观。 */
  underlineColor?: string
  /** strikeout颜色，用于控制绘制外观。 */
  strikeoutColor?: string
  /** 范围颜色，用于控制绘制外观。 */
  rangeColor?: string
  /** 范围alpha，用于控制绘制外观。 */
  rangeAlpha?: number
  /** 选区高亮的最小可见宽度，避免空白位置难以命中。 */
  rangeMinWidth?: number
  /** 搜索match颜色，用于控制绘制外观。 */
  searchMatchColor?: string
  /** 搜索navigatematch颜色，用于控制绘制外观。 */
  searchNavigateMatchColor?: string
  /** 搜索matchalpha，用于控制绘制外观。 */
  searchMatchAlpha?: number
  /** highlightalpha，用于控制绘制外观。 */
  highlightAlpha?: number
  /** 高亮背景相对文本行盒的额外上下扩展高度。 */
  highlightMarginHeight?: number
  /** resizer颜色，用于控制绘制外观。 */
  resizerColor?: string
  /** 缩放控制点尺寸，决定图片和浮层拖拽手柄大小。 */
  resizerSize?: number
  /** 页边距指示器尺寸，用于绘制拖拽边界提示。 */
  marginIndicatorSize?: number
  /** marginindicator颜色，用于控制绘制外观。 */
  marginIndicatorColor?: string
  margins?: IMargin
  /** gutter数值，用于当前布局、统计或索引计算。 */
  gutter?: number
  /** gutter位置，用于描述布局或命中的空间范围。 */
  gutterPosition?: PageGutterPosition
  /** mirrormargins开关，用于控制当前流程的判断分支。 */
  mirrorMargins?: boolean
  columns?: IPageColumns
  pageMode?: PageMode
  renderMode?: RenderMode
  /** 默认超链接颜色，用于控制绘制外观。 */
  defaultHyperlinkColor?: string
  paperDirection?: PaperDirection
  /** 非激活状态透明度，用于弱化未选中内容。 */
  inactiveAlpha?: number
  /** history最大recordcount，用于统计当前场景的发生次数。 */
  historyMaxRecordCount?: number
  /** 打印pixelratio数值，用于当前布局、统计或索引计算。 */
  printPixelRatio?: number
  /** 页面遮罩边距，控制遮罩区域与正文边界的距离。 */
  maskMargin?: IMargin
  /** letterclass文本，用于标识、展示或匹配当前对象。 */
  letterClass?: string[]
  /** 上下文menudisablekeys文本，用于标识、展示或匹配当前对象。 */
  contextMenuDisableKeys?: string[]
  /** shortcutdisablekeys文本，用于标识、展示或匹配当前对象。 */
  shortcutDisableKeys?: string[]
  /** scrollcontainerselector文本，用于标识、展示或匹配当前对象。 */
  scrollContainerSelector?: string
  /** 页面outer选区disable开关，用于控制当前流程的判断分支。 */
  pageOuterSelectionDisable?: boolean
  wordBreak?: WordBreak
  /** 表格数据对象，保存行、列和单元格结构。 */
  table?: ITableOption
  /** 页眉配置，用于控制页眉区域内容和样式。 */
  header?: IHeader
  /** 页脚配置，用于控制页脚区域内容和样式。 */
  footer?: IFooter
  pageNumber?: IPageNumber
  watermark?: IWatermark
  /** 控件配置对象，描述当前控件的行为和取值规则。 */
  control?: IControlOption
  /** 控件 schema 列表，用于模板级声明业务绑定、默认规则和默认值。 */
  controlSchema?: IControlSchema[]
  /** 控件初始化属性列表，用于创建编辑器时注入选项、只读、禁用、校验等业务配置。 */
  controlInitialProperties?: ISetControlProperties[]
  /** 控件初始化值列表，用于创建编辑器时按 id、conceptId 或 areaId 回填业务数据。 */
  controlInitialValues?: ISetControlValueOption[]
  /** 控件异步校验器，用于接入业务侧后端校验或跨字段校验。 */
  controlValidator?: IControlAsyncValidator
  /** 声明式跨字段校验规则，用于常见控件联动约束。 */
  controlCrossValidateRules?: IControlCrossValidateRule[]
  /** 控件远程选项加载器，用于按业务接口异步刷新选择类控件候选项。 */
  controlRemoteOptionLoader?: IControlRemoteOptionLoader
  /** 复选框配置，用于描述勾选控件的状态和样式。 */
  checkbox?: ICheckboxOption
  radio?: IRadioOption
  cursor?: ICursorOption
  /** 标题文本或标题容器，用于渲染面板标题。 */
  title?: ITitleOption
  /** 占位内容，用于在空值或待输入状态下显示提示。 */
  placeholder?: IPlaceholder
  /** 分组配置，用于关联同组元素或控件。 */
  group?: IGroup
  pageBreak?: IPageBreak
  /** 区域实例，用于处理编辑器浮层、提示或交互热区。 */
  zone?: IZoneOption
  background?: IBackgroundOption
  lineBreak?: ILineBreakOption
  separator?: ISeparatorOption
  lineNumber?: ILineNumberOption
  pageBorder?: IPageBorderOption
  /** 角标配置，用于在控件或菜单项上展示附加状态。 */
  badge?: IBadgeOption
  modeRule?: IModeRule
  renderBackend?: IRenderBackendOption
  trackChange?: ITrackChangeOption
}

export interface IEditorResult {
  /** 版本号，用于判断缓存、布局或快照是否仍然有效。 */
  version: string
  /** 业务数据载荷，供当前操作读取或提交。 */
  data: IEditorData
  /** 操作配置项，用于调整当前流程的可选行为。 */
  options: IEditorOption
}

/** 编辑器html契约，用于约束公开 API中传递的数据结构。 */
export interface IEditorHTML {
  /** 页眉配置，用于控制页眉区域内容和样式。 */
  header: string
  /** main文本，用于标识、展示或匹配当前对象。 */
  main: string
  /** 页脚配置，用于控制页脚区域内容和样式。 */
  footer: string
}

/** 编辑器文本类型，用于约束公开 API中传递的数据结构。 */
export type IEditorText = IEditorHTML

/** update选项，用于约束调用方可传入的可选配置。 */
export type IUpdateOption = Omit<
  IEditorOption,
  | 'mode'
  | 'scale'
  | 'pageGap'
  | 'pageMode'
  | 'paperDirection'
  | 'historyMaxRecordCount'
  | 'scrollContainerSelector'
>

/** 设置值选项，用于约束调用方可传入的可选配置。 */
export interface ISetValueOption {
  /** 是否同步设置光标，用于控制操作完成后的焦点位置。 */
  isSetCursor?: boolean
}

/** focus选项，用于约束调用方可传入的可选配置。 */
export interface IFocusOption {
  /** 行号，用于定位页面内的目标行。 */
  rowNo?: number
  /** 选区范围，记录起止索引和方向信息。 */
  range?: IRange
  /** 位置数据，用于描述元素、光标或浮层所在坐标。 */
  position?: LocationPosition
  /** 是否移动光标to可见，用于控制当前流程的判断分支。 */
  isMoveCursorToVisible?: boolean
}

/** 打印mode规则，控制该能力的启用条件和约束。 */
export interface IPrintModeRule {
  /** 图片预览器disabled开关，用于控制当前流程的判断分支。 */
  imagePreviewerDisabled?: boolean
  /** 背景disabled开关，用于控制当前流程的判断分支。 */
  backgroundDisabled?: boolean
}

/** readonlymode规则，控制该能力的启用条件和约束。 */
export interface IReadonlyModeRule {
  /** 图片预览器disabled开关，用于控制当前流程的判断分支。 */
  imagePreviewerDisabled?: boolean
}

/** formmode规则，控制该能力的启用条件和约束。 */
export interface IFormModeRule {
  /** 控件deletabledisabled开关，用于控制当前流程的判断分支。 */
  controlDeletableDisabled?: boolean
}

/** mode规则，控制该能力的启用条件和约束。 */
export interface IModeRule {
  /** 打印模式规则，用于控制打印场景下允许的编辑能力。 */
  [EditorMode.PRINT]?: IPrintModeRule
  /** 只读模式规则，用于控制只读场景下允许的交互能力。 */
  [EditorMode.READONLY]?: IReadonlyModeRule
  /** 表单模式规则，用于控制表单填写场景下允许的编辑能力。 */
  [EditorMode.FORM]?: IFormModeRule
}
