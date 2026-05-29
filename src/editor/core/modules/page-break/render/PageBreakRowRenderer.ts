import { EditorMode } from '../../../../dataset/enum/Editor'
import { ElementType } from '../../../../dataset/enum/Element'
import { IDrawRowPayload } from '../../../../interface/Draw'
import type { Draw } from '../../../draw/Draw'

type RowElement = IDrawRowPayload['rowList'][number]['elementList'][number]

/** 分页符行内渲染器。 */
export class PageBreakRowRenderer {
  public canRender(element: RowElement) {
    return element.type === ElementType.PAGE_BREAK
  }

  public render(
    ctx: CanvasRenderingContext2D,
    element: RowElement,
    x: number,
    y: number,
    mode: EditorMode,
    isPrintMode: boolean,
    pageBreakParticle: ReturnType<Draw['getComponents']>['pageBreakParticle']
  ) {
    if (mode !== EditorMode.CLEAN && !isPrintMode) {
      pageBreakParticle.render(ctx, element, x, y)
    }
  }
}
