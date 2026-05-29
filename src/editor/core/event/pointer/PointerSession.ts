import { IElement, IElementPosition } from '../../../interface/Element'
import { ICurrentPosition, IPositionContext } from '../../../interface/Position'
import { IRange } from '../../../interface/Range'
import { IPointerCoordinatePayload } from './coordinates/PointerCoordinateTypes'

/** 表格单元格clickinfo契约，用于约束内部流程中传递的数据结构。 */
export interface ITableCellClickInfo {
  /** 表格标识，用于关联表格片段、行和单元格。 */
  tableId?: string
  /** 表格行索引，用于定位当前表格内的目标行。 */
  trIndex?: number
  /** 单元格索引，用于定位当前行内的目标单元格。 */
  tdIndex?: number
  /** 单元格标识，用于关联单元格位置、片段和选区。 */
  tdId?: string
  /** 表格行标识，用于关联行位置、片段和选区。 */
  trId?: string
  /** 单元格内容索引，用于定位单元格内部元素。 */
  tdValueIndex?: number
  /** 页码，用于定位分页结果中的目标页面。 */
  pageNo?: number
  /** 逻辑表格标识，用于把分页片段关联回原始表格。 */
  logicalTableId?: string
  /** 逻辑行索引，用于定位原始表格中的行。 */
  logicalTrIndex?: number
  /** 逻辑单元格索引，用于定位原始行内的单元格。 */
  logicalTdIndex?: number
  /** 逻辑行标识，用于把片段行关联回原始表格行。 */
  logicalTrId?: string
  /** 逻辑单元格标识，用于把片段单元格关联回原始单元格。 */
  logicalTdId?: string
  /** 单元格键名，用于在表格缓存或映射中定位单元格。 */
  cellKey?: string
}

/** pointerdragsnapshot契约，用于约束内部流程中传递的数据结构。 */
export interface IPointerDragSnapshot {
  /** 选区范围，记录起止索引和方向信息。 */
  range: IRange | null
  /** 文档元素列表，按文档顺序保存参与处理的元素。 */
  elementList: IElement[] | null
  /** 布局位置列表，保存元素分页后的坐标结果。 */
  positionList: IElementPosition[] | null
  /** 命中位置上下文，连接元素索引、行列和区域信息。 */
  positionContext: IPositionContext | null
  /** 拖拽来源信息，用于提交时判断移动的数据范围。 */
  dragSource?: 'row-handle' | null
}

/** pointermulticlickstate契约，用于约束内部流程中传递的数据结构。 */
export interface IPointerMultiClickState {
  lastTableCellDblclickInfo: ITableCellClickInfo | null
  /** 表格单元格dblclickcount，用于统计当前场景的发生次数。 */
  tableCellDblclickCount: number
  /** 表格单元格clickresettimer数值，用于当前布局、统计或索引计算。 */
  tableCellClickResetTimer: number | null
}

/** pointersession契约，用于约束内部流程中传递的数据结构。 */
export interface IPointerSession {
  /** 是否允许选区，用于控制当前指针会话能否创建文本选择。 */
  isAllowSelection: boolean
  /** 是否允许拖拽，用于控制当前指针会话能否进入拖拽流程。 */
  isAllowDrag: boolean
  /** 是否允许放置，用于控制拖拽内容能否提交到当前落点。 */
  isAllowDrop: boolean
  dragSnapshot: IPointerDragSnapshot
  /** 鼠标down起始位置，用于描述布局或命中的空间范围。 */
  mouseDownStartPosition: ICurrentPosition | null
  mouseDownStartCoordinates: IPointerCoordinatePayload | null
  lastPointerCoordinates: IPointerCoordinatePayload | null
  multiClick: IPointerMultiClickState
}

export function createDefaultPointerSession(): IPointerSession {
  return {
    isAllowSelection: false,
    isAllowDrag: false,
    isAllowDrop: false,
    dragSnapshot: {
      range: null,
      elementList: null,
      positionList: null,
      positionContext: null,
      dragSource: null
    },
    mouseDownStartPosition: null,
    mouseDownStartCoordinates: null,
    lastPointerCoordinates: null,
    multiClick: {
      lastTableCellDblclickInfo: null,
      tableCellDblclickCount: 0,
      tableCellClickResetTimer: null
    }
  }
}
