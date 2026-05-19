import { ImageDisplay } from '../dataset/enum/Common'
import { EditorMode, EditorZone } from '../dataset/enum/Editor'
import { IElement, IElementPosition } from './Element'
import { IRow } from './Row'

export interface IDrawOption {
  curIndex?: number
  isSetCursor?: boolean
  isSubmitHistory?: boolean
  isCompute?: boolean
  isLazy?: boolean
  pageRenderScope?: 'all' | 'visible'
  layoutPatch?: IDrawLayoutPatch
  /** 输入态渲染标记，用于跳过无收益的 bitmap 写入等后台优化。 */
  isTyping?: boolean
  /** 输入态插入元素数量，用于 chunk patch 扩展新测量范围。 */
  typingInsertedCount?: number
  /** 输入态编辑锚点，用于在光标右移或删除后仍命中原始 chunk。 */
  typingEditIndex?: number
  /** 是否跳过输入预览绘制，程序化批量插入可直接走 chunk runtime patch。 */
  isSkipTypingPreview?: boolean
  /** 输入态立即回放标记，用于回车等结构变化操作。 */
  isImmediateTypingCompute?: boolean
  isInit?: boolean
  isSourceHistory?: boolean
  isFirstRender?: boolean
}

export interface IDrawLayoutPatch {
  type: 'text-input'
  insertIndex: number
  insertCount: number
  rowIndex: number
  pageNo: number
}

export interface IForceUpdateOption {
  isSubmitHistory?: boolean
}

export interface IDrawImagePayload {
  id?: string
  conceptId?: string
  width: number
  height: number
  value: string
  imgDisplay?: ImageDisplay
  extension?: unknown
}

export interface IDrawRowPayload {
  elementList: IElement[]
  positionList: IElementPosition[]
  rowList: IRow[]
  pageNo: number
  startIndex: number
  innerWidth: number
  zone?: EditorZone
  isDrawLineBreak?: boolean
  /** 导出绘制标记：禁用 DOM/WebGL 运行时副作用，走稳定 Canvas2D fallback。 */
  isExport?: boolean
  selectionCtx?: CanvasRenderingContext2D | null
  tableCellContext?: {
    tableId: string
    trId: string
    tdId: string
    trIndex: number
    tdIndex: number
  }
}

export interface IDrawFloatPayload {
  pageNo: number
  imgDisplays: ImageDisplay[]
  /** 导出绘制标记：浮动图片也需要禁用 WebGL 运行时路径。 */
  isExport?: boolean
}

export interface IDrawPagePayload {
  elementList: IElement[]
  positionList: IElementPosition[]
  rowList: IRow[]
  pageNo: number
  /** 导出绘制标记：禁用 DOM/WebGL 运行时副作用，走稳定 Canvas2D fallback。 */
  isExport?: boolean
}

export interface IPainterOption {
  isDblclick: boolean
}

export interface IGetValueOption {
  pageNo?: number
  extraPickAttrs?: Array<keyof IElement>
}

export type IGetOriginValueOption = Omit<IGetValueOption, 'extraPickAttrs'>

export interface IAppendElementListOption {
  isPrepend?: boolean
  isSubmitHistory?: boolean
}

export interface IGetImageOption {
  pixelRatio?: number
  mode?: EditorMode
}

export interface IComputeRowListPayload {
  innerWidth: number
  elementList: IElement[]
  startX?: number
  startY?: number
  isFloat?: boolean
  isFromTable?: boolean
  /** 兼容旧布局链路的分页模式字段。 */
  isPagingMode?: boolean
  isPagingPageMode?: boolean
  pageHeight?: number
  mainOuterHeight?: number
  surroundElementList?: IElement[]
  /** elementList 是主文档局部切片时，对应整篇正文的起始索引。 */
  sourceStartIndex?: number
}
