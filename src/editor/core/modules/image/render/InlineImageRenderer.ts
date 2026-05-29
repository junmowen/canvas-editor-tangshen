import { ImageDisplay } from '../../../../dataset/enum/Common'
import { ElementType } from '../../../../dataset/enum/Element'
import { IDrawRowPayload } from '../../../../interface/Draw'
import type { Draw } from '../../../draw/Draw'

type RowElement = IDrawRowPayload['rowList'][number]['elementList'][number]

/** 行内图片渲染器，封装浮动/环绕图片在正文行中跳过绘制的策略。 */
export class InlineImageRenderer {
  public canRender(element: RowElement) {
    return element.type === ElementType.IMAGE
  }

  public render(
    ctx: CanvasRenderingContext2D,
    element: RowElement,
    x: number,
    y: number,
    imageParticle: ReturnType<Draw['getImageParticle']>,
    options: { isExport?: boolean } = {}
  ) {
    if (
      element.imgDisplay === ImageDisplay.SURROUND ||
      element.imgDisplay === ImageDisplay.TIGHT ||
      element.imgDisplay === ImageDisplay.FLOAT_TOP ||
      element.imgDisplay === ImageDisplay.FLOAT_BOTTOM
    ) {
      return
    }
    imageParticle.render(ctx, element, x, y, options)
  }
}
