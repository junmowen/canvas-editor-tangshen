import { ElementType } from '../../../../dataset/enum/Element'
import { IDrawRowPayload } from '../../../../interface/Draw'
import type { Draw } from '../../../draw/Draw'

type RowElement = IDrawRowPayload['rowList'][number]['elementList'][number]

/** LaTeX 行内渲染器。 */
export class LaTexRowRenderer {
  public canRender(element: RowElement) {
    return element.type === ElementType.LATEX
  }

  public render(
    ctx: CanvasRenderingContext2D,
    element: RowElement,
    x: number,
    y: number,
    textParticle: ReturnType<Draw['getTextParticle']>,
    laTexParticle: ReturnType<Draw['getComponents']>['laTexParticle']
  ) {
    textParticle.complete()
    laTexParticle.render(ctx, element, x, y)
  }
}
