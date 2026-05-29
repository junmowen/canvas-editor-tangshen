import type { Draw } from '../../../draw/Draw'

/** 区域辅助层渲染器。 */
export class PageAreaRenderer {
  constructor(private readonly draw: Draw) {}

  public render(ctx: CanvasRenderingContext2D, pageNo: number, isPrintMode: boolean) {
    if (!isPrintMode) {
      this.draw.getArea().render(ctx, pageNo)
    }
  }
}
