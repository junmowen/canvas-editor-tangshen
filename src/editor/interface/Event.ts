import { IElement } from './Element'
import { RangeRect } from './Range'

/** paste选项，用于约束调用方可传入的可选配置。 */
export interface IPasteOption {
  /** 是否纯文本，用于控制当前流程的判断分支。 */
  isPlainText: boolean
}

/** 表格infoby事件契约，用于约束公开 API中传递的数据结构。 */
export interface ITableInfoByEvent {
  /** 文档元素对象，承载文本、控件、表格或媒体信息。 */
  element: IElement
  /** 表格行索引，用于定位当前表格内的目标行。 */
  trIndex: number
  /** 单元格索引，用于定位当前行内的目标单元格。 */
  tdIndex: number
}

export interface IPositionContextByEventResult {
  /** 页码，用于定位分页结果中的目标页面。 */
  pageNo: number
  /** 文档元素对象，承载文本、控件、表格或媒体信息。 */
  element: IElement | null
  /** 范围rect，用于描述布局或命中的空间范围。 */
  rangeRect: RangeRect | null
  tableInfo: ITableInfoByEvent | null
}

/** 位置上下文by事件选项，用于约束调用方可传入的可选配置。 */
export interface IPositionContextByEventOption {
  /** 是否必须直接命中，用于控制当前流程的判断分支。 */
  isMustDirectHit?: boolean
}

/** copy选项，用于约束调用方可传入的可选配置。 */
export interface ICopyOption {
  /** 是否纯文本，用于控制当前流程的判断分支。 */
  isPlainText: boolean
}
