import { PageMode } from '../../../../dataset/enum/Editor'
import type { Draw } from '../../../draw/Draw'

/** 页边距指示器渲染器。 */
export class PageMarginIndicatorRenderer {
  constructor(private readonly draw: Draw) {}

  public render(
    ctx: CanvasRenderingContext2D,
    pageNo: number,
    pageMode: PageMode,
    isPrintMode: boolean
  ) {
    if (!isPrintMode && pageMode !== PageMode.CONTINUITY) {
      this.draw.getMargin().render(ctx, pageNo)
    }
  }
}
