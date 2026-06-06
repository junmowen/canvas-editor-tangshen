import { ImageDisplay } from '../dataset/enum/Common'
import { ControlComponent } from '../dataset/enum/Control'
import { ElementType } from '../dataset/enum/Element'
import { ListStyle, ListType } from '../dataset/enum/List'
import { RowFlex } from '../dataset/enum/Row'
import { TitleLevel } from '../dataset/enum/Title'
import { TableBorder, TableDisplay } from '../dataset/enum/table/Table'
import { IArea } from './Area'
import { IBlock } from './Block'
import { ICheckbox } from './Checkbox'
import { IControl } from './Control'
import { IFormula } from './Formula'
import { IPageColumns } from './PageColumns'
import { IRadio } from './Radio'
import { ITextDecoration } from './Text'
import { ITitle } from './Title'
import { IColgroup } from './table/Colgroup'
import { ITableFragmentDescriptor } from './table/TableFragment'
import { ITr } from './table/Tr'

/** 元素基础信息，保存该对象最小必要配置。 */
export interface IElementBasic {
  /** 唯一标识，用于关联、查找或更新对应数据。 */
  id?: string
  type?: ElementType
  /** 当前值，用于保存控件、输入或配置的实际内容。 */
  value: string
  /** 扩展数据对象，用于承载业务侧自定义字段。 */
  extension?: unknown
  /** 外部系统标识，用于和业务数据源建立关联。 */
  externalId?: string
  /** 来源索引，用于定位对应元素、行或片段。 */
  sourceIndex?: number
  /** 分页片段所属的逻辑元素 id。 */
  pagingId?: string
  /** 分页片段在逻辑元素中的顺序索引。 */
  pagingIndex?: number
  /** 修订留痕信息，用于记录插入和删除痕迹。 */
  trackChange?: ITrackChange
}

/** trackchangetype，限定当前数据可使用的类型标识。 */
export type TrackChangeType = 'insert' | 'delete'

/** track变更事件载荷，描述监听器收到的更新内容。 */
export interface ITrackChange {
  /** 同一次修订操作的唯一标识，用于按批接受或拒绝。 */
  id: string
  /** 修订类型：插入或删除。 */
  type: TrackChangeType
  /** 修订作者。 */
  author?: string
  /** 修订发生时间戳。 */
  timestamp: number
  /** 当前痕迹显示颜色。 */
  color?: string
}

/** 元素样式，描述文字、边框或背景等显示效果。 */
export interface IElementStyle {
  /** 字体声明，用于设置 Canvas 文本绘制样式。 */
  font?: string
  /** 尺寸值，用于控制元素、画布或缓存大小。 */
  size?: number
  /** 宽度尺寸，使用编辑器内部像素单位。 */
  width?: number
  /** 高度尺寸，使用编辑器内部像素单位。 */
  height?: number
  /** 是否加粗，用于设置文字字重样式。 */
  bold?: boolean
  /** 文字或线条颜色，用于当前绘制样式。 */
  color?: string
  /** 高亮颜色，用于设置文字背景或控件强调样式。 */
  highlight?: string
  /** 是否斜体，用于设置文字样式。 */
  italic?: boolean
  /** 是否下划线，用于设置文字装饰样式。 */
  underline?: boolean
  /** 是否删除线，用于设置文字装饰样式。 */
  strikeout?: boolean
  /** 行剩余弹性空间，用于分配两端对齐或缩进补偿。 */
  rowFlex?: RowFlex
  /** 行外边距，用于控制段落上下留白。 */
  rowMargin?: number
  /** 行左缩进，用于计算段落左侧排版边界。 */
  rowIndentLeft?: number
  /** 行右缩进，用于计算段落右侧排版边界。 */
  rowIndentRight?: number
  /** 行缩进值，用于计算段落文本起点。 */
  rowIndent?: number
  /** 行悬挂缩进，用于计算首行外的文本起点。 */
  rowHangingIndent?: number
  /** 段落局部分栏配置，用于让选中内容独立于页面全局分栏排版。 */
  columns?: IPageColumns
  /** 字间距，用于排版时计算字符间隔。 */
  letterSpacing?: number
  /** spacebefore数值，用于当前布局、统计或索引计算。 */
  spaceBefore?: number
  /** spaceafter数值，用于当前布局、统计或索引计算。 */
  spaceAfter?: number
  /** 行spacing数值，用于当前布局、统计或索引计算。 */
  lineSpacing?: number
  lineSpacingType?: 'auto' | 'exact' | 'multiple'
  /** 页面breakbefore开关，用于控制当前流程的判断分支。 */
  pageBreakBefore?: boolean
  /** keepwith下一个开关，用于控制当前流程的判断分支。 */
  keepWithNext?: boolean
  /** keeplines开关，用于控制当前流程的判断分支。 */
  keepLines?: boolean
  /** widow控件开关，用于控制当前流程的判断分支。 */
  widowControl?: boolean
  /** 段落制表位列表，位置单位为编辑器内部像素，按段落文本起点计算。 */
  tabStops?: ITabStop[]
  /** editor2 文档样式标识，用于内置/自定义样式回显。 */
  styleId?: string
  /** editor2 文档样式名称，用于菜单状态回显。 */
  styleName?: string
  textDecoration?: ITextDecoration
  /** editor2 字符横向缩放百分比，100 表示原始宽度。 */
  textScale?: number
  /** editor2 字符基线偏移，负数上移、正数下移。 */
  textPosition?: number
  /** editor2 文本描边/空心样式。 */
  textOutline?: {
    /** 文字或线条颜色，用于当前绘制样式。 */
    color?: string
    /** 宽度尺寸，使用编辑器内部像素单位。 */
    width?: number
    /** hollow开关，用于控制当前流程的判断分支。 */
    hollow?: boolean
  }
  /** editor2 文本阴影样式。 */
  textShadow?: {
    /** 文字或线条颜色，用于当前绘制样式。 */
    color?: string
    /** 模糊半径，用于控制阴影或背景的柔化程度。 */
    blur?: number
    /** 横向偏移量，用于调整绘制或命中位置。 */
    offsetX?: number
    /** 纵向偏移量，用于调整绘制或命中位置。 */
    offsetY?: number
  }
  /** editor2 文本发光样式。 */
  textGlow?: {
    /** 文字或线条颜色，用于当前绘制样式。 */
    color?: string
    /** 模糊半径，用于控制阴影或背景的柔化程度。 */
    blur?: number
  }
  /** editor2 文本映像样式。 */
  textReflection?: {
    /** 不透明度，用于控制元素绘制透明程度。 */
    opacity?: number
    /** 偏移量，用于把局部坐标或索引换算到目标空间。 */
    offset?: number
    /** 模糊半径，用于控制阴影或背景的柔化程度。 */
    blur?: number
  }
  /** editor2 带圈/带框字符样式。 */
  textEnclosure?: {
    /** 形状配置，用于控制块级元素外观。 */
    shape?: 'circle' | 'square'
    /** 文字或线条颜色，用于当前绘制样式。 */
    color?: string
    /** 边框宽度，用于绘制元素或表格线条。 */
    borderWidth?: number
    /** 填充颜色或填充方式，用于绘制块级元素背景。 */
    fill?: string
  }
  /** editor2 拼音/注音标注样式。 */
  textRuby?: {
    /** 文本内容，用于剪贴板、输入或公式节点。 */
    text: string
    /** 位置数据，用于描述元素、光标或浮层所在坐标。 */
    position?: 'top' | 'bottom'
    /** 字体大小，单位为编辑器内部像素。 */
    fontSize?: number
    /** 文字或线条颜色，用于当前绘制样式。 */
    color?: string
  }
  /** editor2 纵横混排样式。 */
  textCombine?: boolean
}

/** 段落制表位配置，用于控制 TAB 元素跳转到指定位置。 */
export interface ITabStop {
  /** 制表位位置，按段落文本起点计算，单位为编辑器内部像素。 */
  position: number
  /** 制表位对齐方式；第一批布局先按位置落点处理，后续扩展对齐测量。 */
  alignment?: 'left' | 'center' | 'right' | 'decimal' | 'bar'
}

/** 行indent调用载荷，聚合执行该操作所需的输入数据。 */
export interface IRowIndentPayload {
  /** 左侧偏移或边距，用于计算区域边界。 */
  left?: number | null
  /** 右侧偏移或边距，用于计算区域边界。 */
  right?: number | null
  /** first行数值，用于当前布局、统计或索引计算。 */
  firstLine?: number | null
  /** hanging数值，用于当前布局、统计或索引计算。 */
  hanging?: number | null
}

/** 元素规则，控制该能力的启用条件和约束。 */
export interface IElementRule {
  /** 是否隐藏，用于控制界面项或元素可见性。 */
  hide?: boolean
  pageScope?: 'all' | 'first' | 'odd' | 'even'
}

/** 元素分组契约，用于约束公开 API中传递的数据结构。 */
export interface IElementGroup {
  /** 分组ids文本，用于标识、展示或匹配当前对象。 */
  groupIds?: string[]
}

/** 标题元素，描述文档元素在该场景下扩展的业务属性。 */
export interface ITitleElement {
  /** 值列表，保存控件或批量操作的候选值。 */
  valueList?: IElement[]
  /** 层级值，用于描述标题、列表或嵌套结构深度。 */
  level?: TitleLevel
  /** 标题id，用于关联对应业务对象。 */
  titleId?: string
  /** 标题文本或标题容器，用于渲染面板标题。 */
  title?: ITitle
}

/** 列表元素，描述文档元素在该场景下扩展的业务属性。 */
export interface IListElement {
  /** 值列表，保存控件或批量操作的候选值。 */
  valueList?: IElement[]
  listType?: ListType
  /** 列表样式，用于控制绘制外观。 */
  listStyle?: ListStyle
  /** 列表id，用于关联对应业务对象。 */
  listId?: string
  /** 列表level数值，用于当前布局、统计或索引计算。 */
  listLevel?: number
  /** 列表起始数值，用于当前布局、统计或索引计算。 */
  listStart?: number
  /** 列表symbol文本，用于标识、展示或匹配当前对象。 */
  listSymbol?: string
  /** 列表wrap开关，用于控制当前流程的判断分支。 */
  listWrap?: boolean
}

/** 表格attr契约，用于约束公开 API中传递的数据结构。 */
export interface ITableAttr {
  /** 列组配置，用于描述表格列宽结构。 */
  colgroup?: IColgroup[]
  /** 表格行列表，保存表格的行结构。 */
  trList?: ITr[]
  /** 边框类型，用于选择实线、虚线等绘制方式。 */
  borderType?: TableBorder
  /** 边框颜色，用于绘制元素或表格边线。 */
  borderColor?: string
  /** 边框宽度，用于绘制元素或表格线条。 */
  borderWidth?: number
  /** 外侧边框宽度，用于计算表格外围占位。 */
  borderExternalWidth?: number
  tableDisplay?: TableDisplay
  /** 表格样式id，用于关联对应业务对象。 */
  tableStyleId?: string
  /** 表格样式name文本，用于标识、展示或匹配当前对象。 */
  tableStyleName?: string
  /** 表格float位置，用于描述布局或命中的空间范围。 */
  tableFloatPosition?: {
    /** 横坐标，用于定位画布或页面内的位置。 */
    x: number
    /** 纵坐标，用于定位画布或页面内的位置。 */
    y: number
    /** 页码，用于定位分页结果中的目标页面。 */
    pageNo?: number
  }
}

/** 表格规则，控制该能力的启用条件和约束。 */
export interface ITableRule {
  /** 表格tooldisabled开关，用于控制当前流程的判断分支。 */
  tableToolDisabled?: boolean
}

/** 表格元素，描述文档元素在该场景下扩展的业务属性。 */
export interface ITableElement {
  /** 单元格标识，用于关联单元格位置、片段和选区。 */
  tdId?: string
  /** 表格行标识，用于关联行位置、片段和选区。 */
  trId?: string
  /** 表格标识，用于关联表格片段、行和单元格。 */
  tableId?: string
  /** 控件概念标识，用于匹配同一业务语义的控件。 */
  conceptId?: string
}

/** 表格类型，用于约束公开 API中传递的数据结构。 */
export type ITable = ITableAttr & ITableRule & ITableElement

/** 超链接元素，描述文档元素在该场景下扩展的业务属性。 */
export interface IHyperlinkElement {
  /** 值列表，保存控件或批量操作的候选值。 */
  valueList?: IElement[]
  /** url文本，用于标识、展示或匹配当前对象。 */
  url?: string
  /** 超链接id，用于关联对应业务对象。 */
  hyperlinkId?: string
}

/** superscriptsubscript契约，用于约束公开 API中传递的数据结构。 */
export interface ISuperscriptSubscript {
  /** 实际字号，记录上下标等派生排版后的尺寸。 */
  actualSize?: number
}

/** separator契约，用于约束公开 API中传递的数据结构。 */
export interface ISeparator {
  /** 虚线间隔配置，用于绘制虚线或点划线边框。 */
  dashArray?: number[]
}

/** 控件元素，描述文档元素在该场景下扩展的业务属性。 */
export interface IControlElement {
  /** 控件配置对象，描述当前控件的行为和取值规则。 */
  control?: IControl
  /** 控件标识，用于关联同一控件的开始、值和结束元素。 */
  controlId?: string
  /** 父控件标识，用于维护嵌套控件归属关系。 */
  parentControlId?: string
  controlComponent?: ControlComponent
}

/** 复选框元素，描述文档元素在该场景下扩展的业务属性。 */
export interface ICheckboxElement {
  /** 复选框配置，用于描述勾选控件的状态和样式。 */
  checkbox?: ICheckbox
}

/** 单选框元素，描述文档元素在该场景下扩展的业务属性。 */
export interface IRadioElement {
  radio?: IRadio
}

/** latex元素，描述文档元素在该场景下扩展的业务属性。 */
export interface ILaTexElement {
  /** latexsvg文本，用于标识、展示或匹配当前对象。 */
  laTexSVG?: string
  /** 结构化公式模型，用于支持可编辑、可搜索和可导入导出的专业公式。 */
  formula?: IFormula
}

/** date元素，描述文档元素在该场景下扩展的业务属性。 */
export interface IDateElement {
  /** 日期格式模板，用于格式化日期控件显示值。 */
  dateFormat?: string
  /** dateid，用于关联对应业务对象。 */
  dateId?: string
}

/** 图片规则，控制该能力的启用条件和约束。 */
export interface IImageRule {
  /** imgtooldisabled开关，用于控制当前流程的判断分支。 */
  imgToolDisabled?: boolean
}

/** 图片webglfilter契约，用于约束公开 API中传递的数据结构。 */
export interface IImageWebGLFilter {
  /** 灰度系数，用于控制图片滤镜的去色程度。 */
  grayscale?: number
  /** 亮度系数，用于控制图片滤镜明暗。 */
  brightness?: number
  /** 对比度系数，用于控制图片滤镜的明暗差异。 */
  contrast?: number
}

/** 图片webglcrop契约，用于约束公开 API中传递的数据结构。 */
export interface IImageWebGLCrop {
  /** 横坐标，用于定位画布或页面内的位置。 */
  x: number
  /** 纵坐标，用于定位画布或页面内的位置。 */
  y: number
  /** 宽度尺寸，使用编辑器内部像素单位。 */
  width: number
  /** 高度尺寸，使用编辑器内部像素单位。 */
  height: number
}

/** 图片基础信息，保存该对象最小必要配置。 */
export interface IImageBasic {
  /** 图片显示配置，用于描述图片在页面中的尺寸和位置。 */
  imgDisplay?: ImageDisplay
  /** imgfloat位置，用于描述布局或命中的空间范围。 */
  imgFloatPosition?: {
    /** 横坐标，用于定位画布或页面内的位置。 */
    x: number
    /** 纵坐标，用于定位画布或页面内的位置。 */
    y: number
    /** 页码，用于定位分页结果中的目标页面。 */
    pageNo?: number
  }
  /** imglockaspectratio开关，用于控制当前流程的判断分支。 */
  imgLockAspectRatio?: boolean
  /** imgsizelocked开关，用于控制当前流程的判断分支。 */
  imgSizeLocked?: boolean
  imgBorder?: {
    /** 文字或线条颜色，用于当前绘制样式。 */
    color?: string
    /** 宽度尺寸，使用编辑器内部像素单位。 */
    width?: number
    /** 圆角半径，用于绘制圆角边框或背景。 */
    radius?: number
  }
  imgShadow?: {
    /** 文字或线条颜色，用于当前绘制样式。 */
    color?: string
    /** 模糊半径，用于控制阴影或背景的柔化程度。 */
    blur?: number
    /** 横向偏移量，用于调整绘制或命中位置。 */
    offsetX?: number
    /** 纵向偏移量，用于调整绘制或命中位置。 */
    offsetY?: number
  }
  imgCrop?: {
    /** 横坐标，用于定位画布或页面内的位置。 */
    x: number
    /** 纵坐标，用于定位画布或页面内的位置。 */
    y: number
    /** 宽度尺寸，使用编辑器内部像素单位。 */
    width: number
    /** 高度尺寸，使用编辑器内部像素单位。 */
    height: number
  }
  /** 独立 WebGL 图片任务使用的预览滤镜，不改变正文排版。 */
  webglFilter?: IImageWebGLFilter
  /** 显式标记该图片预览任务使用 WebGL 做降采样输出。 */
  webglDownsample?: boolean
  /** 图片预览裁剪区域，按源图固有像素坐标描述。 */
  webglCrop?: IImageWebGLCrop
  /** 图片预览旋转角度，单位为度，围绕输出区域中心旋转。 */
  webglRotation?: number
}

/** 图片元素，描述文档元素在该场景下扩展的业务属性。 */
export type IImageElement = IImageBasic & IImageRule

/** block元素，描述文档元素在该场景下扩展的业务属性。 */
export interface IBlockElement {
  block?: IBlock
}

/** 区域元素，描述文档元素在该场景下扩展的业务属性。 */
export interface IAreaElement {
  /** 值列表，保存控件或批量操作的候选值。 */
  valueList?: IElement[]
  /** 区域标识，用于关联控件或元素所在的编辑区域。 */
  areaId?: string
  /** 区域索引，用于定位对应元素、行或片段。 */
  areaIndex?: number
  /** 编辑区域标识，区分正文、页眉、页脚等独立区域。 */
  area?: IArea
}

/** 当前项元素，描述文档元素在该场景下扩展的业务属性。 */
export type IElement = IElementBasic &
  IElementStyle &
  IElementRule &
  IElementGroup &
  ITable &
  IHyperlinkElement &
  ISuperscriptSubscript &
  ISeparator &
  IControlElement &
  ICheckboxElement &
  IRadioElement &
  ILaTexElement &
  IDateElement &
  IImageElement &
  IBlockElement &
  ITitleElement &
  IListElement &
  IAreaElement

/** 元素metrics契约，用于约束公开 API中传递的数据结构。 */
export interface IElementMetrics {
  /** 宽度尺寸，使用编辑器内部像素单位。 */
  width: number
  /** 高度尺寸，使用编辑器内部像素单位。 */
  height: number
  /** boundingboxascent数值，用于当前布局、统计或索引计算。 */
  boundingBoxAscent: number
  /** boundingboxdescent数值，用于当前布局、统计或索引计算。 */
  boundingBoxDescent: number
  /** 命中的制表位对齐方式，用于渲染竖线制表位等非文本标记。 */
  tabStopAlignment?: ITabStop['alignment']
}

/** 元素位置契约，用于约束公开 API中传递的数据结构。 */
export interface IElementPosition {
  /** 页码，用于定位分页结果中的目标页面。 */
  pageNo: number
  /** 元素索引，用于定位文档列表中的目标元素。 */
  index: number
  /** 当前值，用于保存控件、输入或配置的实际内容。 */
  value: string
  /** 文档元素对象，承载文本、控件、表格或媒体信息。 */
  element?: IElement
  tableFragment?: ITableFragmentDescriptor
  /** 行索引，用于定位表格或页面中的目标行。 */
  rowIndex: number
  /** 行号，用于定位页面内的目标行。 */
  rowNo: number
  /** 字体上升高度，用于计算文本基线和行高。 */
  ascent: number
  /** 行盒高度，包含文本和行距后的实际占位。 */
  lineHeight: number
  /** 左侧偏移或边距，用于计算区域边界。 */
  left: number
  /** 统计指标集合，用于暴露渲染或布局运行状态。 */
  metrics: IElementMetrics
  /** 是否首个letter，用于控制当前流程的判断分支。 */
  isFirstLetter: boolean
  /** 是否最后letter，用于控制当前流程的判断分支。 */
  isLastLetter: boolean
  coordinate: {
    /** 左侧上侧数值，用于当前布局、统计或索引计算。 */
    leftTop: number[]
    /** 左侧下侧数值，用于当前布局、统计或索引计算。 */
    leftBottom: number[]
    /** 右侧上侧数值，用于当前布局、统计或索引计算。 */
    rightTop: number[]
    /** 右侧下侧数值，用于当前布局、统计或索引计算。 */
    rightBottom: number[]
  }
}

/** 元素fillrect，描述选区、元素或页面中的矩形区域。 */
export interface IElementFillRect {
  /** 横坐标，用于定位画布或页面内的位置。 */
  x: number
  /** 纵坐标，用于定位画布或页面内的位置。 */
  y: number
  /** 宽度尺寸，使用编辑器内部像素单位。 */
  width: number
  /** 高度尺寸，使用编辑器内部像素单位。 */
  height: number
}

/** update元素byid选项，用于约束调用方可传入的可选配置。 */
export interface IUpdateElementByIdOption {
  /** 唯一标识，用于关联、查找或更新对应数据。 */
  id?: string
  /** 控件概念标识，用于匹配同一业务语义的控件。 */
  conceptId?: string
  /** 属性集合，用于批量携带元素样式或业务配置。 */
  properties: Omit<Partial<IElement>, 'id'>
}

/** 删除元素byid选项，用于约束调用方可传入的可选配置。 */
export interface IDeleteElementByIdOption {
  /** 唯一标识，用于关联、查找或更新对应数据。 */
  id?: string
  /** 控件概念标识，用于匹配同一业务语义的控件。 */
  conceptId?: string
}

/** 获取元素byid选项，用于约束调用方可传入的可选配置。 */
export interface IGetElementByIdOption {
  /** 唯一标识，用于关联、查找或更新对应数据。 */
  id?: string
  /** 控件概念标识，用于匹配同一业务语义的控件。 */
  conceptId?: string
}

/** 插入元素列表选项，用于约束调用方可传入的可选配置。 */
export interface IInsertElementListOption {
  /** 是否替换原范围，用于控制插入时覆盖还是追加。 */
  isReplace?: boolean
  /** 是否提交历史记录，用于控制本次变更是否可撤销。 */
  isSubmitHistory?: boolean
}

/** splice元素列表选项，用于约束调用方可传入的可选配置。 */
export interface ISpliceElementListOption {
  /** 是否忽略已删除规则，用于控制当前流程的判断分支。 */
  isIgnoreDeletedRule?: boolean
}
