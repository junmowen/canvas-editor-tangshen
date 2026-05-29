import type { Draw } from '../../../draw/Draw'

/** 页面背景渲染器。 */
export class PageBackgroundRenderer {
  constructor(private readonly draw: Draw) {}

  public render(ctx: CanvasRenderingContext2D, pageNo: number) {
    this.draw.getBackground().render(ctx, pageNo)
  }
}
