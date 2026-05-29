import type { Draw } from '../../../draw/Draw'

/** 页面控件高亮渲染器。 */
export class PageControlHighlightRenderer {
  constructor(private readonly draw: Draw) {}

  public render(
    ctx: CanvasRenderingContext2D,
    pageNo: number,
    isPrintMode: boolean
  ) {
    if (!isPrintMode) {
      this.draw.getControl().renderHighlightList(ctx, pageNo)
    }
  }
}
