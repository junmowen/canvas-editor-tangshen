import { IDrawRowPayload } from '../../../interface/Draw'
import { IElementPosition, IElement } from '../../../interface/Element'
import { IRange } from '../../../interface/Range'
import { IResolvedSelectionContentRange } from '../../range/utils/resolveSelectionContent'

/** 统一描述渲染层使用的选区范围。 */
export interface ITableSelectionRenderRange {
  startIndex: number
  endIndex: number
}

/** 渲染投影时需要的附加上下文。 */
export interface IGetTableSelectionRenderRangePayload {
  elementList?: IElement[]
  tableCellContext?: IDrawRowPayload['tableCellContext']
}

/** 对外公开的选区投影结果。 */
export interface ITableSelectionPublicState {
  range: IRange
  cursorPosition: IElementPosition | null
}

/** 统一导出内容选区投影类型。 */
export type ITableSelectionContentRange = IResolvedSelectionContentRange
