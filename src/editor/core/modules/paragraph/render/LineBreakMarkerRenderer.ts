import { EditorMode } from '../../../../dataset/enum/Editor'
import { IDrawRowPayload } from '../../../../interface/Draw'
import type { Draw } from '../../../draw/Draw'

type RowElement = IDrawRowPayload['rowList'][number]['elementList'][number]

/** 行尾换行符可视标记渲染器。 */
export class LineBreakMarkerRenderer {
  public render(payload: {
    ctx: CanvasRenderingContext2D
    curRow: IDrawRowPayload['rowList'][number]
    element: RowElement
    x: number
    y: number
    index: number
    isDrawLineBreak: boolean
    isPrintMode: boolean
    mode: EditorMode
    lineBreakParticle: ReturnType<Draw['getComponents']>['lineBreakParticle']
  }) {
    const {
      ctx,
      curRow,
      element,
      x,
      y,
      index,
      isDrawLineBreak,
      isPrintMode,
      mode,
      lineBreakParticle
    } = payload
    if (
      isDrawLineBreak &&
      !isPrintMode &&
      mode !== EditorMode.CLEAN &&
      !curRow.isWidthNotEnough &&
      index === curRow.elementList.length - 1
    ) {
      lineBreakParticle.render(ctx, element, x, y + curRow.height / 2)
    }
  }
}
