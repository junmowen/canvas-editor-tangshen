import { ElementType } from '../../../../dataset/enum/Element'
import { IDrawRowPayload } from '../../../../interface/Draw'
import { IElement } from '../../../../interface/Element'
import { ITableFragmentDescriptor } from '../../../../interface/table/TableFragment'
import type { Draw } from '../../../draw/Draw'

type RowElement = IDrawRowPayload['rowList'][number]['elementList'][number]

/** 表格元素行内渲染器，封装 fragment 选择和跨行列 range 目标记录。 */
export class TableRowElementRenderer {
  public canRender(element: RowElement) {
    return element.type === ElementType.TABLE
  }

  public render(payload: {
    ctx: CanvasRenderingContext2D
    curRow: IDrawRowPayload['rowList'][number]
    element: RowElement
    x: number
    y: number
    currentTableRangeElement: IElement | ITableFragmentDescriptor | null
    isCrossRowCol: boolean
    tableParticle: ReturnType<Draw['getTableParticle']>
  }): IElement | ITableFragmentDescriptor | null {
    const {
      ctx,
      curRow,
      element,
      x,
      y,
      currentTableRangeElement,
      isCrossRowCol,
      tableParticle
    } = payload
    const tableFragment = curRow.tableFragment
    const renderElement = tableFragment || element
    const nextTableRangeElement = isCrossRowCol
      ? renderElement
      : currentTableRangeElement
    tableParticle.render(ctx, renderElement as unknown as IElement, x, y)
    return nextTableRangeElement
  }
}
