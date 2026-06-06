import { ElementType } from '../../../../dataset/enum/Element'
import { IDrawRowPayload } from '../../../../interface/Draw'
import type { Draw } from '../../../draw/Draw'
import { BlockExportCanvasRenderer } from './BlockExportCanvasRenderer'

type RowElement = IDrawRowPayload['rowList'][number]['elementList'][number]

/** block 行内渲染器，封装运行态 DOM host 和导出 Canvas 绘制切换。 */
export class BlockRowRenderer {
  private readonly exportCanvasRenderer = new BlockExportCanvasRenderer()

  public canRender(element: RowElement) {
    return element.type === ElementType.BLOCK
  }

  public render(payload: {
    ctx: CanvasRenderingContext2D
    pageNo: number
    element: RowElement
    x: number
    y: number
    isExport?: boolean
    textParticle: ReturnType<Draw['getTextParticle']>
    blockParticle: ReturnType<Draw['getBlockParticle']>
  }) {
    const { ctx, pageNo, element, x, y, isExport, textParticle, blockParticle } =
      payload
    textParticle.complete()
    if (isExport) {
      this.exportCanvasRenderer.render(ctx, element, x, y)
      return
    }
    blockParticle.render(pageNo, element, x, y)
  }
}
