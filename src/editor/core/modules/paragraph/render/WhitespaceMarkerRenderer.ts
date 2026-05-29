import { IDrawRowPayload } from '../../../../interface/Draw'
import type { Draw } from '../../../draw/Draw'

type RowElement = IDrawRowPayload['rowList'][number]['elementList'][number]
type RowPosition = IDrawRowPayload['positionList'][number]

/** 段落格式标记渲染器，负责空格和不换行空格的可视标记。 */
export class WhitespaceMarkerRenderer {
  public render(
    ctx: CanvasRenderingContext2D,
    element: RowElement,
    rowPosition: RowPosition,
    options: ReturnType<Draw['getOptions']>
  ) {
    const leftTop = rowPosition.coordinate.leftTop
    const markerX = leftTop[0] + element.metrics.width / 2
    const markerY = leftTop[1] + rowPosition.lineHeight / 2
    const markerRadius = Math.max(
      1,
      Math.round(options.lineBreak.lineWidth * options.scale * 1.25)
    )
    ctx.save()
    ctx.fillStyle = options.lineBreak.color
    ctx.beginPath()
    ctx.arc(markerX, markerY, markerRadius, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}
