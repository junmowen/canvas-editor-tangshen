import { IElement } from '../../../interface/Element'
import { IPositionContext } from '../../../interface/Position'
import { IRange } from '../../../interface/Range'
import { ITd } from '../../../interface/table/Td'
import { ITr } from '../../../interface/table/Tr'

/** 绘制resolved表格上下文，汇总流程中需要共享的定位、状态和依赖。 */
export interface IDrawResolvedTableContext {
  /** 命中位置上下文，连接元素索引、行列和区域信息。 */
  positionContext: IPositionContext
  /** 元素索引，用于定位文档列表中的目标元素。 */
  index: number
  /** 文档元素对象，承载文本、控件、表格或媒体信息。 */
  element: IElement
  /** 表格行索引，用于定位当前表格内的目标行。 */
  trIndex?: number
  /** 单元格索引，用于定位当前行内的目标单元格。 */
  tdIndex?: number
  /** 表格标识，用于关联表格片段、行和单元格。 */
  tableId?: string
}

/** 绘制resolved表格单元格契约，用于约束内部流程中传递的数据结构。 */
export interface IDrawResolvedTableCell {
  /** 表格元素索引，用于定位文档中的表格入口。 */
  tableIndex: number
  /** 表格行索引，用于定位当前表格内的目标行。 */
  trIndex: number
  /** 单元格索引，用于定位当前行内的目标单元格。 */
  tdIndex: number
}

/** 绘制resolved表格目标契约，用于约束内部流程中传递的数据结构。 */
export interface IDrawResolvedTableTarget {
  /** 文档元素对象，承载文本、控件、表格或媒体信息。 */
  element: IElement
  /** 表格行索引，用于定位当前表格内的目标行。 */
  trIndex: number | null
  /** 单元格索引，用于定位当前行内的目标单元格。 */
  tdIndex: number | null
}

/** 绘制resolved表格td契约，用于约束内部流程中传递的数据结构。 */
export interface IDrawResolvedTableTd extends IDrawResolvedTableCell {
  /** 表格数据对象，保存行、列和单元格结构。 */
  table: IElement
  /** 表格行对象，保存一行内的单元格结构。 */
  tr: ITr
  /** 表格单元格对象，保存单元格内容和样式。 */
  td: ITd
}

/** 绘制resolvedpreviouspaging表格契约，用于约束内部流程中传递的数据结构。 */
export interface IDrawResolvedPreviousPagingTable {
  /** 当前元素索引，用于定位命中或遍历所在位置。 */
  currentIndex: number
  /** 当前元素，用于定位或修改对应文档节点。 */
  currentElement: IElement
  /** previous索引，用于定位对应元素、行或片段。 */
  previousIndex: number
  /** previous元素，用于定位或修改对应文档节点。 */
  previousElement: IElement
}

/** 绘制resolved范围boundary元素契约，用于约束内部流程中传递的数据结构。 */
export interface IDrawResolvedRangeBoundaryElements {
  /** 选区范围，记录起止索引和方向信息。 */
  range: IRange
  /** 文档元素列表，按文档顺序保存参与处理的元素。 */
  elementList: IElement[]
  /** 起始元素，用于标记范围左边界对应的文档元素。 */
  startElement: IElement | null
  /** 结束元素，用于标记范围右边界对应的文档元素。 */
  endElement: IElement | null
}

/** 绘制resolved范围上下文boundary元素契约，用于约束内部流程中传递的数据结构。 */
export interface IDrawResolvedRangeContextBoundaryElements {
  /** 起始来源元素，用于定位或修改对应文档节点。 */
  startSourceElement: IElement
  /** 结束来源元素，用于定位或修改对应文档节点。 */
  endSourceElement: IElement
}

/** 绘制resolved控件boundary元素契约，用于约束内部流程中传递的数据结构。 */
export interface IDrawResolvedControlBoundaryElements {
  /** 选区范围，记录起止索引和方向信息。 */
  range: IRange
  /** 文档元素列表，按文档顺序保存参与处理的元素。 */
  elementList: IElement[]
  /** 控件标识，用于关联同一控件的开始、值和结束元素。 */
  controlId: string
  /** 起始元素索引，用于确定处理范围的左边界。 */
  startIndex: number
  /** 结束元素索引，用于确定处理范围的右边界。 */
  endIndex: number
  /** 起始元素，用于标记范围左边界对应的文档元素。 */
  startElement: IElement | null
  /** 结束元素，用于标记范围右边界对应的文档元素。 */
  endElement: IElement | null
}
