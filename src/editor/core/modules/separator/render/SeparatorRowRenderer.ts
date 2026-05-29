import { ElementType } from '../../../../dataset/enum/Element'
import { EditorZone } from '../../../../dataset/enum/Editor'
import { IDrawRowPayload } from '../../../../interface/Draw'
import type { Draw } from '../../../draw/Draw'

type RowElement = IDrawRowPayload['rowList'][number]['elementList'][number]

/** 分隔符行内渲染器。 */
export class SeparatorRowRenderer {
  public canRender(element: RowElement) {
    return element.type === ElementType.SEPARATOR
  }

  public render(
    ctx: CanvasRenderingContext2D,
    element: RowElement,
    x: number,
    y: number,
    zone: EditorZone | undefined,
    separatorParticle: ReturnType<Draw['getComponents']>['separatorParticle']
  ) {
    separatorParticle.render(ctx, element, x, y, zone)
  }
}
