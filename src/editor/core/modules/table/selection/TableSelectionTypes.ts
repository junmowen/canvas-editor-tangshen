import { IDrawRowPayload } from '../../../../interface/Draw'
import { IElementPosition, IElement } from '../../../../interface/Element'
import { IRange } from '../../../../interface/Range'
import { IResolvedSelectionContentRange } from '../../../range/utils/resolveSelectionContent'

/** 表格选区渲染范围契约，用于约束内部流程中传递的数据结构。 */
export interface ITableSelectionRenderRange {
  /** 起始元素索引，用于确定处理范围的左边界。 */
  startIndex: number
  /** 结束元素索引，用于确定处理范围的右边界。 */
  endIndex: number
}

/** 获取表格选区渲染范围调用载荷，聚合执行该操作所需的输入数据。 */
export interface IGetTableSelectionRenderRangePayload {
  /** 文档元素列表，按文档顺序保存参与处理的元素。 */
  elementList?: IElement[]
  /** 表格单元格上下文，保存命中单元格及其逻辑位置。 */
  tableCellContext?: IDrawRowPayload['tableCellContext']
}

/** 表格选区publicstate契约，用于约束内部流程中传递的数据结构。 */
export interface ITableSelectionPublicState {
  /** 选区范围，记录起止索引和方向信息。 */
  range: IRange
  /** 光标坐标信息，用于渲染插入点或处理命中。 */
  cursorPosition: IElementPosition | null
}

/** 表格选区内容范围类型，用于约束内部流程中传递的数据结构。 */
export type ITableSelectionContentRange = IResolvedSelectionContentRange
