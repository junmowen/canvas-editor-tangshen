import { EditorZone, PageMode } from '../dataset/enum/Editor'
import { ElementType } from '../dataset/enum/Element'
import { ListStyle, ListType } from '../dataset/enum/List'
import { RowFlex } from '../dataset/enum/Row'
import { TitleLevel } from '../dataset/enum/Title'
import {
  IControlChangeResult,
  IControlContentChangeResult,
  IControlValidateResult
} from './Control'
import { IEditorResult } from './Editor'
import { IElement } from './Element'
import { IPositionContext } from './Position'
import { ITextDecoration } from './Text'

/** 范围样式，描述文字、边框或背景等显示效果。 */
export interface IRangeStyle {
  type: ElementType | null
  /** undo开关，用于控制当前流程的判断分支。 */
  undo: boolean
  /** redo开关，用于控制当前流程的判断分支。 */
  redo: boolean
  /** painter开关，用于控制当前流程的判断分支。 */
  painter: boolean
  /** 字体声明，用于设置 Canvas 文本绘制样式。 */
  font: string
  /** 尺寸值，用于控制元素、画布或缓存大小。 */
  size: number
  /** 是否加粗，用于设置文字字重样式。 */
  bold: boolean
  /** 是否斜体，用于设置文字样式。 */
  italic: boolean
  /** 是否下划线，用于设置文字装饰样式。 */
  underline: boolean
  /** 是否删除线，用于设置文字装饰样式。 */
  strikeout: boolean
  /** 字间距，用于排版时计算字符间隔。 */
  letterSpacing: number | null
  /** 文字或线条颜色，用于当前绘制样式。 */
  color: string | null
  /** 高亮颜色，用于设置文字背景或控件强调样式。 */
  highlight: string | null
  /** 行剩余弹性空间，用于分配两端对齐或缩进补偿。 */
  rowFlex: RowFlex | null
  /** 行外边距，用于控制段落上下留白。 */
  rowMargin: number
  /** 行左缩进，用于计算段落左侧排版边界。 */
  rowIndentLeft: number | null
  /** 行右缩进，用于计算段落右侧排版边界。 */
  rowIndentRight: number | null
  /** 行缩进值，用于计算段落文本起点。 */
  rowIndent: number | null
  /** 行悬挂缩进，用于计算首行外的文本起点。 */
  rowHangingIndent: number | null
  /** spacebefore数值，用于当前布局、统计或索引计算。 */
  spaceBefore: number | null
  /** spaceafter数值，用于当前布局、统计或索引计算。 */
  spaceAfter: number | null
  /** 行spacing数值，用于当前布局、统计或索引计算。 */
  lineSpacing: number | null
  lineSpacingType: 'auto' | 'exact' | 'multiple' | null
  /** 页面breakbefore开关，用于控制当前流程的判断分支。 */
  pageBreakBefore: boolean
  /** keepwith下一个开关，用于控制当前流程的判断分支。 */
  keepWithNext: boolean
  /** keeplines开关，用于控制当前流程的判断分支。 */
  keepLines: boolean
  /** widow控件开关，用于控制当前流程的判断分支。 */
  widowControl: boolean
  tabStops: IElement['tabStops'] | null
  /** 虚线间隔配置，用于绘制虚线或点划线边框。 */
  dashArray: number[]
  /** 层级值，用于描述标题、列表或嵌套结构深度。 */
  level: TitleLevel | null
  listType: ListType | null
  /** 列表样式，用于控制绘制外观。 */
  listStyle: ListStyle | null
  /** 列表level数值，用于当前布局、统计或索引计算。 */
  listLevel: number | null
  /** 列表起始数值，用于当前布局、统计或索引计算。 */
  listStart: number | null
  /** 列表symbol文本，用于标识、展示或匹配当前对象。 */
  listSymbol: string | null
  /** 样式id，用于关联对应业务对象。 */
  styleId: string | null
  /** 样式name文本，用于标识、展示或匹配当前对象。 */
  styleName: string | null
  /** 分组ids文本，用于标识、展示或匹配当前对象。 */
  groupIds: string[] | null
  textDecoration: ITextDecoration | null
  /** 文本缩放数值，用于当前布局、统计或索引计算。 */
  textScale: number | null
  /** 文本位置，用于描述布局或命中的空间范围。 */
  textPosition: number | null
  textOutline: IElement['textOutline'] | null
  textShadow: IElement['textShadow'] | null
  textGlow: IElement['textGlow'] | null
  textReflection: IElement['textReflection'] | null
  textEnclosure: IElement['textEnclosure'] | null
  textRuby: IElement['textRuby'] | null
  /** 文本combine开关，用于控制当前流程的判断分支。 */
  textCombine: boolean | null
  /** 扩展数据对象，用于承载业务侧自定义字段。 */
  extension?: unknown | null
}

/** 范围样式变更事件载荷，描述监听器收到的更新内容。 */
export type IRangeStyleChange = (payload: IRangeStyle) => void

/** 可见页面no列表变更事件载荷，描述监听器收到的更新内容。 */
export type IVisiblePageNoListChange = (payload: number[]) => void

/** intersection页面no变更事件载荷，描述监听器收到的更新内容。 */
export type IIntersectionPageNoChange = (payload: number) => void

/** 页面size变更事件载荷，描述监听器收到的更新内容。 */
export type IPageSizeChange = (payload: number) => void

/** 页面缩放变更事件载荷，描述监听器收到的更新内容。 */
export type IPageScaleChange = (payload: number) => void

/** saved类型，用于约束公开 API中传递的数据结构。 */
export type ISaved = (payload: IEditorResult) => void

/** 内容变更事件载荷，描述监听器收到的更新内容。 */
export type IContentChange = () => void

/** 控件变更事件载荷，描述监听器收到的更新内容。 */
export type IControlChange = (payload: IControlChangeResult) => void

/** 控件内容变更事件载荷，描述监听器收到的更新内容。 */
export type IControlContentChange = (
  payload: IControlContentChangeResult
) => void

/** 控件校验事件载荷，描述监听器收到的校验结果。 */
export type IControlValidate = (payload: IControlValidateResult) => void

/** 页面mode变更事件载荷，描述监听器收到的更新内容。 */
export type IPageModeChange = (payload: PageMode) => void

/** zone变更事件载荷，描述监听器收到的更新内容。 */
export type IZoneChange = (payload: EditorZone) => void

/** 鼠标事件变更事件载荷，描述监听器收到的更新内容。 */
export type IMouseEventChange = (evt: MouseEvent) => void

/** input事件变更事件载荷，描述监听器收到的更新内容。 */
export type IInputEventChange = (evt: Event) => void

/** 位置上下文change调用载荷，聚合执行该操作所需的输入数据。 */
export interface IPositionContextChangePayload {
  /** 当前值，用于保存控件、输入或配置的实际内容。 */
  value: IPositionContext
  /** old值，保存控件、输入或配置的实际取值。 */
  oldValue: IPositionContext
}

/** 位置上下文变更事件载荷，描述监听器收到的更新内容。 */
export type IPositionContextChange = (
  payload: IPositionContextChangePayload
) => void

/** 图片size变更事件载荷，描述监听器收到的更新内容。 */
export type IImageSizeChange = (payload: { element: IElement }) => void

/** 图片mousedown类型，用于约束公开 API中传递的数据结构。 */
export type IImageMousedown = (payload: {
  /** 原始 DOM 事件对象，用于读取指针、键盘或剪贴板信息。 */
  evt: MouseEvent
  /** 文档元素对象，承载文本、控件、表格或媒体信息。 */
  element: IElement
}) => void
