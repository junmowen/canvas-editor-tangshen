import { IDrawRowPayload } from '../../../../interface/Draw'
import { IElement } from '../../../../interface/Element'
import type { Draw } from '../../../draw/Draw'

type RowElement = IDrawRowPayload['rowList'][number]['elementList'][number]

interface IRowControlBorderRenderPayload {
  ctx: CanvasRenderingContext2D
  element: RowElement
  preElement?: RowElement
  x: number
  y: number
  rowHeight: number
  control: ReturnType<Draw['getControl']>
  getElementRowMargin: (el: IElement) => number
}

/** 行内控件边框渲染器，封装控件连续边框的 record/flush 规则。 */
export class RowControlBorderRenderer {
  public flush(ctx: CanvasRenderingContext2D, control: ReturnType<Draw['getControl']>) {
    control.drawBorder(ctx)
  }

  public render(payload: IRowControlBorderRenderPayload) {
    const {
      ctx,
      element,
      preElement,
      x,
      y,
      rowHeight,
      control,
      getElementRowMargin
    } = payload
    if (element.control?.border) {
      if (
        preElement?.control?.border &&
        preElement.controlId !== element.controlId
      ) {
        control.drawBorder(ctx)
      }
      const rowMargin = getElementRowMargin(element)
      control.recordBorderInfo(
        x,
        y + rowMargin,
        element.metrics.width,
        rowHeight - 2 * rowMargin
      )
    } else if (preElement?.control?.border) {
      control.drawBorder(ctx)
    }
  }
}
