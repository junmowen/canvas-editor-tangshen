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
    separatorParticle: ReturnType<Draw['getComponents']>['separatorParticle'],
    pageNo = 0
  ) {
    // 透传页码给分隔线粒子，保证页眉页脚全宽线按当前页边距渲染。
    separatorParticle.render(ctx, element, x, y, zone, pageNo)
  }
}
