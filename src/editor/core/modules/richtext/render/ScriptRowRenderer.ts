import { ElementType } from '../../../../dataset/enum/Element'
import { IDrawRowPayload } from '../../../../interface/Draw'
import type { Draw } from '../../../draw/Draw'

type RowElement = IDrawRowPayload['rowList'][number]['elementList'][number]

/** 上标 / 下标行内渲染器。 */
export class ScriptRowRenderer {
  public canRender(element: RowElement) {
    return (
      element.type === ElementType.SUPERSCRIPT ||
      element.type === ElementType.SUBSCRIPT
    )
  }

  public render(payload: {
    ctx: CanvasRenderingContext2D
    element: RowElement
    x: number
    y: number
    textParticle: ReturnType<Draw['getTextParticle']>
    underline: ReturnType<Draw['getComponents']>['underline']
    superscriptParticle: ReturnType<Draw['getComponents']>['superscriptParticle']
    subscriptParticle: ReturnType<Draw['getComponents']>['subscriptParticle']
  }) {
    const {
      ctx,
      element,
      x,
      y,
      textParticle,
      underline,
      superscriptParticle,
      subscriptParticle
    } = payload
    if (element.type === ElementType.SUPERSCRIPT) {
      textParticle.complete()
      superscriptParticle.render(ctx, element, x, y)
      return
    }
    underline.render(ctx)
    textParticle.complete()
    subscriptParticle.render(ctx, element, x, y)
  }
}
