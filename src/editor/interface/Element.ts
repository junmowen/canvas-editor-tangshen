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
import { IRadio } from './Radio'
import { ITextDecoration } from './Text'
import { ITitle } from './Title'
import { IColgroup } from './table/Colgroup'
import { ITableFragmentDescriptor } from './table/TableFragment'
import { ITr } from './table/Tr'

export interface IElementBasic {
  id?: string
  type?: ElementType
  value: string
  extension?: unknown
  externalId?: string
  sourceIndex?: number
  /** 分页片段所属的逻辑元素 id。 */
  pagingId?: string
  /** 分页片段在逻辑元素中的顺序索引。 */
  pagingIndex?: number
}

export interface IElementStyle {
  font?: string
  size?: number
  width?: number
  height?: number
  bold?: boolean
  color?: string
  highlight?: string
  italic?: boolean
  underline?: boolean
  strikeout?: boolean
  rowFlex?: RowFlex
  rowMargin?: number
  rowIndentLeft?: number
  rowIndentRight?: number
  rowIndent?: number
  rowHangingIndent?: number
  letterSpacing?: number
  spaceBefore?: number
  spaceAfter?: number
  lineSpacing?: number
  lineSpacingType?: 'auto' | 'exact' | 'multiple'
  pageBreakBefore?: boolean
  keepWithNext?: boolean
  keepLines?: boolean
  widowControl?: boolean
  tabStops?: {
    position: number
    alignment?: 'left' | 'center' | 'right' | 'decimal' | 'bar'
  }[]
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
    color?: string
    width?: number
    hollow?: boolean
  }
  /** editor2 文本阴影样式。 */
  textShadow?: {
    color?: string
    blur?: number
    offsetX?: number
    offsetY?: number
  }
  /** editor2 文本发光样式。 */
  textGlow?: {
    color?: string
    blur?: number
  }
  /** editor2 文本映像样式。 */
  textReflection?: {
    opacity?: number
    offset?: number
    blur?: number
  }
  /** editor2 带圈/带框字符样式。 */
  textEnclosure?: {
    shape?: 'circle' | 'square'
    color?: string
    borderWidth?: number
    fill?: string
  }
  /** editor2 拼音/注音标注样式。 */
  textRuby?: {
    text: string
    position?: 'top' | 'bottom'
    fontSize?: number
    color?: string
  }
  /** editor2 纵横混排样式。 */
  textCombine?: boolean
}

export interface IRowIndentPayload {
  left?: number | null
  right?: number | null
  firstLine?: number | null
  hanging?: number | null
}

export interface IElementRule {
  hide?: boolean
  pageScope?: 'all' | 'first' | 'odd' | 'even'
}

export interface IElementGroup {
  groupIds?: string[]
}

export interface ITitleElement {
  valueList?: IElement[]
  level?: TitleLevel
  titleId?: string
  title?: ITitle
}

export interface IListElement {
  valueList?: IElement[]
  listType?: ListType
  listStyle?: ListStyle
  listId?: string
  listLevel?: number
  listStart?: number
  listSymbol?: string
  listWrap?: boolean
}

export interface ITableAttr {
  colgroup?: IColgroup[]
  trList?: ITr[]
  borderType?: TableBorder
  borderColor?: string
  borderWidth?: number
  borderExternalWidth?: number
  tableDisplay?: TableDisplay
  tableStyleId?: string
  tableStyleName?: string
  tableFloatPosition?: {
    x: number
    y: number
    pageNo?: number
  }
}

export interface ITableRule {
  tableToolDisabled?: boolean
}

export interface ITableElement {
  tdId?: string
  trId?: string
  tableId?: string
  conceptId?: string
}

export type ITable = ITableAttr & ITableRule & ITableElement

export interface IHyperlinkElement {
  valueList?: IElement[]
  url?: string
  hyperlinkId?: string
}

export interface ISuperscriptSubscript {
  actualSize?: number
}

export interface ISeparator {
  dashArray?: number[]
}

export interface IControlElement {
  control?: IControl
  controlId?: string
  parentControlId?: string
  controlComponent?: ControlComponent
}

export interface ICheckboxElement {
  checkbox?: ICheckbox
}

export interface IRadioElement {
  radio?: IRadio
}

export interface ILaTexElement {
  laTexSVG?: string
}

export interface IDateElement {
  dateFormat?: string
  dateId?: string
}

export interface IImageRule {
  imgToolDisabled?: boolean
}

export interface IImageWebGLFilter {
  grayscale?: number
  brightness?: number
  contrast?: number
}

export interface IImageWebGLCrop {
  x: number
  y: number
  width: number
  height: number
}

export interface IImageBasic {
  imgDisplay?: ImageDisplay
  imgFloatPosition?: {
    x: number
    y: number
    pageNo?: number
  }
  imgLockAspectRatio?: boolean
  imgSizeLocked?: boolean
  imgBorder?: {
    color?: string
    width?: number
    radius?: number
  }
  imgShadow?: {
    color?: string
    blur?: number
    offsetX?: number
    offsetY?: number
  }
  imgCrop?: {
    x: number
    y: number
    width: number
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

export type IImageElement = IImageBasic & IImageRule

export interface IBlockElement {
  block?: IBlock
}

export interface IAreaElement {
  valueList?: IElement[]
  areaId?: string
  areaIndex?: number
  area?: IArea
}

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

export interface IElementMetrics {
  width: number
  height: number
  boundingBoxAscent: number
  boundingBoxDescent: number
}

export interface IElementPosition {
  pageNo: number
  index: number
  value: string
  element?: IElement
  tableFragment?: ITableFragmentDescriptor
  rowIndex: number
  rowNo: number
  ascent: number
  lineHeight: number
  left: number
  metrics: IElementMetrics
  isFirstLetter: boolean
  isLastLetter: boolean
  coordinate: {
    leftTop: number[]
    leftBottom: number[]
    rightTop: number[]
    rightBottom: number[]
  }
}

export interface IElementFillRect {
  x: number
  y: number
  width: number
  height: number
}

export interface IUpdateElementByIdOption {
  id?: string
  conceptId?: string
  properties: Omit<Partial<IElement>, 'id'>
}

export interface IDeleteElementByIdOption {
  id?: string
  conceptId?: string
}

export interface IGetElementByIdOption {
  id?: string
  conceptId?: string
}

export interface IInsertElementListOption {
  isReplace?: boolean
  isSubmitHistory?: boolean
}

export interface ISpliceElementListOption {
  isIgnoreDeletedRule?: boolean
}
