import { ElementType } from '../../../../dataset/enum/Element'
import { IDrawRowPayload } from '../../../../interface/Draw'
import type { Draw } from '../../../draw/Draw'

type RowElement = IDrawRowPayload['rowList'][number]['elementList'][number]

interface IInlineRowElementRenderPayload {
  ctx: CanvasRenderingContext2D
  curRow: IDrawRowPayload['rowList'][number]
  element: RowElement
  preElement?: RowElement
  x: number
  y: number
  index: number
  textParticle: ReturnType<Draw['getTextParticle']>
  hyperlinkParticle: ReturnType<Draw['getHyperlinkParticle']>
}

/** 超链接、日期等内联业务元素的行内绘制器。 */
export class InlineRowElementRenderer {
  public canRender(element: RowElement) {
    return (
      element.type === ElementType.HYPERLINK ||
      element.type === ElementType.DATE
    )
  }

  public render(payload: IInlineRowElementRenderPayload) {
    const {
      ctx,
      curRow,
      element,
      preElement,
      x,
      y,
      index,
      textParticle,
      hyperlinkParticle
    } = payload
    if (element.type === ElementType.HYPERLINK) {
      textParticle.complete()
      hyperlinkParticle.render(ctx, element, x, y)
      return
    }

    const nextElement = curRow.elementList[index + 1]
    if (!preElement || preElement.dateId !== element.dateId) {
      textParticle.complete()
    }
    textParticle.record(ctx, element, x, y)
    if (!nextElement || nextElement.dateId !== element.dateId) {
      textParticle.complete()
    }
  }
}
