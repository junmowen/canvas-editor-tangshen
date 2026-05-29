import type { Draw } from '../../../draw/Draw'

/** 空文档占位内容页面渲染器。 */
export class PagePlaceholderRenderer {
  constructor(private readonly draw: Draw) {}

  public render(ctx: CanvasRenderingContext2D) {
    if (this.draw.getObjectResolver().getIsOriginalMainPlaceholderAvailable()) {
      this.draw.getComponents().placeholder.render(ctx)
    }
  }
}
