import { IDrawRowPayload } from '../../../../interface/Draw'
import type { Draw } from '../../../draw/Draw'

/** 列表行标记渲染器。 */
export class ListRowMarkerRenderer {
  public render(
    ctx: CanvasRenderingContext2D,
    row: IDrawRowPayload['rowList'][number],
    rowStartPosition: IDrawRowPayload['positionList'][number] | undefined,
    listParticle: ReturnType<Draw['getListParticle']>
  ) {
    if (row.isList && rowStartPosition) {
      listParticle.drawListStyle(ctx, row, rowStartPosition)
    }
  }
}
